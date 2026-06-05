import { useState } from 'react';
import { fmtCoord, fmtCutFill } from '../utils.js';

function DetailCell({ label, val, highlight }) {
  const empty = val === null || val === undefined || val === '';
  return (
    <div className={`dc${highlight ? ' dc--highlight' : ''}`}>
      <span className="dk">{label}</span>
      <span className={`dv${empty ? ' na' : ''}`}>{empty ? 'n/a' : val}</span>
    </div>
  );
}

export default function PointCard({ point: pt, selected, onToggle }) {
  const [open, setOpen] = useState(false);

  const hasDesign = pt.design_elev !== undefined;

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
    <div className={`point-card${selected ? ' sel' : ''}${pt.unmatched ? ' unmatched' : ''}`}>
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

        {hasDesign && !pt.unmatched && pt.cut_fill !== null && (
          <span className={`pt-cutfill ${pt.cut_fill >= 0 ? 'cut' : 'fill'}`}>
            {pt.cut_fill >= 0 ? 'C' : 'F'} {Math.abs(pt.cut_fill).toFixed(3)}′
          </span>
        )}

        {pt.unmatched && (
          <span className="pt-unmatched-badge" title="No survey match within 1 ft">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2L14.9 14H1.1L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="12.5" r="0.8" fill="currentColor"/>
            </svg>
            No match
          </span>
        )}

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
            <DetailCell label="Northing"         val={pt.northing}    />
            <DetailCell label="Easting"           val={pt.easting}     />
            <DetailCell label="Surveyed Elev"     val={pt.elevation}   />
            {hasDesign && <DetailCell label="Design Elev" val={pt.design_elev} highlight />}
            {hasDesign && pt.cut_fill !== null && (
              <DetailCell
                label={pt.cut_fill >= 0 ? 'Cut' : 'Fill'}
                val={`${Math.abs(pt.cut_fill).toFixed(3)} ft`}
                highlight
              />
            )}
            <DetailCell label="Feature Code"     val={pt.code}        />
            {obsFields.map(f => <DetailCell key={f.key} label={f.label} val={pt[f.key]} />)}
            {hasDesign && pt.field_point_name && (
              <DetailCell label="Field Point" val={pt.field_point_name} />
            )}
            {hasDesign && pt.match_dist !== null && (
              <DetailCell label="Match Dist" val={`${pt.match_dist.toFixed(3)} ft`} />
            )}
            {hasDesign && pt.match_method && (
              <DetailCell label="Matched By" val={pt.match_method} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
