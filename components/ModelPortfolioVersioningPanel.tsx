import {
  compareModelPortfolioVersions,
  getLatestModelPortfolioVersion,
  getModelPortfolioVersions,
} from "../lib/engines/model-portfolio-versioning"
import Panel from "./ui/Panel"

export function ModelPortfolioVersioningPanel() {
  const versions = getModelPortfolioVersions()
  const latestVersion = getLatestModelPortfolioVersion()
  const changes = compareModelPortfolioVersions()

  return (
    <Panel eyebrow="Model Portfolio Governance" title="Model Portfolio Versioning">
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "-8px" }}>
        Tracks approved model versions, committee approval history and
        changes between portfolio versions.
      </p>

      <div className="ui-stat-card">
        <p className="ui-stat-label">Latest approved version</p>
        <p className="ui-stat-value" style={{ fontSize: "1.15rem" }}>
          {latestVersion.portfolioName} v{latestVersion.version}
        </p>
        <p style={{ marginTop: "6px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Approved {latestVersion.approvalDate} by {latestVersion.approvedBy}
        </p>
        <p style={{ marginTop: "8px", fontSize: "0.85rem" }}>
          {latestVersion.changeSummary}
        </p>
      </div>

      <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <div>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px" }}>
            Version History
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {versions.map((version) => (
              <div key={version.id} className="ui-item-card">
                <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {version.portfolioName} v{version.version}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Approved {version.approvalDate}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  {version.changeSummary}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px" }}>
            Version Change Log
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {changes.map((change) => (
              <div key={change.field} className="ui-item-card">
                <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{change.field}</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {change.previousValue} → {change.newValue}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  {change.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}
