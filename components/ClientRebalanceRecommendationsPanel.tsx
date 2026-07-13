import type { ClientRebalanceRecommendation } from "../lib/engines/client-rebalance-recommendations";
import Badge, { type BadgeVariant } from "./ui/Badge";
import Panel from "./ui/Panel";

type ClientRebalanceRecommendationsPanelProps = {
  recommendations: ClientRebalanceRecommendation[];
};

function priorityVariant(priority: string): BadgeVariant {
  if (priority === "high" || priority === "critical") return "danger";
  if (priority === "medium") return "warning";
  return "neutral";
}

export function ClientRebalanceRecommendationsPanel({
  recommendations,
}: ClientRebalanceRecommendationsPanelProps) {
  return (
    <Panel eyebrow="Rebalance Recommendations" title="Security-Level Trade Recommendations">
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "-8px" }}>
        Converts client portfolio gaps into buy, sell, hold and review
        actions against the approved model portfolio.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {recommendations.map((recommendation) => (
          <div key={recommendation.id} className="ui-item-card">
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                  {recommendation.action.toUpperCase()} {recommendation.ticker}
                </p>
                <p style={{ marginTop: "4px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {recommendation.name} · {recommendation.sector}
                </p>
              </div>

              <Badge variant={priorityVariant(recommendation.priority)}>
                {recommendation.priority}
              </Badge>
            </div>

            <div className="ui-stat-grid" style={{ marginTop: "12px" }}>
              <div>
                <p className="ui-stat-label">Current Weight</p>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginTop: "2px" }}>
                  {recommendation.currentWeight}%
                </p>
              </div>

              <div>
                <p className="ui-stat-label">Target Weight</p>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginTop: "2px" }}>
                  {recommendation.targetWeight}%
                </p>
              </div>

              <div>
                <p className="ui-stat-label">Change</p>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginTop: "2px" }}>
                  {recommendation.changeWeight > 0 ? "+" : ""}
                  {recommendation.changeWeight}%
                </p>
              </div>
            </div>

            <p style={{ marginTop: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span style={{ fontWeight: 700, color: "var(--text)" }}>Rationale: </span>
              {recommendation.rationale}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
