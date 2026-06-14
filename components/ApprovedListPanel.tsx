import { buildApprovedList } from "../lib/engines/approved-list";

export function ApprovedListPanel() {
  const approvedList = buildApprovedList();

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Approved List</h2>

      <p className="mt-2 text-sm text-gray-600">
        Securities approved for portfolio construction, research monitoring and Champion / Challenger allocation.
      </p>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Code</th>
            <th className="text-left">Name</th>
            <th className="text-left">Sector</th>
            <th className="text-left">House View</th>
<th className="text-left">Conviction</th>
<th className="text-left">Status</th>
<th className="text-left">Category</th>
<th className="text-left">Review Date</th>
<th className="text-left">Reason</th>
          </tr>
        </thead>

        <tbody>
          {approvedList.map((security) => (
            <tr key={security.id}>
              <td>{security.code}</td>
              <td>{security.name}</td>
              <td>{security.sector}</td>
<td>{security.houseView}</td>
<td>{security.convictionScore}/5</td>
<td>{security.approvedListStatus}</td>
<td>{security.approvedListCategory}</td>
<td>{security.reviewDate}</td>
<td>{security.approvedListReason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}