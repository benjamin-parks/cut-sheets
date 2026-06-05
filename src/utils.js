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

export function fmtPrint(v) {
  if (!v || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
