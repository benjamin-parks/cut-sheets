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

// Order rows for the printed sheet and the saved CSV: by computed point
// (numeric when the name is a number), then nearest offset first.
export function sortForOutput(pts) {
  const key = p => {
    const raw = (p.design_point_name || '').trim();
    const num = parseFloat(raw);
    return { raw, num, isNum: raw !== '' && !isNaN(num) };
  };

  return [...pts].sort((a, b) => {
    const ka = key(a), kb = key(b);

    // Unmatched points sink to the bottom.
    if (!ka.raw !== !kb.raw) return ka.raw ? -1 : 1;

    if (ka.raw !== kb.raw) {
      if (ka.isNum && kb.isNum) return ka.num - kb.num;
      if (ka.isNum !== kb.isNum) return ka.isNum ? -1 : 1;  // numbers before names
      return ka.raw.localeCompare(kb.raw, undefined, { numeric: true });
    }

    // Same computed point — nearest offset first.
    return (a.match_dist ?? Infinity) - (b.match_dist ?? Infinity);
  });
}

export function fmtPrint(v) {
  if (!v || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
