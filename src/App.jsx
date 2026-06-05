import { useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import Tool from './components/Tool.jsx';
import Footer from './components/Footer.jsx';
import { matchPoints } from './match.js';

export default function App() {
  const [surveyPoints, setSurveyPoints]   = useState([]);
  const [designPoints, setDesignPoints]   = useState([]);
  const [mergedPoints, setMergedPoints]   = useState([]);
  const [surveyFile, setSurveyFile]       = useState('');
  const [designFile, setDesignFile]       = useState('');
  const [selected, setSelected]           = useState(new Set());

  function handleSurveyLoaded(pts, name) {
    setSurveyPoints(pts);
    setSurveyFile(name);
    const merged = designPoints.length > 0 ? matchPoints(pts, designPoints) : pts;
    setMergedPoints(merged);
    setSelected(new Set(merged.map((_, i) => i)));
  }

  function handleDesignLoaded(pts, name) {
    setDesignPoints(pts);
    setDesignFile(name);
    const merged = surveyPoints.length > 0 ? matchPoints(surveyPoints, pts) : pts;
    setMergedPoints(merged);
    setSelected(new Set(merged.map((_, i) => i)));
  }

  function handleReset() {
    setSurveyPoints([]);
    setDesignPoints([]);
    setMergedPoints([]);
    setSurveyFile('');
    setDesignFile('');
    setSelected(new Set());
  }

  function toggleSelect(i) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function selectAll()  { setSelected(new Set(mergedPoints.map((_, i) => i))); }
  function selectNone() { setSelected(new Set()); }

  // Display points: merged if both loaded, else whichever is loaded
  const displayPoints = mergedPoints.length > 0 ? mergedPoints
    : surveyPoints.length > 0 ? surveyPoints
    : [];

  return (
    <>
      <div id="grain" aria-hidden="true" />
      <Header />
      <Hero />
      <HowItWorks />
      <Tool
        points={displayPoints}
        selected={selected}
        surveyFile={surveyFile}
        designFile={designFile}
        hasDesign={designPoints.length > 0}
        onSurveyLoaded={handleSurveyLoaded}
        onDesignLoaded={handleDesignLoaded}
        onReset={handleReset}
        onToggleSelect={toggleSelect}
        onSelectAll={selectAll}
        onSelectNone={selectNone}
      />
      <Footer />
    </>
  );
}
