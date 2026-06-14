import { securityMasterData } from "../domain/types/security-master-data";

export function SecurityMasterPanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Security Master
        </h2>
        <p className="text-sm text-slate-600">
          Central register for approved securities, house views, conviction scores and Champion / Challenger status.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3">House View</th>
              <th className="px-4 py-3">Conviction</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {securityMasterData.map((security) => (
              <tr key={security.id} className="bg-white">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {security.code}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {security.name}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {security.sector}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {security.houseView}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {security.convictionScore}/5
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {security.approvalStatus}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {security.championStatus}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}