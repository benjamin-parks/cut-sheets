import { esc, fmtPrint, fmtCoord } from './utils.js';

export function printSheets(pts, { projectName, surveyor, units }) {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const hasDesign = pts.some(p => p.design_elev !== undefined && p.design_elev !== '');

  const rows = pts.map((pt, idx) => {
    const isCut    = pt.cut_fill !== null && pt.cut_fill >= 0;
    const isFill   = pt.cut_fill !== null && pt.cut_fill < 0;
    const cfLabel  = pt.cut_fill !== null
      ? `${isCut ? 'C' : 'F'} ${Math.abs(pt.cut_fill).toFixed(3)}`
      : '';
    const rowClass = pt.unmatched ? 'row-warn' : idx % 2 === 0 ? '' : 'row-alt';

    return `
      <tr class="${rowClass}">
        <td class="tc-pt">${esc(pt.name)}</td>
        <td class="tc-num">${fmtPrint(pt.northing)}</td>
        <td class="tc-num">${fmtPrint(pt.easting)}</td>
        <td class="tc-num">${pt.elevation ? fmtPrint(pt.elevation) : '—'}</td>
        ${hasDesign ? `<td class="tc-num tc-design">${pt.design_elev ? fmtPrint(pt.design_elev) : '—'}</td>` : ''}
        ${hasDesign ? `<td class="tc-cf ${isCut ? 'tc-cut' : isFill ? 'tc-fill' : ''}">${cfLabel || (pt.unmatched ? '⚠ no match' : '—')}</td>` : ''}
        <td class="tc-code">${esc(pt.code || '')}</td>
        ${hasDesign && pts.some(p => p.field_point_name) ? `<td class="tc-fp">${esc(pt.field_point_name || '')}</td>` : ''}
        <td class="tc-notes"></td>
        <td class="tc-init"></td>
      </tr>`;
  }).join('');

  const fpCol = hasDesign && pts.some(p => p.field_point_name)
    ? '<th>Field Pt</th>' : '';

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
          <div>${pts.length} points</div>
        </div>
      </div>

      <table class="pt-table">
        <thead>
          <tr>
            <th>Point</th>
            <th>Northing</th>
            <th>Easting</th>
            <th>Surv. Elev</th>
            ${hasDesign ? '<th class="th-design">Design Elev</th>' : ''}
            ${hasDesign ? '<th class="th-cf">Cut / Fill</th>' : ''}
            <th>Code</th>
            ${fpCol}
            <th class="th-notes">Field Notes</th>
            <th class="th-init">Init.</th>
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
