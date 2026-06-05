'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let allPoints  = [];
let selected   = new Set();
let filterText = '';
let fileName   = '';

// ── DOM refs ───────────────────────────────────────────────────────────────
const dropZone    = document.getElementById('drop-zone');
const fileInput   = document.getElementById('file-input');
const configPanel = document.getElementById('config-panel');
const summaryBar  = document.getElementById('summary-bar');
const searchBar   = document.getElementById('search-bar');
const pointList   = document.getElementById('point-list');
const printArea   = document.getElementById('print-area');
const uploadArea  = document.getElementById('upload-area');

// ── File drop / input ──────────────────────────────────────────────────────
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

function handleFile(file) {
  fileName = file.name;
  const reader = new FileReader();
  reader.onload = e => parseCSV(e.target.result);
  reader.readAsText(file);
}

// ── CSV parsing ────────────────────────────────────────────────────────────
function splitCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result.map(s => s.replace(/^"|"$/g, '').trim());
}

const ALIASES = {
  name:       ['name','point name','point id','point','id','pt','pt name','point no','ptname','pt id'],
  northing:   ['northing','north','n','y','latitude','lat','yn','north(y)'],
  easting:    ['easting','east','e','x','longitude','lon','lng','xe','east(x)'],
  elevation:  ['elevation','elev','height','z','ht','h','elev(z)','alt'],
  code:       ['code','feature code','description','desc','notes','feature','attrib','attribute','feature_code'],
  hz_angle:   ['hz angle','horizontal angle','azimuth','bearing','direction','ha','hz','hz_angle'],
  vert_angle: ['vert angle','vertical angle','zenith','va','vert','v_angle','va_angle'],
  slope_dist: ['slope dist','slope distance','sd','distance','dist','slope_dist','s.dist'],
  horiz_dist: ['horiz dist','horizontal distance','hd','h.dist','horiz_dist'],
  delta_elev: ['delta elev','delta elevation','dz','de','height diff','delta_z','dh'],
  ppm:        ['ppm','parts per million','scale factor'],
  method:     ['method','obs method','observation method'],
};

function mapHeaders(headers) {
  const colMap = {};
  headers.forEach((h, i) => {
    const hl = h.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();
    for (const [key, names] of Object.entries(ALIASES)) {
      if (colMap[key] !== undefined) continue;
      if (names.some(n => hl === n || hl.includes(n) || n.includes(hl))) {
        colMap[key] = i;
      }
    }
  });
  return colMap;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) { alert('File appears empty or has no data rows.'); return; }

  const headers = splitCSVLine(lines[0]);
  let colMap = mapHeaders(headers);

  const coordOrder = document.getElementById('coord-order').value;

  if (colMap.name === undefined && headers.length >= 3) {
    colMap.name      = colMap.name      ?? 0;
    colMap.northing  = colMap.northing  ?? 1;
    colMap.easting   = colMap.easting   ?? 2;
    colMap.elevation = colMap.elevation ?? 3;
    colMap.code      = colMap.code      ?? 4;
  }

  const get = (parts, key) => {
    if (colMap[key] === undefined) return '';
    return (parts[colMap[key]] || '');
  };

  const points = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitCSVLine(lines[i]);
    if (parts.length < 2) continue;

    let n = get(parts, 'northing');
    let e = get(parts, 'easting');
    const z = get(parts, 'elevation');

    if (coordOrder === 'enz') { const tmp = n; n = e; e = tmp; }

    points.push({
      name:       get(parts, 'name') || String(i),
      northing:   n,
      easting:    e,
      elevation:  z,
      code:       get(parts, 'code'),
      hz_angle:   get(parts, 'hz_angle'),
      vert_angle: get(parts, 'vert_angle'),
      slope_dist: get(parts, 'slope_dist'),
      horiz_dist: get(parts, 'horiz_dist'),
      delta_elev: get(parts, 'delta_elev'),
      ppm:        get(parts, 'ppm'),
      method:     get(parts, 'method'),
    });
  }

  if (points.length === 0) { alert('No data rows found. Please check the CSV format.'); return; }

  allPoints  = points;
  selected   = new Set(allPoints.map((_, i) => i));
  filterText = '';

  configPanel.classList.remove('hidden');
  summaryBar.classList.remove('hidden');
  searchBar.classList.remove('hidden');
  pointList.classList.remove('hidden');

  document.getElementById('stat-file').textContent = fileName;

  uploadArea.style.opacity      = '0.4';
  uploadArea.style.pointerEvents = 'none';

  updateStats();
  renderList();
}

// ── Stats ──────────────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('stat-total').textContent    = allPoints.length;
  document.getElementById('stat-selected').textContent = selected.size;
}

// ── Render point list ──────────────────────────────────────────────────────
function renderList() {
  const q = filterText.toLowerCase();
  const filtered = allPoints.filter(p =>
    !q || (p.name + ' ' + p.code).toLowerCase().includes(q)
  );

  pointList.innerHTML = '';

  if (filtered.length === 0) {
    pointList.innerHTML = '<p style="color:var(--ink-light);font-size:0.875rem;padding:1rem 0;">No points match your filter.</p>';
    return;
  }

  filtered.forEach(pt => {
    const i = allPoints.indexOf(pt);
    const isSel = selected.has(i);

    const card = document.createElement('div');
    card.className = 'point-card' + (isSel ? ' sel' : '');
    card.dataset.idx = i;

    card.innerHTML = `
      <div class="pt-header">
        <input type="checkbox" class="pt-chk" ${isSel ? 'checked' : ''} aria-label="Select point ${esc(pt.name)}">
        <span class="pt-name">${esc(pt.name)}</span>
        <span class="pt-code">${esc(pt.code) || '<span style="color:var(--ink-faint)">—</span>'}</span>
        <span class="pt-coords">${fmtCoord(pt.northing)} N &nbsp; ${fmtCoord(pt.easting)} E</span>
        <svg class="pt-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="pt-detail">
        <div class="detail-grid">
          ${dc('Northing',    pt.northing)}
          ${dc('Easting',     pt.easting)}
          ${dc('Elevation',   pt.elevation)}
          ${dc('Feature Code',pt.code)}
          ${pt.hz_angle   ? dc('Hz Angle',   pt.hz_angle)   : ''}
          ${pt.vert_angle ? dc('Vert Angle',  pt.vert_angle) : ''}
          ${pt.slope_dist ? dc('Slope Dist',  pt.slope_dist) : ''}
          ${pt.horiz_dist ? dc('Horiz Dist',  pt.horiz_dist) : ''}
          ${pt.delta_elev ? dc('Delta Elev',  pt.delta_elev) : ''}
          ${pt.ppm        ? dc('PPM',          pt.ppm)       : ''}
          ${pt.method     ? dc('Method',       pt.method)    : ''}
        </div>
      </div>`;

    const chk = card.querySelector('.pt-chk');
    chk.addEventListener('click', e => {
      e.stopPropagation();
      toggleSelect(i, card, chk);
    });

    card.querySelector('.pt-header').addEventListener('click', () => {
      const detail  = card.querySelector('.pt-detail');
      const chevron = card.querySelector('.pt-chevron');
      const isOpen  = detail.classList.toggle('open');
      chevron.classList.toggle('open', isOpen);
    });

    pointList.appendChild(card);
  });
}

function dc(label, val) {
  const empty = !val || val === '';
  return `<div class="dc"><span class="dk">${label}</span><span class="dv ${empty ? 'na' : ''}">${empty ? 'n/a' : esc(val)}</span></div>`;
}

function toggleSelect(i, card, chk) {
  if (selected.has(i)) { selected.delete(i); card.classList.remove('sel'); chk.checked = false; }
  else                  { selected.add(i);    card.classList.add('sel');    chk.checked = true;  }
  updateStats();
}

// ── Global select/clear ────────────────────────────────────────────────────
function selectAll() {
  selected = new Set(allPoints.map((_, i) => i));
  updateStats();
  renderList();
}
window.selectAll = selectAll;

function selectNone() {
  selected.clear();
  updateStats();
  renderList();
}
window.selectNone = selectNone;

// ── Search filter ──────────────────────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', e => {
  filterText = e.target.value;
  renderList();
});

// ── Reset ──────────────────────────────────────────────────────────────────
function resetApp() {
  allPoints = [];
  selected.clear();
  filterText = '';
  fileName   = '';

  configPanel.classList.add('hidden');
  summaryBar.classList.add('hidden');
  searchBar.classList.add('hidden');
  pointList.classList.add('hidden');
  pointList.innerHTML  = '';
  printArea.innerHTML  = '';
  fileInput.value      = '';

  uploadArea.style.opacity       = '';
  uploadArea.style.pointerEvents = '';
}
window.resetApp = resetApp;

// ── Print ──────────────────────────────────────────────────────────────────
function printSheets() {
  const project  = document.getElementById('project-name').value || 'Untitled Survey';
  const surveyor = document.getElementById('surveyor-name').value || '';
  const unitsEl  = document.getElementById('unit-sel');
  const units    = unitsEl.options[unitsEl.selectedIndex].text;
  const date     = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const pts = allPoints.filter((_, i) => selected.has(i));
  if (pts.length === 0) { alert('No points selected. Please select at least one point.'); return; }

  printArea.innerHTML = '';

  pts.forEach((pt, idx) => {
    const div = document.createElement('div');
    div.className = 'cut-sheet';

    const obsFields = [
      { key: 'hz_angle',   label: 'Hz Angle'   },
      { key: 'vert_angle', label: 'Vert Angle'  },
      { key: 'slope_dist', label: 'Slope Dist'  },
      { key: 'horiz_dist', label: 'Horiz Dist'  },
      { key: 'delta_elev', label: 'Delta Elev'  },
      { key: 'ppm',        label: 'PPM'          },
      { key: 'method',     label: 'Method'       },
    ].filter(f => pt[f.key]);

    div.innerHTML = `
      <div class="cs-top">
        <div>
          <div class="cs-pt-name">${esc(pt.name)} <span class="cs-badge">${esc(pt.code || 'NO CODE')}</span></div>
          <div class="cs-project-name">${esc(project)}</div>
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
        ${obsFields.map(f => `<div class="cs-cell"><div class="cck">${f.label}</div><div class="ccv" style="font-size:13px">${esc(pt[f.key])}</div></div>`).join('')}
      </div>

      <hr class="cs-divider">

      <div class="cs-notes-box">
        <div class="cs-notes-label">Field Notes / Stakeout Notes</div>
      </div>

      <div class="cs-bottom-row">
        <div class="cs-sm-box"><div class="cs-notes-label">Cut / Fill</div></div>
        <div class="cs-sm-box"><div class="cs-notes-label">Offset</div></div>
        <div class="cs-sm-box"><div class="cs-notes-label">Initials / Date</div></div>
      </div>

      <div class="cs-footer">
        <span>FieldCut · Trimble Access CSV Export</span>
        <span>Point ${esc(pt.name)} · ${esc(project)}</span>
      </div>
    `;

    printArea.appendChild(div);
  });

  window.print();
}
window.printSheets = printSheets;

// ── Helpers ────────────────────────────────────────────────────────────────
function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtCoord(v) {
  if (!v || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return esc(v);
  return n.toFixed(4);
}

function fmtPrint(v) {
  if (!v || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return esc(v);
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
