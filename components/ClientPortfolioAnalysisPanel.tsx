import type { ClientPortfolioAnalysis } from "../lib/engines/client-portfolio-analysis";
import Badge, { type BadgeVariant } from "./ui/Badge";
import Panel from "./ui/Panel";

type ClientPortfolioAnalysisPanelProps = {
  analysis: ClientPortfolioAnalysis;
};

function severityVariant(severity: string): BadgeVariant {
  if (severity === "high" || severity === "critical") return "danger";
  if (severity === "medium") return "warning";
  return "neutral";
}

export function ClientPortfolioAnalysisPanel({
  analysis,
}: ClientPortfolioAnalysisPanelProps) {
  return (
    <Panel eyebrow="Client Portfolio Analysis" title="Client vs Model Portfolio Gap Analysis">
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "-8px" }}>
        Compares the client portfolio against the approved model portfolio
        and identifies required adjustments.
      </p>

      <div className="ui-stat-grid">
        <div className="ui-stat-card">
          <p className="ui-stat-label">Client Portfolio</p>
          <p className="ui-stat-value">{analysis.clientName}</p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Model Portfolio</p>
          <p className="ui-stat-value">{analysis.modelName}</p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Alignment Score</p>
          <p className="ui-stat-value" style={{ fontSize: "1.6rem" }}>
            {analysis.alignmentScore}/100
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            {analysis.status.replaceAll("-", " ")}
          </p>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "10px" }}>
          Portfolio Gaps
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {analysis.gaps.map((gap) => (
            <div key={gap.id} className="ui-item-card">
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{gap.title}</p>
                  <p style={{ marginTop: "4px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {gap.description}
                  </p>
                </div>

                <Badge variant={severityVariant(gap.severity)}>{gap.severity}</Badge>
              </div>

              <p style={{ marginTop: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>Recommendation: </span>
                {gap.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
