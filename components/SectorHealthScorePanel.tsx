import { sectorHealthScores } from "../lib/engines/sector-intelligence";

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
            {sectorHealthScores.map((sector) => (
              <tr key={sector.sector}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {sector.sector}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {sector.totalScore.toFixed(1)}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {sector.recommendation}
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