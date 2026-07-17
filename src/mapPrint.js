import proj4 from 'proj4';
import { MN_COUNTIES } from './mnCounties.js';

// Mirrors the on-screen map's dot suppression (PointMap.jsx).
const SUPPRESS_FT = 0.5;
const isDotVisible = mp =>
  mp.unmatched || !mp.design_point_name || (mp.match_dist ?? Infinity) > SUPPRESS_FT;

// Letter portrait inside 0.5in margins at ~200dpi.
const PAGE_W = 1500;
const PAGE_H = 1880;
const PAD_PX = 70;
const DOT_R = 9;

/* ── Shared transform ──────────────────────────────────────────────────────── */

// Web-mercator normalized [0,1] coordinates.
function mercator(lat, lng) {
  const x = (lng + 180) / 360;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  return { x, y };
}

// County N/E → page pixels, continuous scale so the job fills the page.
// Both pages use this same transform, so their scales are identical.
function buildTransform(mergedPoints, designPoints, projDef) {
  const conv = proj4(projDef, 'EPSG:4326');
  const toMerc = (n, e) => {
    const [lng, lat] = conv.forward([parseFloat(e), parseFloat(n)]);
    return mercator(lat, lng);
  };

  const pts = [];
  for (const p of [...mergedPoints, ...designPoints]) {
    const n = parseFloat(p.northing), e = parseFloat(p.easting);
    if (isFinite(n) && isFinite(e)) pts.push(toMerc(n, e));
  }
  if (!pts.length) return null;

  const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y));

  // Pixels per mercator unit — continuous, fills the page.
  const worldScale = Math.min(
    (PAGE_W - PAD_PX * 2) / ((maxX - minX) || 1e-9),
    (PAGE_H - PAD_PX * 2) / ((maxY - minY) || 1e-9)
  );

  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const originX = cx * worldScale - PAGE_W / 2;
  const originY = cy * worldScale - PAGE_H / 2;

  return {
    worldScale,
    originX,
    originY,
    toPx: p => {
      const m = toMerc(p.northing, p.easting);
      return { x: m.x * worldScale - originX, y: m.y * worldScale - originY };
    },
  };
}

/* ── Drawing ───────────────────────────────────────────────────────────────── */

function drawPoints(ctx, mergedPoints, designPoints, toPx) {
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
    ctx.arc(x, y, DOT_R, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };
  for (const dp of designPoints) dot(dp, '#ef4444');
  for (const mp of mergedPoints.filter(isDotVisible)) dot(mp, '#3b82f6');
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

async function drawTiles(ctx, xf) {
  const { worldScale, originX, originY } = xf;

  // Native tile zoom closest above our continuous scale, capped at Esri max.
  const z = Math.max(1, Math.min(19, Math.ceil(Math.log2(worldScale / 256))));
  const tilePx = worldScale / 2 ** z; // on-canvas size of one 256px tile

  const t0x = Math.floor(originX / tilePx), t1x = Math.floor((originX + PAGE_W) / tilePx);
  const t0y = Math.floor(originY / tilePx), t1y = Math.floor((originY + PAGE_H) / tilePx);
  const maxTile = 2 ** z - 1;

  const jobs = [];
  for (let tx = t0x; tx <= t1x; tx++) {
    for (let ty = t0y; ty <= t1y; ty++) {
      if (tx < 0 || ty < 0 || tx > maxTile || ty > maxTile) continue;
      jobs.push(
        loadTile(z, tx, ty)
          .then(img => ctx.drawImage(img, tx * tilePx - originX, ty * tilePx - originY, tilePx, tilePx))
          .catch(() => {}) // missing tiles just stay grey
      );
    }
  }
  await Promise.all(jobs);
}

function makeCanvas(bg) {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  return { canvas, ctx };
}

/* ── Entry point ───────────────────────────────────────────────────────────── */

export async function printMap(mergedPoints, designPoints) {
  const county = localStorage.getItem('fieldcut-county') || '';
  const projDef = MN_COUNTIES[county];
  if (!projDef) {
    alert('Select a county on the map first — the exhibit uses it to place points on imagery.');
    return;
  }

  let xf;
  try {
    xf = buildTransform(mergedPoints, designPoints, projDef);
  } catch {
    xf = null;
  }
  if (!xf) { alert('Could not convert coordinates with the selected county projection.'); return; }

  // Page 1: satellite. Page 2: identical transform on white.
  const pages = [];

  const sat = makeCanvas('#e8e6e1');
  try {
    await drawTiles(sat.ctx, xf);
  } catch { /* tiles stay grey */ }
  drawPoints(sat.ctx, mergedPoints, designPoints, xf.toPx);
  pages.push(sat.canvas.toDataURL('image/jpeg', 0.92));

  const plain = makeCanvas('#ffffff');
  drawPoints(plain.ctx, mergedPoints, designPoints, xf.toPx);
  pages.push(plain.canvas.toDataURL('image/png'));

  let printArea = document.getElementById('print-area');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'print-area';
    document.body.appendChild(printArea);
  }
  printArea.innerHTML = pages
    .map(src => `<div class="map-page"><img class="map-print-img" src="${src}" alt=""/></div>`)
    .join('');

  // Ensure images are fully decoded before the print dialog snapshots the page.
  await Promise.all(
    [...printArea.querySelectorAll('img')].map(img => img.decode().catch(() => {}))
  );
  window.print();
}
