import { esc, offsetDesc } from './utils.js';

// Mirrors the on-screen map's dot suppression (PointMap.jsx).
const SUPPRESS_FT = 0.5;
const isDotVisible = mp =>
  mp.unmatched || !mp.design_point_name || (mp.match_dist ?? Infinity) > SUPPRESS_FT;

// Drawing surface: 7.5in x 9.4in at 96dpi (letter portrait, 0.5in margins,
// minus room for the header and legend).
const W = 720;
const H = 900;
const PAD = 30;
const PT_R = 4;

function buildTransform(mergedPoints, designPoints) {
  const allN = [...mergedPoints.map(p => parseFloat(p.northing)), ...designPoints.map(p => parseFloat(p.northing))].filter(isFinite);
  const allE = [...mergedPoints.map(p => parseFloat(p.easting)),  ...designPoints.map(p => parseFloat(p.easting))].filter(isFinite);
  if (!allN.length) return null;

  const minN = Math.min(...allN), maxN = Math.max(...allN);
  const minE = Math.min(...allE), maxE = Math.max(...allE);
  const rangeN = maxN - minN || 1;
  const rangeE = maxE - minE || 1;

  const scale = Math.min((W - PAD * 2) / rangeE, (H - PAD * 2) / rangeN);
  const offX  = PAD + (W - PAD * 2 - rangeE * scale) / 2;
  const offY  = PAD + (H - PAD * 2 - rangeN * scale) / 2;

  return (northing, easting) => ({
    x: offX + (parseFloat(easting) - minE) * scale,
    y: offY + (maxN - parseFloat(northing)) * scale,
  });
}

// Greedy label placement: try positions around the dot, keep the first that
// doesn't collide with an already-placed label or run off the page.
function placeLabel(x, y, w, h, placed) {
  const candidates = [
    { x: x + 7,         y: y - h / 2 },      // right
    { x: x - w - 7,     y: y - h / 2 },      // left
    { x: x - w / 2,     y: y - h - 6 },      // above
    { x: x - w / 2,     y: y + 6 },          // below
    { x: x + 7,         y: y - h - 4 },      // upper-right
    { x: x + 7,         y: y + 4 },          // lower-right
    { x: x - w - 7,     y: y - h - 4 },      // upper-left
    { x: x - w - 7,     y: y + 4 },          // lower-left
  ];
  const collides = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  for (const c of candidates) {
    const box = { x: c.x, y: c.y, w, h };
    if (box.x < 2 || box.y < 2 || box.x + w > W - 2 || box.y + h > H - 2) continue;
    if (!placed.some(p => collides(box, p))) { placed.push(box); return box; }
  }
  const box = { x: candidates[0].x, y: candidates[0].y, w, h };
  placed.push(box);
  return box;
}

export function printMap(mergedPoints, designPoints, { projectName, surveyor }) {
  const toXY = buildTransform(mergedPoints, designPoints);
  if (!toXY) { alert('No points to map.'); return; }

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const parts  = [];
  const placed = [];

  // Arrows first (under everything)
  for (const mp of mergedPoints) {
    if (!mp.design_point_name || mp.unmatched || !isDotVisible(mp)) continue;
    const dp = designPoints.find(d => d.name === mp.design_point_name);
    if (!dp) continue;
    const a = toXY(mp.northing, mp.easting);
    const b = toXY(dp.northing, dp.easting);
    parts.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#6366f1" stroke-width="0.8" marker-end="url(#arr)"/>`);
  }

  // Design dots (red)
  for (const dp of designPoints) {
    const { x, y } = toXY(dp.northing, dp.easting);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${PT_R}" fill="#ef4444" stroke="#fff" stroke-width="0.8"/>`);
  }

  // Staked dots (blue)
  const visibleStaked = mergedPoints.filter(isDotVisible);
  for (const mp of visibleStaked) {
    const { x, y } = toXY(mp.northing, mp.easting);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${PT_R}" fill="#3b82f6" stroke="#fff" stroke-width="0.8"/>`);
  }

  // Labels for every staked point in the cut sheet (including suppressed dots —
  // their info anchors to the design point location they sit on).
  for (const mp of mergedPoints) {
    const { x, y } = toXY(mp.northing, mp.easting);
    const cf = mp.cut_fill !== null && mp.cut_fill !== undefined ? (-mp.cut_fill).toFixed(2) : null;
    const line1 = `${mp.name}${cf !== null ? `  ${cf}` : ''}`;
    const line2 = offsetDesc(mp);

    const w = Math.max(line1.length, line2.length) * 4.4 + 8;
    const h = line2 ? 21 : 12;
    const box = placeLabel(x, y, w, h, placed);

    parts.push(`<g>
      <rect x="${box.x.toFixed(1)}" y="${box.y.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="2" fill="rgba(255,255,255,0.88)" stroke="#d4d4cc" stroke-width="0.4"/>
      <text x="${(box.x + 4).toFixed(1)}" y="${(box.y + 9).toFixed(1)}" font-size="7.5" font-weight="600" fill="${cf !== null && -mp.cut_fill < 0 ? '#7a1f1f' : '#1b5e20'}" font-family="'DM Mono',monospace">${esc(line1)}</text>
      ${line2 ? `<text x="${(box.x + 4).toFixed(1)}" y="${(box.y + 18).toFixed(1)}" font-size="6.5" fill="#4a4a44" font-family="'DM Sans',sans-serif">${esc(line2)}</text>` : ''}
    </g>`);
  }

  const html = `
    <div class="map-print-wrap">
      <div class="pt-table-header">
        <div class="pt-table-title">
          <div class="pt-project">${esc(projectName)}</div>
          <div class="pt-sub">Stakeout Map</div>
        </div>
        <div class="pt-table-meta">
          ${surveyor ? `<div>${esc(surveyor)}</div>` : ''}
          <div>${date}</div>
          <div>${mergedPoints.length} staked points</div>
        </div>
      </div>
      <div class="map-print-legend">
        <span class="mpl-dot" style="background:#3b82f6"></span> Staked
        <span class="mpl-dot" style="background:#ef4444"></span> Computed
        <span style="color:#6366f1">→</span> Match &nbsp;·&nbsp; Label: point no., cut(−)/fill(+), offset
      </div>
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="map-print-svg">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1"/>
          </marker>
        </defs>
        <rect x="0" y="0" width="${W}" height="${H}" fill="#fbfaf7" stroke="#d4d4cc" stroke-width="0.6"/>
        ${parts.join('\n')}
      </svg>
      <div class="pt-table-footer">
        <span>FieldCut · ${esc(projectName)}</span>
        <span>${date}</span>
      </div>
    </div>`;

  let printArea = document.getElementById('print-area');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'print-area';
    document.body.appendChild(printArea);
  }
  printArea.innerHTML = html;
  window.print();
}
