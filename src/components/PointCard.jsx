import { useState } from 'react';
import { esc, fmtCoord } from '../utils.js';

function DetailCell({ label, val }) {
  const empty = !val || val === '';
  return (
    <div className="dc">
      <span className="dk">{label}</span>
      <span className={`dv${empty ? ' na' : ''}`}>{empty ? 'n/a' : val}</span>
    </div>
  );
}

export default function PointCard({ point: pt, selected, onToggle }) {
  const [open, setOpen] = useState(false);

  const obsFields = [
    { key: 'hz_angle',   label: 'Hz Angle'  },
    { key: 'vert_angle', label: 'Vert Angle' },
    { key: 'slope_dist', label: 'Slope Dist' },
    { key: 'horiz_dist', label: 'Horiz Dist' },
    { key: 'delta_elev', label: 'Delta Elev' },
    { key: 'ppm',        label: 'PPM'        },
    { key: 'method',     label: 'Method'     },
  ].filter(f => pt[f.key]);

  return (
    <div className={`point-card${selected ? ' sel' : ''}`}>
      <div className="pt-header" onClick={() => setOpen(o => !o)}>
        <input
          type="checkbox"
          className="pt-chk"
          checked={selected}
          aria-label={`Select point ${pt.name}`}
          onChange={() => {}}
          onClick={e => { e.stopPropagation(); onToggle(); }}
        />
        <span className="pt-name">{pt.name}</span>
        <span className="pt-code">
          {pt.code || <span style={{ color: 'var(--ink-faint)' }}>—</span>}
        </span>
        <span className="pt-coords">{fmtCoord(pt.northing)} N &nbsp; {fmtCoord(pt.easting)} E</span>
        <svg
          className={`pt-chevron${open ? ' open' : ''}`}
          width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {open && (
        <div className="pt-detail open">
          <div className="detail-grid">
            <DetailCell label="Northing"     val={pt.northing}  />
            <DetailCell label="Easting"      val={pt.easting}   />
            <DetailCell label="Elevation"    val={pt.elevation} />
            <DetailCell label="Feature Code" val={pt.code}      />
            {obsFields.map(f => <DetailCell key={f.key} label={f.label} val={pt[f.key]} />)}
          </div>
        </div>
      )}
    </div>
  );
}
