import { rankedSecurityRankings } from "../lib/engines/security-ranking";

export default function SecurityRankingPanel() {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">
          Security Ranking
        </h2>
        <p className="text-sm text-slate-300">
          Ranked securities based on house view, earnings momentum, valuation,
          quality and relative strength.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-300">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Security</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">House View</th>
              <th className="px-4 py-3">Earnings Momentum</th>
              <th className="px-4 py-3">Valuation</th>
              <th className="px-4 py-3">Quality</th>
              <th className="px-4 py-3">Relative Strength</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-700">
            {rankedSecurityRankings.map((security, index) => (
              <tr key={security.code}>
                <td className="px-4 py-3 font-semibold text-white">
                  #{index + 1}
                </td>
                <td className="px-4 py-3 font-semibold text-white">
                  {security.code}
                </td>
                <td className="px-4 py-3 text-slate-100">
                  {security.name}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {security.sector}
                </td>
                <td className="px-4 py-3 font-semibold text-white">
                  {security.totalScore.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {security.houseView}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {security.earningsMomentum}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {security.valuation}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {security.quality}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {security.relativeStrength}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}