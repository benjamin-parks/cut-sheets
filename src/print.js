import { esc, fmtPrint, offsetDesc, sortForOutput } from './utils.js';

export function printSheets(pts, { projectName, surveyor, units }) {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const hasDesign  = pts.some(p => p.design_elev !== undefined && p.design_elev !== '');
  const hasDesignPt = hasDesign && pts.some(p => p.design_point_name);

  // Exclude rows with no valid proposed elevation, then order by computed
  // point with the nearest offset first.
  const printPts = sortForOutput(
    hasDesign
      ? pts.filter(p => p.design_elev !== undefined && p.design_elev !== '' && parseFloat(p.design_elev) !== 0)
      : pts
  );

  const rows = printPts.map((pt, idx) => {
    const isCut    = pt.cut_fill !== null && pt.cut_fill >= 0;
    const isFill   = pt.cut_fill !== null && pt.cut_fill < 0;
    // Cuts shown negative (grade must come down), fills positive
    const cfLabel  = pt.cut_fill !== null ? (-pt.cut_fill).toFixed(2) : '';
    const rowClass = pt.unmatched ? 'row-warn' : idx % 2 === 0 ? '' : 'row-alt';

    return `
      <tr class="${rowClass}">
        <td class="tc-pt">${esc(pt.name)}</td>
        <td class="tc-code">${esc(offsetDesc(pt))}</td>
        ${hasDesign    ? `<td class="tc-num tc-design">${pt.design_elev ? fmtPrint(pt.design_elev) : '—'}</td>` : ''}
        <td class="tc-num">${pt.elevation ? fmtPrint(pt.elevation) : '—'}</td>
        ${hasDesign    ? `<td class="tc-cf ${isCut ? 'tc-cut' : isFill ? 'tc-fill' : ''}">${cfLabel || (pt.unmatched ? '⚠ no match' : '—')}</td>` : ''}
        ${hasDesignPt  ? `<td class="tc-dp">${esc(pt.design_point_name || '')}</td>` : ''}
      </tr>`;
  }).join('');

  const html = `
    <div class="pt-table-wrap">
      <div class="pt-table-header">
        <div class="pt-table-title">
          <div class="pt-project">${esc(projectName)}</div>
          <div class="pt-sub">Cut Sheet Summary</div>
        </div>
        <div class="pt-table-meta">
          ${surveyor ? `<div>${esc(surveyor)}</div>` : ''}
          <div>${date}</div>
          <div>${esc(units)}</div>
          <div>${printPts.length} points</div>
        </div>
      </div>

      <table class="pt-table">
        <thead>
          <tr>
            <th>Stored Pt.</th>
            <th>Descriptor</th>
            ${hasDesign   ? '<th class="th-design">Proposed</th>' : ''}
            <th>Staked Elev.</th>
            ${hasDesign   ? '<th class="th-cf">Cut/Fill</th>' : ''}
            ${hasDesignPt ? '<th>Computed Pt.</th>' : ''}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

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
