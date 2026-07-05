export default function AdviserCommandCentreHeader() {
  return (
    <section className="command-centre-hero">
      <div className="command-centre-copy">
        <p className="command-centre-eyebrow">
          Institutional Portfolio Platform
        </p>
        <h1>Adviser Command Centre</h1>
        <p>
          Monitor portfolio construction, investment committee activity and
          client proposal progress from one dashboard.
        </p>
      </div>

      <div className="command-centre-kpi-grid">
        <div className="command-centre-kpi">
          <span>Portfolio Health</span>
          <strong>91%</strong>
          <p>Average Alignment</p>
        </div>

        <div className="command-centre-kpi">
          <span>Investment Committee</span>
          <strong>2 Pending</strong>
          <p>Items awaiting review</p>
        </div>

        <div className="command-centre-kpi">
          <span>House Views</span>
          <strong>14 Active</strong>
          <p>Across sectors</p>
        </div>

        <div className="command-centre-kpi">
          <span>Proposal Pipeline</span>
          <strong>5 Drafts</strong>
          <p>In preparation</p>
        </div>
      </div>
    </section>
  );
}