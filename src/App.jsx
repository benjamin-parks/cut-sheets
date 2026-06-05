import { useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import Tool from './components/Tool.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  const [points, setPoints] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [fileName, setFileName] = useState('');

  function handlePointsLoaded(pts, name) {
    setPoints(pts);
    setSelected(new Set(pts.map((_, i) => i)));
    setFileName(name);
  }

  function handleReset() {
    setPoints([]);
    setSelected(new Set());
    setFileName('');
  }

  function toggleSelect(i) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function selectAll()  { setSelected(new Set(points.map((_, i) => i))); }
  function selectNone() { setSelected(new Set()); }

  return (
    <>
      <div id="grain" aria-hidden="true" />
      <Header />
      <Hero />
      <HowItWorks />
      <Tool
        points={points}
        selected={selected}
        fileName={fileName}
        onPointsLoaded={handlePointsLoaded}
        onReset={handleReset}
        onToggleSelect={toggleSelect}
        onSelectAll={selectAll}
        onSelectNone={selectNone}
      />
      <Footer />
    </>
  );
}
