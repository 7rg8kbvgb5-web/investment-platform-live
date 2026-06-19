import { rankedSectorHealthScores } from "../lib/engines/sector-intelligence";

function getRecommendationClass(recommendation: string) {
    switch (recommendation) {
      case "Strong Overweight":
        return "rounded-full border border-emerald-400 bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-300";
      case "Overweight":
        return "rounded-full border border-green-400 bg-green-950 px-3 py-1 text-xs font-semibold text-green-300";
      case "Neutral":
        return "rounded-full border border-amber-400 bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-300";
      case "Underweight":
        return "rounded-full border border-orange-400 bg-orange-950 px-3 py-1 text-xs font-semibold text-orange-300";
      default:
        return "rounded-full border border-red-400 bg-red-950 px-3 py-1 text-xs font-semibold text-red-300";
    }
  }

export default function SectorHealthScorePanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Sector Health Score
        </h2>
        <p className="text-sm text-slate-600">
          Sector positioning based on earnings revision momentum, breadth,
          relative strength, valuation opportunity and house view overlay.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Recommendation</th>
              <th className="px-4 py-3">Earnings Momentum</th>
              <th className="px-4 py-3">Breadth</th>
              <th className="px-4 py-3">Relative Strength</th>
              <th className="px-4 py-3">Valuation</th>
              <th className="px-4 py-3">House View</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {rankedSectorHealthScores.map((sector, index) => (
              <tr key={sector.sector}>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  #{index + 1}
                </td>

                <td className="px-4 py-3 font-medium text-slate-900">
                  {sector.sector}
                </td>

                <td className="px-4 py-3 font-semibold text-slate-900">
                  {sector.totalScore.toFixed(1)}
                </td>

                <td className="px-4 py-3">
  <span
    style={{
      display: "inline-block",
      borderRadius: "9999px",
      padding: "4px 10px",
      fontSize: "12px",
      fontWeight: 700,
      backgroundColor:
        sector.recommendation === "Strong Overweight"
          ? "#064e3b"
          : sector.recommendation === "Overweight"
          ? "#14532d"
          : sector.recommendation === "Neutral"
          ? "#78350f"
          : sector.recommendation === "Underweight"
          ? "#7c2d12"
          : "#7f1d1d",
      color:
        sector.recommendation === "Strong Overweight"
          ? "#6ee7b7"
          : sector.recommendation === "Overweight"
          ? "#86efac"
          : sector.recommendation === "Neutral"
          ? "#fde68a"
          : sector.recommendation === "Underweight"
          ? "#fdba74"
          : "#fca5a5",
      border: "1px solid rgba(255,255,255,0.25)",
    }}
  >
    {sector.recommendation}
  </span>
</td>

                <td className="px-4 py-3 text-slate-700">
                  {sector.earningsRevisionMomentum}
                </td>

                <td className="px-4 py-3 text-slate-700">
                  {sector.earningsBreadth}
                </td>

                <td className="px-4 py-3 text-slate-700">
                  {sector.relativeStrength}
                </td>

                <td className="px-4 py-3 text-slate-700">
                  {sector.valuationOpportunity}
                </td>

                <td className="px-4 py-3 text-slate-700">
                  {sector.houseViewOverlay}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}