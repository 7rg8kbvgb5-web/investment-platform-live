import { buildPortfolioCandidatesFromApprovedList } from "../lib/engines/approved-list-portfolio";

export function PortfolioCandidatesPanel() {
  const candidates = buildPortfolioCandidatesFromApprovedList();

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Portfolio Candidates</h2>

      <p className="mt-2 text-sm text-gray-600">
        Approved securities eligible for portfolio construction review.
      </p>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Code</th>
            <th className="text-left">Name</th>
            <th className="text-left">Sector</th>
            <th className="text-left">Role</th>
            <th className="text-left">Conviction</th>
            <th className="text-left">House View</th>
            <th className="text-left">Recommended</th>
          </tr>
        </thead>

        <tbody>
          {candidates.map((security) => (
            <tr key={security.id}>
              <td>{security.code}</td>
              <td>{security.name}</td>
              <td>{security.sector}</td>
              <td>{security.role}</td>
              <td>{security.convictionScore}/5</td>
              <td>{security.houseView}</td>
              <td>{security.recommendedForPortfolio ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}