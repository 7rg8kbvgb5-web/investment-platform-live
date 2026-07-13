import { rankedSectorHealthScores } from "../lib/engines/sector-intelligence";
import Badge, { type BadgeVariant } from "./ui/Badge";
import Panel from "./ui/Panel";

function recommendationVariant(recommendation: string): BadgeVariant {
  switch (recommendation) {
    case "Strong Overweight":
    case "Overweight":
      return "success";
    case "Neutral":
      return "warning";
    default:
      return "danger";
  }
}

export default function SectorHealthScorePanel() {
  return (
    <Panel eyebrow="Sector Intelligence" title="Sector Health Score">
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "-8px" }}>
        Sector positioning based on earnings revision momentum, breadth,
        relative strength, valuation opportunity and house view overlay.
      </p>

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Sector</th>
              <th>Score</th>
              <th>Recommendation</th>
              <th>Earnings Momentum</th>
              <th>Breadth</th>
              <th>Relative Strength</th>
              <th>Valuation</th>
              <th>House View</th>
            </tr>
          </thead>

          <tbody>
            {rankedSectorHealthScores.map((sector, index) => (
              <tr key={sector.sector}>
                <td style={{ fontWeight: 700 }}>#{index + 1}</td>
                <td style={{ fontWeight: 600 }}>{sector.sector}</td>
                <td style={{ fontWeight: 700 }}>{sector.totalScore.toFixed(1)}</td>
                <td>
                  <Badge variant={recommendationVariant(sector.recommendation)}>
                    {sector.recommendation}
                  </Badge>
                </td>
                <td>{sector.earningsRevisionMomentum}</td>
                <td>{sector.earningsBreadth}</td>
                <td>{sector.relativeStrength}</td>
                <td>{sector.valuationOpportunity}</td>
                <td>{sector.houseViewOverlay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
