const STEPS = [
  {
    num: '01',
    title: 'Export from Trimble Access',
    body: 'Export your job as a CSV from Trimble Access. Any standard format works — N/E/Z, E/N/Z, with or without feature codes.',
  },
  {
    num: '02',
    title: 'Upload & configure',
    body: 'Drop the file in, set your project name, surveyor, and units. FieldCut auto-detects columns and shows every point instantly.',
  },
  {
    num: '03',
    title: 'Select & print',
    body: 'Pick the points you need — all of them or just a few. Hit print and get one clean cut sheet per point, ready for field use.',
  },
];

export default function HowItWorks() {
  return (
    <section className="how" id="how-it-works">
      <div className="how-inner">
        <div className="section-label">Process</div>
        <h2>Three steps, done.</h2>
        <div className="steps">
          {STEPS.map(s => (
            <div className="step" key={s.num}>
              <div className="step-num">{s.num}</div>
              <div className="step-content">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
