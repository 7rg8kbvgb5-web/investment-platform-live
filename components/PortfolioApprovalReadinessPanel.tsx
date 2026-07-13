import { evaluateApprovalReadiness } from "../lib/engines/portfolio-approval-readiness";
import Panel from "./ui/Panel";

export function PortfolioApprovalReadinessPanel() {
  const readiness = evaluateApprovalReadiness();

  return (
    <Panel eyebrow="Approval Readiness" title="Model Portfolio Approval Status">
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "-8px" }}>
        {readiness.rationale}
      </p>

      <div className="ui-stat-grid">
        <div className="ui-stat-card">
          <p className="ui-stat-label">Approval Status</p>
          <p className="ui-stat-value">{readiness.status.replaceAll("-", " ")}</p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Validation Score</p>
          <p className="ui-stat-value" style={{ fontSize: "1.6rem" }}>
            {readiness.score}/100
          </p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Decision Basis</p>
          <p className="ui-stat-value">IC Review Gate</p>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "10px" }}>
          Required Actions
        </h3>

        {readiness.requiredActions.length === 0 ? (
          <p className="ui-item-card" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            No required actions. Portfolio is ready for approval workflow.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {readiness.requiredActions.map((action) => (
              <div key={action} className="ui-item-card" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {action}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
