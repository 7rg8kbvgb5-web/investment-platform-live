export default function ClientAdviceDecisionSummary() {
    return (
      <section className="decision-summary-panel">
        <div>
          <p className="eyebrow">Decision Summary</p>
          <h2>Proceed with portfolio rebalance</h2>
          <p>
            The uploaded portfolio shows moderate drift from the house model, with
            concentration and sector allocation adjustments recommended.
          </p>
        </div>
  
        <div className="decision-summary-grid">
          <div className="decision-summary-card">
            <span>Portfolio Quality</span>
            <strong>82 → 93</strong>
          </div>
  
          <div className="decision-summary-card">
            <span>Expected Yield</span>
            <strong>4.8% → 5.2%</strong>
          </div>
  
          <div className="decision-summary-card">
            <span>Recommended Changes</span>
            <strong>8</strong>
          </div>
  
          <div className="decision-summary-card">
            <span>Recommendation Confidence</span>
            <strong>94%</strong>
          </div>
        </div>
      </section>
    );
  }