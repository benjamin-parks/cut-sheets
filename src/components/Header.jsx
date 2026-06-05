export default function Header() {
  return (
    <header>
      <div className="header-inner">
        <a href="#" className="logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="24" height="24" rx="5" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="8" y1="9" x2="20" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8" y1="19" x2="20" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="20" cy="14" r="3" fill="currentColor"/>
          </svg>
          <span className="logo-text">FieldCut</span>
        </a>
        <nav>
          <a href="#how-it-works">How it works</a>
          <a href="#tool" className="nav-cta">Open Tool</a>
        </nav>
      </div>
    </header>
  );
}
