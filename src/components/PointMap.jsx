import { useEffect, useRef, useState, useCallback } from 'react';

const PAD = 20;
const PT_R = 5;
const ARROW_HEAD = 7;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 50;

function buildBaseTransform(surveyPoints, designPoints, width, height) {
  const allN = [...surveyPoints.map(p => parseFloat(p.northing)), ...designPoints.map(p => parseFloat(p.northing))].filter(isFinite);
  const allE = [...surveyPoints.map(p => parseFloat(p.easting)),  ...designPoints.map(p => parseFloat(p.easting))].filter(isFinite);
  if (!allN.length) return null;

  const minN = Math.min(...allN), maxN = Math.max(...allN);
  const minE = Math.min(...allE), maxE = Math.max(...allE);
  const rangeN = maxN - minN || 1;
  const rangeE = maxE - minE || 1;

  const scaleX = (width  - PAD * 2) / rangeE;
  const scaleY = (height - PAD * 2) / rangeN;
  const scale  = Math.min(scaleX, scaleY);

  const drawW = rangeE * scale;
  const drawH = rangeN * scale;
  const offX  = PAD + (width  - PAD * 2 - drawW) / 2;
  const offY  = PAD + (height - PAD * 2 - drawH) / 2;

  return {
    toCanvas: (northing, easting) => ({
      x: offX + (parseFloat(easting)  - minE) * scale,
      y: offY + (maxN - parseFloat(northing)) * scale,
    }),
  };
}

function drawArrow(ctx, x1, y1, x2, y2, zoom) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  const r  = PT_R / zoom;
  const tx = x2 - ux * (r + 1 / zoom);
  const ty = y2 - uy * (r + 1 / zoom);
  const sx = x1 + ux * (r + 1 / zoom);
  const sy = y1 + uy * (r + 1 / zoom);

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  const angle = Math.atan2(ty - sy, tx - sx);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - ARROW_HEAD * Math.cos(angle - Math.PI / 6), ty - ARROW_HEAD * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tx - ARROW_HEAD * Math.cos(angle + Math.PI / 6), ty - ARROW_HEAD * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

export default function PointMap({ surveyPoints, designPoints, mergedPoints }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const [size, setSize]       = useState({ w: 800, h: 500 });
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Viewport: pan offset + zoom. Applied on top of the base transform.
  const vp = useRef({ ox: 0, oy: 0, zoom: 1 });

  // Drag state (not React state — no re-render needed mid-drag)
  const drag = useRef(null); // { startX, startY, startOx, startOy }

  // Resize observer
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setSize({ w: width, h: Math.max(400, Math.round(width * 0.7)) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Reset viewport when data changes so new files fit to screen
  useEffect(() => {
    vp.current = { ox: 0, oy: 0, zoom: 1 };
  }, [surveyPoints, designPoints]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = size;
    canvas.width  = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    const xf = buildBaseTransform(surveyPoints, designPoints, w, h);
    if (!xf) return;

    const { ox, oy, zoom } = vp.current;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(zoom, zoom);

    const designMap = {};
    for (const dp of designPoints) {
      const { x, y } = xf.toCanvas(dp.northing, dp.easting);
      designMap[dp.name] = { x, y };
    }

    const THREE_INCHES_FT = 0.25;
    const visibleSurvey = new Set();
    for (const mp of mergedPoints) {
      if (mp.unmatched || !mp.design_point_name || (mp.match_dist ?? Infinity) > THREE_INCHES_FT) {
        visibleSurvey.add(mp.name);
      }
    }

    // Arrows
    ctx.strokeStyle = 'rgba(99,102,241,0.55)';
    ctx.fillStyle   = 'rgba(99,102,241,0.55)';
    ctx.lineWidth   = 1.2 / zoom;
    for (const mp of mergedPoints) {
      if (!mp.design_point_name || mp.unmatched || !visibleSurvey.has(mp.name)) continue;
      const src = xf.toCanvas(mp.northing, mp.easting);
      const dst = designMap[mp.design_point_name];
      if (!dst) continue;
      drawArrow(ctx, src.x, src.y, dst.x, dst.y, zoom);
    }

    // Design points (red)
    for (const dp of designPoints) {
      const { x, y } = xf.toCanvas(dp.northing, dp.easting);
      ctx.beginPath();
      ctx.arc(x, y, PT_R / zoom, 0, Math.PI * 2);
      ctx.fillStyle   = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.2 / zoom;
      ctx.stroke();
    }

    // Survey points (blue)
    for (const sp of surveyPoints) {
      if (!visibleSurvey.has(sp.name)) continue;
      const { x, y } = xf.toCanvas(sp.northing, sp.easting);
      ctx.beginPath();
      ctx.arc(x, y, PT_R / zoom, 0, Math.PI * 2);
      ctx.fillStyle   = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.2 / zoom;
      ctx.stroke();
    }

    ctx.restore();
  }, [surveyPoints, designPoints, mergedPoints, size]);

  useEffect(() => { redraw(); }, [redraw]);

  // Canvas coords (accounting for viewport) from a mouse event
  function canvasPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left  - vp.current.ox) / vp.current.zoom;
    const cy = (e.clientY - rect.top   - vp.current.oy) / vp.current.zoom;
    return { cx, cy };
  }

  // Zoom on wheel
  const handleWheel = useCallback(e => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect  = canvas.getBoundingClientRect();
    const mx    = e.clientX - rect.left;
    const my    = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const { ox, oy, zoom } = vp.current;
    const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * delta));
    // Zoom toward cursor
    vp.current = {
      zoom: newZoom,
      ox: mx - (mx - ox) * (newZoom / zoom),
      oy: my - (my - oy) * (newZoom / zoom),
    };
    redraw();
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pan on drag
  const handleMouseDown = useCallback(e => {
    drag.current = { startX: e.clientX, startY: e.clientY, startOx: vp.current.ox, startOy: vp.current.oy };
  }, []);

  const handleMouseMove = useCallback(e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setMousePos({ x: e.clientX, y: e.clientY });

    if (drag.current) {
      vp.current.ox = drag.current.startOx + (e.clientX - drag.current.startX);
      vp.current.oy = drag.current.startOy + (e.clientY - drag.current.startY);
      redraw();
      setHovered(null);
      return;
    }

    // Hit-test
    const xf = buildBaseTransform(surveyPoints, designPoints, size.w, size.h);
    if (!xf) return;
    const { cx, cy } = canvasPoint(e);
    const HIT = (PT_R + 4) / vp.current.zoom;

    for (const sp of surveyPoints) {
      const { x, y } = xf.toCanvas(sp.northing, sp.easting);
      if (Math.abs(cx - x) < HIT && Math.abs(cy - y) < HIT) {
        setHovered({ name: sp.name, code: sp.code, n: sp.northing, e: sp.easting, type: 'survey' });
        return;
      }
    }
    for (const dp of designPoints) {
      const { x, y } = xf.toCanvas(dp.northing, dp.easting);
      if (Math.abs(cx - x) < HIT && Math.abs(cy - y) < HIT) {
        setHovered({ name: dp.name, code: dp.code, n: dp.northing, e: dp.easting, type: 'design' });
        return;
      }
    }
    setHovered(null);
  }, [surveyPoints, designPoints, size, redraw]);

  const handleMouseUp = useCallback(() => { drag.current = null; }, []);

  const handleDblClick = useCallback(() => {
    vp.current = { ox: 0, oy: 0, zoom: 1 };
    redraw();
  }, [redraw]);

  return (
    <div className="map-wrap" ref={wrapRef}>
      <div className="map-legend">
        <span className="map-legend-dot" style={{ background: '#3b82f6' }} /> Staked
        <span className="map-legend-dot" style={{ background: '#ef4444', marginLeft: '1rem' }} /> Computed
        <span className="map-legend-arrow" /> Relationship
        <span style={{ marginLeft: 'auto', opacity: 0.45, fontSize: '0.7rem' }}>Scroll to zoom · drag to pan · double-click to reset</span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', display: 'block', cursor: drag.current ? 'grabbing' : hovered ? 'crosshair' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { drag.current = null; setHovered(null); }}
        onDoubleClick={handleDblClick}
      />
      {hovered && (
        <div className="map-tooltip" style={{ left: mousePos.x + 14, top: mousePos.y - 10, position: 'fixed' }}>
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
