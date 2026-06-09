import { useState, useRef } from 'react';
import { parseCSV } from '../csv.js';
import { printSheets } from '../print.js';
import PointCard from './PointCard.jsx';

function DropZone({ label, fileName, onFile, hint }) {
  const [over, setOver] = useState(false);
  const ref = useRef(null);

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => onFile(e.target.result, file.name);
    reader.readAsText(file);
  }

  return (
    <div className="dz-wrap">
      <div
        className={`drop-zone${over ? ' over' : ''}${fileName ? ' loaded' : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => ref.current?.click()}
      >
        <input
          ref={ref}
          type="file"
          accept=".csv,.txt"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        {fileName ? (
          <>
            <div className="dz-loaded-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 14l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="dz-loaded-name">{fileName}</div>
            <div className="dz-replace">Click to replace</div>
          </>
        ) : (
          <>
            <div className="dz-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                <rect x="6" y="4" width="28" height="32" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M24 4v8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12" y1="25" x2="22" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="dz-label">{label}</div>
            <div className="dz-sub">or <span className="dz-browse">click to browse</span> · .csv or .txt</div>
          </>
        )}
      </div>
      {hint && <div className="dz-hint">{hint}</div>}
    </div>
  );
}

export default function Tool({
  points, selected, surveyFile, designFile, hasDesign,
  tolerance, onToleranceChange,
  onSurveyLoaded, onDesignLoaded, onReset, onToggleSelect, onSelectAll, onSelectNone,
}) {
  const [filter, setFilter]       = useState('');
  const [projectName, setProject] = useState('');
  const [surveyor, setSurveyor]   = useState('');
  const [units, setUnits]         = useState('ft');
  const [coordOrder, setCoord]    = useState('nez');

  const hasPoints = points.length > 0;
  const unmatchedCount = points.filter(p => p.unmatched).length;

  function handleSurveyFile(text, name) {
    const pts = parseCSV(text, coordOrder);
    if (pts) onSurveyLoaded(pts, name);
  }

  function handleDesignFile(text, name) {
    const pts = parseCSV(text, coordOrder);
    if (pts) onDesignLoaded(pts, name);
  }

  function handlePrint() {
    const unitsLabel = { ft: 'US Survey Feet', m: 'Meters', intft: 'International Feet' }[units];
    const pts = points.filter((_, i) => selected.has(i));
    if (pts.length === 0) { alert('No points selected.'); return; }
    printSheets(pts, { projectName: projectName || 'Untitled Survey', surveyor, units: unitsLabel });
  }

  function handleSaveCSV() {
    const pts = points.filter((_, i) => selected.has(i));
    if (pts.length === 0) { alert('No points selected.'); return; }

    const hasDesignData = pts.some(p => p.design_elev !== undefined && p.design_elev !== '');
    const hasDesignPt   = hasDesignData && pts.some(p => p.design_point_name);

    const headers = [
      'Field Point', 'Northing', 'Easting', 'Surveyed Elev',
      ...(hasDesignData ? ['Design Elev', 'Cut/Fill'] : []),
      'Code',
      ...(hasDesignPt ? ['Design Point'] : []),
    ];

    const escape = v => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = pts.map(pt => {
      const cf = pt.cut_fill !== null && pt.cut_fill !== undefined
        ? `${pt.cut_fill >= 0 ? 'C' : 'F'} ${Math.abs(pt.cut_fill).toFixed(3)}`
        : '';
      return [
        pt.name, pt.northing, pt.easting, pt.elevation,
        ...(hasDesignData ? [pt.design_elev ?? '', cf] : []),
        pt.code,
        ...(hasDesignPt ? [pt.design_point_name ?? ''] : []),
      ].map(escape).join(',');
    });

    const csv  = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(projectName || 'cut-sheet').replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
    setFilter('');
    onReset();
  }

  const filtered = points.filter(p =>
    !filter || (p.name + ' ' + p.code).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <section className="tool-section" id="tool">
      <div className="tool-inner">
        <div className="tool-header">
          <h2>Cut Sheet Generator</h2>
          <p>Your files never leave your browser — all processing is local.</p>
        </div>

        {/* Two drop zones */}
        <div className={`upload-grid${surveyFile ? ' has-survey' : ''}`}>
          <DropZone
            label="Drop survey CSV (PNEZD)"
            fileName={surveyFile}
            onFile={handleSurveyFile}
            hint="Trimble Access export — Point, Northing, Easting, Elevation, Description"
          />
          <DropZone
            label="Drop design CSV (optional)"
            fileName={designFile}
            onFile={handleDesignFile}
            hint="Design elevations — matched by nearest N/E coordinate within 50 ft"
          />
        </div>

        {/* Unmatched warning */}
        {hasDesign && unmatchedCount > 0 && (
          <div className="match-warning">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2L14.9 14H1.1L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="8" cy="12" r="0.6" fill="currentColor"/>
            </svg>
            <strong>{unmatchedCount} design point{unmatchedCount > 1 ? 's' : ''}</strong> had no survey match within {tolerance} ft — shown with a warning flag.
          </div>
        )}

        {/* Config panel */}
        {hasPoints && (
          <div id="config-panel">
            <div className="config-grid">
              <div className="field-group">
                <label htmlFor="project-name">Project / Job Name</label>
                <input
                  type="text" id="project-name"
                  placeholder="e.g. River Crossing Survey 2025"
                  value={projectName} onChange={e => setProject(e.target.value)}
                />
              </div>
              <div className="field-group">
                <label htmlFor="surveyor-name">Surveyor</label>
                <input
                  type="text" id="surveyor-name"
                  placeholder="e.g. J. Smith, PLS"
                  value={surveyor} onChange={e => setSurveyor(e.target.value)}
                />
              </div>
              <div className="field-group">
                <label htmlFor="unit-sel">Units</label>
                <select id="unit-sel" value={units} onChange={e => setUnits(e.target.value)}>
                  <option value="ft">US Survey Feet</option>
                  <option value="m">Meters</option>
                  <option value="intft">International Feet</option>
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="coord-order">Coordinate Order</label>
                <select id="coord-order" value={coordOrder} onChange={e => setCoord(e.target.value)}>
                  <option value="nez">N, E, Z — Northing first</option>
                  <option value="enz">E, N, Z — Easting first</option>
                </select>
              </div>
              {hasDesign && (
                <div className="field-group field-group--slider">
                  <label htmlFor="tolerance-slider">
                    Search Radius
                    <span className="slider-value">{tolerance} ft</span>
                  </label>
                  <input
                    type="range"
                    id="tolerance-slider"
                    min="5" max="200" step="5"
                    value={tolerance}
                    onChange={e => onToleranceChange(Number(e.target.value))}
                    className="tolerance-slider"
                  />
                  <div className="slider-ticks">
                    <span>5 ft</span>
                    <span>200 ft</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary bar */}
        {hasPoints && (
          <div id="summary-bar">
            <div className="sb-file">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                <line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="5" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span>{surveyFile}</span>
              {designFile && <><span className="sb-div">+</span><span>{designFile}</span></>}
            </div>
            <div className="sb-stats">
              <span><strong>{points.length}</strong> points</span>
              <span className="sb-div">·</span>
              <span><strong>{selected.size}</strong> selected</span>
            </div>
            <div className="sb-actions">
              <button className="btn-sm" onClick={onSelectAll}>Select all</button>
              <button className="btn-sm" onClick={onSelectNone}>Clear</button>
              <button className="btn-sm" onClick={handleReset}>↩ New file</button>
            </div>
          </div>
        )}

        {/* Search + print */}
        {hasPoints && (
          <div id="search-bar">
            <div className="search-wrap">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                id="search-input"
                placeholder="Filter by point name or feature code…"
                aria-label="Search points"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            <button className="btn-save" onClick={handleSaveCSV}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 12h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Save CSV
            </button>
            <button className="btn-print" onClick={handlePrint}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="3" y="6" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 6V3h6v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="5" y1="10" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Print Cut Sheets
            </button>
          </div>
        )}

        {/* Point list */}
        {hasPoints && (
          <div id="point-list">
            {filtered.length === 0
              ? <p style={{ color: 'var(--ink-light)', fontSize: '0.875rem', padding: '1rem 0' }}>No points match your filter.</p>
              : filtered.map(pt => {
                  const i = points.indexOf(pt);
                  return (
                    <PointCard
                      key={i}
                      point={pt}
                      selected={selected.has(i)}
                      onToggle={() => onToggleSelect(i)}
                    />
                  );
                })
            }
          </div>
        )}
      </div>
    </section>
  );
}
