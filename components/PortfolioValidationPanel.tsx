import { validatePortfolioConstruction } from "../lib/engines/portfolio-validation";
import Badge, { type BadgeVariant } from "./ui/Badge";
import Panel from "./ui/Panel";

function issueSeverityVariant(severity: string): BadgeVariant {
  if (severity === "fail" || severity === "critical" || severity === "high") return "danger";
  if (severity === "warning" || severity === "medium") return "warning";
  return "neutral";
}

export function PortfolioValidationPanel() {
  const validation = validatePortfolioConstruction();

  return (
    <Panel eyebrow="Portfolio Validation" title="Quality Score & Rule Checks">
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "-8px" }}>
        {validation.summary}
      </p>

      <div className="ui-stat-grid">
        <div className="ui-stat-card">
          <p className="ui-stat-label">Portfolio</p>
          <p className="ui-stat-value">{validation.portfolioName}</p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Quality Score</p>
          <p className="ui-stat-value" style={{ fontSize: "1.6rem" }}>
            {validation.overallScore}/100
          </p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Status</p>
          <p className="ui-stat-value" style={{ color: "var(--warning)" }}>
            {validation.status}
          </p>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "10px" }}>
          Validation Score Breakdown
        </h3>

        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {validation.scores.map((score) => (
            <div key={score.category} className="ui-item-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{score.label}</p>
                <Badge variant="neutral">{score.status}</Badge>
              </div>
              <p style={{ marginTop: "8px", fontSize: "1.3rem", fontWeight: 700 }}>
                {score.score}/{score.maxScore}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {validation.issues.map((issue) => (
          <div key={issue.id} className="ui-item-card">
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{issue.title}</p>
                <p style={{ marginTop: "4px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {issue.description}
                </p>
              </div>

              <Badge variant={issueSeverityVariant(issue.severity)}>{issue.severity}</Badge>
            </div>

            <p style={{ marginTop: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span style={{ fontWeight: 700, color: "var(--text)" }}>Recommendation: </span>
              {issue.recommendation}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
