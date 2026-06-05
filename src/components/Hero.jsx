const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-tag">Trimble Access · CSV Import · Print-Ready</div>
        <h1>Cut sheets from your <em>survey data</em>, instantly.</h1>
        <p className="hero-sub">
          Upload any Trimble Access CSV export and generate professional, print-ready cut sheets
          for every point — no software, no subscriptions, no nonsense.
        </p>
        <div className="hero-actions">
          <a href="#tool" className="btn-hero">Generate Cut Sheets <span className="arr">→</span></a>
          <a href="#how-it-works" className="btn-ghost">See how it works</a>
        </div>
        <div className="hero-trust">
          <span className="trust-item"><CheckIcon />100% local — no uploads</span>
          <span className="trust-item"><CheckIcon />Auto-detects columns</span>
          <span className="trust-item"><CheckIcon />One sheet per point</span>
        </div>
      </div>

      <div className="hero-visual" aria-hidden="true">
        <div className="sample-sheet">
          <div className="ss-header">
            <div className="ss-point">PT-1047</div>
            <div className="ss-badge">CL</div>
          </div>
          <div className="ss-grid">
            <div className="ss-cell"><span className="ss-lbl">Northing</span><span className="ss-val">4,821,304.2810</span></div>
            <div className="ss-cell"><span className="ss-lbl">Easting</span><span className="ss-val">312,048.9340</span></div>
            <div className="ss-cell"><span className="ss-lbl">Elevation</span><span className="ss-val">1,204.8820</span></div>
            <div className="ss-cell"><span className="ss-lbl">Feature Code</span><span className="ss-val">CL</span></div>
          </div>
          <div className="ss-notes">Field Notes / Stakeout Notes</div>
          <div className="ss-row3">
            <div className="ss-sm">Cut / Fill</div>
            <div className="ss-sm">Offset</div>
            <div className="ss-sm">Initials</div>
          </div>
        </div>
        <div className="sample-sheet sample-sheet--back" />
        <div className="sample-sheet sample-sheet--back2" />
      </div>
    </section>
  );
}
