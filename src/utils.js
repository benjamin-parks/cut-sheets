export function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function fmtCoord(v) {
  if (!v || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toFixed(4);
}

export function fmtCutFill(v) {
  if (v === null || v === undefined) return '';
  const abs = Math.abs(v).toFixed(3);
  return v >= 0 ? `C ${abs}` : `F ${abs}`;
}

// Build the offset descriptor shown in the Descriptor column.
// e.g. "25' os hub to SP-20A INV" when a matched design point exists.
export function offsetDesc(pt) {
  if (!pt.design_point_name || pt.match_dist === null || pt.match_dist === undefined) return pt.code || '';
  const ft = Math.round(pt.match_dist);
  const to = pt.design_point_code || pt.design_point_name;
  return ft === 0 ? to : `${ft}' os to ${to}`;
}

export function fmtPrint(v) {
  if (!v || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
