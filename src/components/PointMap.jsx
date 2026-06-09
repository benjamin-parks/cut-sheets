import { useEffect, useRef, useState, useCallback } from 'react';

const PAD = 40;
const PT_R = 5;
const ARROW_HEAD = 7;

function buildTransform(points, designPoints, width, height) {
  const allN = [...points.map(p => parseFloat(p.northing)), ...designPoints.map(p => parseFloat(p.northing))].filter(isFinite);
  const allE = [...points.map(p => parseFloat(p.easting)),  ...designPoints.map(p => parseFloat(p.easting))].filter(isFinite);
  if (!allN.length) return null;

  const minN = Math.min(...allN), maxN = Math.max(...allN);
  const minE = Math.min(...allE), maxE = Math.max(...allE);

  const rangeN = maxN - minN || 1;
  const rangeE = maxE - minE || 1;

  const scaleX = (width  - PAD * 2) / rangeE;
  const scaleY = (height - PAD * 2) / rangeN;
  const scale  = Math.min(scaleX, scaleY);

  // Centre the drawing
  const drawW = rangeE * scale;
  const drawH = rangeN * scale;
  const offX  = PAD + (width  - PAD * 2 - drawW) / 2;
  const offY  = PAD + (height - PAD * 2 - drawH) / 2;

  return {
    toCanvas: (northing, easting) => ({
      x: offX + (parseFloat(easting)  - minE) * scale,
      y: offY + (maxN - parseFloat(northing)) * scale, // flip Y: higher N = higher on screen
    }),
    scale,
  };
}

function drawArrow(ctx, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;

  // Stop arrow tip at edge of target circle
  const tx = x2 - ux * (PT_R + 2);
  const ty = y2 - uy * (PT_R + 2);
  // Start arrow just outside source circle
  const sx = x1 + ux * (PT_R + 2);
  const sy = y1 + uy * (PT_R + 2);

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  // Arrowhead
  const angle = Math.atan2(ty - sy, tx - sx);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - ARROW_HEAD * Math.cos(angle - Math.PI / 6), ty - ARROW_HEAD * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tx - ARROW_HEAD * Math.cos(angle + Math.PI / 6), ty - ARROW_HEAD * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

export default function PointMap({ surveyPoints, designPoints, mergedPoints }) {
  const canvasRef  = useRef(null);
  const wrapRef    = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [hovered, setHovered] = useState(null); // { name, code, n, e, type }
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Resize observer
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setSize({ w: width, h: Math.max(300, Math.round(width * 0.55)) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = size;
    canvas.width  = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    const xf = buildTransform(surveyPoints, designPoints, w, h);
    if (!xf) return;

    // Build lookup: design point name → canvas coords
    const designMap = {};
    for (const dp of designPoints) {
      const { x, y } = xf.toCanvas(dp.northing, dp.easting);
      designMap[dp.name] = { x, y };
    }

    // Survey points within 3 inches (0.25 ft) of their match are suppressed —
    // the red dot already represents the position adequately.
    const THREE_INCHES_FT = 0.25;
    const visibleSurvey = new Set();
    for (const mp of mergedPoints) {
      if (mp.unmatched || !mp.design_point_name || (mp.match_dist ?? Infinity) > THREE_INCHES_FT) {
        visibleSurvey.add(mp.name);
      }
    }

    // Draw arrows first (behind points)
    ctx.strokeStyle = 'rgba(99,102,241,0.55)';
    ctx.fillStyle   = 'rgba(99,102,241,0.55)';
    ctx.lineWidth   = 1.2;
    for (const mp of mergedPoints) {
      if (!mp.design_point_name || mp.unmatched) continue;
      if (!visibleSurvey.has(mp.name)) continue;
      const src = xf.toCanvas(mp.northing, mp.easting);
      const dst = designMap[mp.design_point_name];
      if (!dst) continue;
      drawArrow(ctx, src.x, src.y, dst.x, dst.y);
    }

    // Draw design points (red)
    for (const dp of designPoints) {
      const { x, y } = xf.toCanvas(dp.northing, dp.easting);
      ctx.beginPath();
      ctx.arc(x, y, PT_R, 0, Math.PI * 2);
      ctx.fillStyle   = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    }

    // Draw survey points (blue) — skip if within 3 inches of matched design point
    for (const sp of surveyPoints) {
      if (!visibleSurvey.has(sp.name)) continue;
      const { x, y } = xf.toCanvas(sp.northing, sp.easting);
      ctx.beginPath();
      ctx.arc(x, y, PT_R, 0, Math.PI * 2);
      ctx.fillStyle   = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    }
  }, [surveyPoints, designPoints, mergedPoints, size]);

  // Hit-test on mousemove
  const handleMouseMove = useCallback(e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });

    const xf = buildTransform(surveyPoints, designPoints, size.w, size.h);
    if (!xf) return;

    const HIT = PT_R + 4;
    // Check survey points first (on top visually)
    for (const sp of surveyPoints) {
      const { x, y } = xf.toCanvas(sp.northing, sp.easting);
      if (Math.abs(mx - x) < HIT && Math.abs(my - y) < HIT) {
        setHovered({ name: sp.name, code: sp.code, n: sp.northing, e: sp.easting, type: 'survey' });
        return;
      }
    }
    for (const dp of designPoints) {
      const { x, y } = xf.toCanvas(dp.northing, dp.easting);
      if (Math.abs(mx - x) < HIT && Math.abs(my - y) < HIT) {
        setHovered({ name: dp.name, code: dp.code, n: dp.northing, e: dp.easting, type: 'design' });
        return;
      }
    }
    setHovered(null);
  }, [surveyPoints, designPoints, size]);

  return (
    <div className="map-wrap" ref={wrapRef}>
      <div className="map-legend">
        <span className="map-legend-dot" style={{ background: '#3b82f6' }} /> Staked
        <span className="map-legend-dot" style={{ background: '#ef4444', marginLeft: '1rem' }} /> Computed
        <span className="map-legend-arrow" /> Relationship
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', display: 'block', cursor: hovered ? 'crosshair' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      />
      {hovered && (
        <div
          className="map-tooltip"
          style={{ left: mousePos.x + 14, top: mousePos.y - 10, position: 'fixed' }}
        >
          <strong>{hovered.name}</strong>
          {hovered.code && <> · {hovered.code}</>}
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: 2 }}>
            N {parseFloat(hovered.n).toFixed(3)} &nbsp; E {parseFloat(hovered.e).toFixed(3)}
          </div>
          <div style={{ fontSize: '0.7rem', marginTop: 2, opacity: 0.6 }}>
            {hovered.type === 'survey' ? 'Staked point' : 'Computed point'}
          </div>
        </div>
      )}
    </div>
  );
}
