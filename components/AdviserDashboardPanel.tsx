import { buildDashboardSummary } from "../lib/engines/dashboard-engine";

export function AdviserDashboardPanel() {
  const summary = buildDashboardSummary();

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Adviser Command Centre</p>
          <h2>Today&apos;s priorities</h2>
          <p>
            Portfolio health, client review actions, research activity and governance items in one place.
          </p>
        </div>

        <div className="kpi-card">
          <span>Portfolio Health</span>
          <strong>{summary.portfolioHealth}%</strong>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><span>Client Reviews</span><strong>{summary.clientsNeedingReview}</strong></div>
        <div className="kpi-card"><span>Pending Proposals</span><strong>{summary.proposalsPending}</strong></div>
        <div className="kpi-card"><span>Research Requests</span><strong>{summary.researchRequests}</strong></div>
        <div className="kpi-card"><span>Governance Approvals</span><strong>{summary.governanceApprovals}</strong></div>
      </div>

      <div className="compact-grid">
        <div className="mini-panel">
          <h3>Priority Actions</h3>
          <p>Client portfolios requiring review: <strong>{summary.clientsNeedingReview}</strong></p>
          <p>Investment proposals awaiting approval: <strong>{summary.proposalsPending}</strong></p>
          <p>House View changes: <strong>{summary.houseViewChanges}</strong></p>
        </div>

        <div className="mini-panel">
          <h3>Research & Governance</h3>
          <p>Investment Cases: <strong>{summary.investmentCases}</strong></p>
          <p>Model Updates: <strong>{summary.modelUpdates}</strong></p>
          <p>Approvals: <strong>{summary.governanceApprovals}</strong></p>
        </div>
      </div>
    </section>
  );
}