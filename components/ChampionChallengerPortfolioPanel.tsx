import { buildChampionChallengerPortfolio } from "../lib/engines/champion-challenger-portfolio";

export function ChampionChallengerPortfolioPanel() {
  const portfolio = buildChampionChallengerPortfolio();

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold">
        Champion / Challenger Portfolio
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Portfolio construction candidates using the default 70/30 Champion /
        Challenger weighting framework.
      </p>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Code</th>
            <th className="text-left">Name</th>
            <th className="text-left">Sector</th>
            <th className="text-left">Role</th>
            <th className="text-left">Target Weight</th>
            <th className="text-left">Conviction</th>
            <th className="text-left">House View</th>
          </tr>
        </thead>

        <tbody>
          {portfolio.map((security) => (
            <tr key={security.id}>
              <td>{security.code}</td>
              <td>{security.name}</td>
              <td>{security.sector}</td>
              <td>{security.role}</td>
              <td>{security.targetWeight}%</td>
              <td>{security.convictionScore}/5</td>
              <td>{security.houseView}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}