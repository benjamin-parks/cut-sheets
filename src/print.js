import { esc, fmtPrint } from './utils.js';

export function printSheets(pts, { projectName, surveyor, units }) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const obsKeys = ['hz_angle','vert_angle','slope_dist','horiz_dist','delta_elev','ppm','method'];
  const obsLabels = {
    hz_angle: 'Hz Angle', vert_angle: 'Vert Angle', slope_dist: 'Slope Dist',
    horiz_dist: 'Horiz Dist', delta_elev: 'Delta Elev', ppm: 'PPM', method: 'Method',
  };

  const sheetsHTML = pts.map((pt, idx) => {
    const obsCells = obsKeys
      .filter(k => pt[k])
      .map(k => `<div class="cs-cell"><div class="cck">${obsLabels[k]}</div><div class="ccv" style="font-size:13px">${esc(pt[k])}</div></div>`)
      .join('');

    return `
      <div class="cut-sheet">
        <div class="cs-top">
          <div>
            <div class="cs-pt-name">${esc(pt.name)} <span class="cs-badge">${esc(pt.code || 'NO CODE')}</span></div>
            <div class="cs-project-name">${esc(projectName)}</div>
          </div>
          <div class="cs-meta">
            ${surveyor ? `<div>${esc(surveyor)}</div>` : ''}
            <div>${date}</div>
            <div>${esc(units)}</div>
            <div>Sheet ${idx + 1} of ${pts.length}</div>
          </div>
        </div>
        <div class="cs-grid">
          <div class="cs-cell"><div class="cck">Northing</div><div class="ccv">${fmtPrint(pt.northing)}</div></div>
          <div class="cs-cell"><div class="cck">Easting</div><div class="ccv">${fmtPrint(pt.easting)}</div></div>
          <div class="cs-cell"><div class="cck">Elevation</div><div class="ccv">${pt.elevation ? fmtPrint(pt.elevation) : '—'}</div></div>
          <div class="cs-cell"><div class="cck">Feature Code</div><div class="ccv" style="font-size:13px">${esc(pt.code || '—')}</div></div>
          ${obsCells}
        </div>
        <hr class="cs-divider">
        <div class="cs-notes-box"><div class="cs-notes-label">Field Notes / Stakeout Notes</div></div>
        <div class="cs-bottom-row">
          <div class="cs-sm-box"><div class="cs-notes-label">Cut / Fill</div></div>
          <div class="cs-sm-box"><div class="cs-notes-label">Offset</div></div>
          <div class="cs-sm-box"><div class="cs-notes-label">Initials / Date</div></div>
        </div>
        <div class="cs-footer">
          <span>FieldCut · Trimble Access CSV Export</span>
          <span>Point ${esc(pt.name)} · ${esc(projectName)}</span>
        </div>
      </div>`;
  }).join('');

  let printArea = document.getElementById('print-area');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'print-area';
    document.body.appendChild(printArea);
  }
  printArea.innerHTML = sheetsHTML;
  window.print();
}
