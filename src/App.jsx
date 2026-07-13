import { useState } from 'react';
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
  const [tolerance, setTolerance]         = useState(50);
  const [overrides, setOverrides]         = useState({});

  function rematch(survey, design, tol, ov, keepSelection = false) {
    const merged = design.length > 0 ? matchPoints(survey, design, tol, ov) : survey;
    setMergedPoints(merged);
    if (!keepSelection) setSelected(new Set(merged.map((_, i) => i)));
  }

  function handleSurveyLoaded(pts, name) {
    setSurveyPoints(pts);
    setSurveyFile(name);
    setOverrides({});
    rematch(pts, designPoints, tolerance, {});
  }

  function handleDesignLoaded(pts, name) {
    setDesignPoints(pts);
    setDesignFile(name);
    setOverrides({});
    rematch(surveyPoints, pts, tolerance, {});
  }

  function handleToleranceChange(val) {
    setTolerance(val);
    if (surveyPoints.length > 0 && designPoints.length > 0) {
      rematch(surveyPoints, designPoints, val, overrides);
    }
  }

  // Manually pin a field point to a design point (designName null = back to auto).
  function handleReassign(fieldName, designName) {
    const next = { ...overrides };
    if (designName) next[fieldName] = designName;
    else delete next[fieldName];
    setOverrides(next);
    rematch(surveyPoints, designPoints, tolerance, next, true);
  }

  function handleReset() {
    setSurveyPoints([]);
    setDesignPoints([]);
    setMergedPoints([]);
    setSurveyFile('');
    setDesignFile('');
    setSelected(new Set());
    setOverrides({});
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

  // Both files are required — cut/fill is meaningless without design elevations.
  const displayPoints = surveyPoints.length > 0 && designPoints.length > 0 ? mergedPoints : [];

  return (
    <>
      <HowItWorks />
      <Tool
        points={displayPoints}
        selected={selected}
        surveyFile={surveyFile}
        designFile={designFile}
        hasDesign={designPoints.length > 0}
        tolerance={tolerance}
        onToleranceChange={handleToleranceChange}
        onSurveyLoaded={handleSurveyLoaded}
        onDesignLoaded={handleDesignLoaded}
        onReset={handleReset}
        onToggleSelect={toggleSelect}
        onSelectAll={selectAll}
        onSelectNone={selectNone}
        rawSurveyPoints={surveyPoints}
        rawDesignPoints={designPoints}
        onReassign={handleReassign}
      />
      <Footer />
    </>
  );
}
