import proj4 from 'proj4';
import { MN_COUNTIES } from './mnCounties.js';

// Mirrors the on-screen map's dot suppression (PointMap.jsx).
const SUPPRESS_FT = 0.5;
const isDotVisible = mp =>
  mp.unmatched || !mp.design_point_name || (mp.match_dist ?? Infinity) > SUPPRESS_FT;

// Letter portrait inside 0.5in margins at ~200dpi.
const PAGE_W = 1500;
const PAGE_H = 1980;
const PAD_PX = 60;

/* ── Page 2: plain points (SVG) ────────────────────────────────────────────── */

function buildPlainSvg(mergedPoints, designPoints) {
  const W = 720, H = 950, PAD = 30, R = 4;

  const allN = [...mergedPoints.map(p => parseFloat(p.northing)), ...designPoints.map(p => parseFloat(p.northing))].filter(isFinite);
  const allE = [...mergedPoints.map(p => parseFloat(p.easting)),  ...designPoints.map(p => parseFloat(p.easting))].filter(isFinite);
  if (!allN.length) return null;

  const minN = Math.min(...allN), maxN = Math.max(...allN);
  const minE = Math.min(...allE), maxE = Math.max(...allE);
  const scale = Math.min((W - PAD * 2) / ((maxE - minE) || 1), (H - PAD * 2) / ((maxN - minN) || 1));
  const offX = PAD + (W - PAD * 2 - (maxE - minE) * scale) / 2;
  const offY = PAD + (H - PAD * 2 - (maxN - minN) * scale) / 2;
  const toXY = (n, e) => ({
    x: offX + (parseFloat(e) - minE) * scale,
    y: offY + (maxN - parseFloat(n)) * scale,
  });

  const parts = [];
  for (const mp of mergedPoints) {
    if (!mp.design_point_name || mp.unmatched || !isDotVisible(mp)) continue;
    const dp = designPoints.find(d => d.name === mp.design_point_name);
    if (!dp) continue;
    const a = toXY(mp.northing, mp.easting);
    const b = toXY(dp.northing, dp.easting);
    parts.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#6366f1" stroke-width="0.9"/>`);
  }
  for (const dp of designPoints) {
    const { x, y } = toXY(dp.northing, dp.easting);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R}" fill="#ef4444" stroke="#fff" stroke-width="0.8"/>`);
  }
  for (const mp of mergedPoints.filter(isDotVisible)) {
    const { x, y } = toXY(mp.northing, mp.easting);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R}" fill="#3b82f6" stroke="#fff" stroke-width="0.8"/>`);
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="map-print-svg">${parts.join('')}</svg>`;
}

/* ── Page 1: points over satellite tiles (canvas → JPEG) ───────────────────── */

// Web-mercator normalized [0,1] coordinates.
function mercator(lat, lng) {
  const x = (lng + 180) / 360;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  return { x, y };
}

function loadTile(z, x, y) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  });
}

async function buildSatelliteImage(mergedPoints, designPoints, projDef) {
  const conv = proj4(projDef, 'EPSG:4326');
  const toLL = (n, e) => {
    const [lng, lat] = conv.forward([parseFloat(e), parseFloat(n)]);
    return { lat, lng };
  };

  const pts = [];
  for (const p of [...mergedPoints, ...designPoints]) {
    const n = parseFloat(p.northing), e = parseFloat(p.easting);
    if (isFinite(n) && isFinite(e)) pts.push(mercatorOf(toLL(n, e)));
  }
  function mercatorOf({ lat, lng }) { return mercator(lat, lng); }
  if (!pts.length) throw new Error('no points');

  const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y));

  // Highest zoom (≤19, Esri native max) where the bbox fits the page area.
  let z = 19;
  for (; z > 1; z--) {
    const world = 256 * 2 ** z;
    if ((maxX - minX) * world <= PAGE_W - PAD_PX * 2 && (maxY - minY) * world <= PAGE_H - PAD_PX * 2) break;
  }
  const world = 256 * 2 ** z;

  // Center bbox on the page.
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const originX = cx * world - PAGE_W / 2;   // world px at canvas (0,0)
  const originY = cy * world - PAGE_H / 2;

  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e8e6e1';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  const t0x = Math.floor(originX / 256), t1x = Math.floor((originX + PAGE_W) / 256);
  const t0y = Math.floor(originY / 256), t1y = Math.floor((originY + PAGE_H) / 256);
  const maxTile = 2 ** z - 1;

  const jobs = [];
  for (let tx = t0x; tx <= t1x; tx++) {
    for (let ty = t0y; ty <= t1y; ty++) {
      if (tx < 0 || ty < 0 || tx > maxTile || ty > maxTile) continue;
      jobs.push(
        loadTile(z, tx, ty)
          .then(img => ctx.drawImage(img, tx * 256 - originX, ty * 256 - originY))
          .catch(() => {}) // missing tiles just stay grey
      );
    }
  }
  await Promise.all(jobs);

  const toPx = p => {
    const m = mercatorOf(toLL(p.northing, p.easting));
    return { x: m.x * world - originX, y: m.y * world - originY };
  };

  // Match lines
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 3;
  for (const mp of mergedPoints) {
    if (!mp.design_point_name || mp.unmatched || !isDotVisible(mp)) continue;
    const dp = designPoints.find(d => d.name === mp.design_point_name);
    if (!dp) continue;
    const a = toPx(mp), b = toPx(dp);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  const dot = (p, fill) => {
    const { x, y } = toPx(p);
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };
  for (const dp of designPoints) dot(dp, '#ef4444');
  for (const mp of mergedPoints.filter(isDotVisible)) dot(mp, '#3b82f6');

  return canvas.toDataURL('image/jpeg', 0.92);
}

/* ── Entry point ───────────────────────────────────────────────────────────── */

export async function printMap(mergedPoints, designPoints) {
  const plainSvg = buildPlainSvg(mergedPoints, designPoints);
  if (!plainSvg) { alert('No points to map.'); return; }

  const county = localStorage.getItem('fieldcut-county') || '';
  const projDef = MN_COUNTIES[county];

  let satPage = '';
  if (projDef) {
    try {
      const dataUrl = await buildSatelliteImage(mergedPoints, designPoints, projDef);
      satPage = `<div class="map-page"><img class="map-print-img" src="${dataUrl}" alt=""/></div>`;
    } catch {
      alert('Satellite imagery could not be loaded — saving the points-only page.');
    }
  } else {
    alert('Select a county on the map to include the satellite page — saving the points-only page.');
  }

  let printArea = document.getElementById('print-area');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'print-area';
    document.body.appendChild(printArea);
  }
  printArea.innerHTML = `${satPage}<div class="map-page">${plainSvg}</div>`;
  window.print();
}
