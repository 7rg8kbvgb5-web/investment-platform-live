import { getMockInvestmentCases } from "../lib/engines/investment-case";
import {
  buildSecurityMasterCandidateFromInvestmentCase,
  canSyncInvestmentCaseToSecurityMaster,
} from "../lib/engines/security-master-sync";

export function SyncPreviewPanel() {
  const approvedCases = getMockInvestmentCases().filter(
    canSyncInvestmentCaseToSecurityMaster
  );

  const candidates = approvedCases.map(buildSecurityMasterCandidateFromInvestmentCase);

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Security Master Sync Preview</h2>

      <p className="mt-2 text-sm text-gray-600">
        Approved investment cases eligible to become Security Master candidates.
      </p>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Code</th>
            <th className="text-left">Name</th>
            <th className="text-left">Type</th>
            <th className="text-left">Status</th>
            <th className="text-left">House View</th>
            <th className="text-left">Review Date</th>
          </tr>
        </thead>

        <tbody>
          {candidates.map((security) => (
            <tr key={security.id}>
              <td>{security.code}</td>
              <td>{security.name}</td>
              <td>{security.type}</td>
              <td>{security.approvalStatus}</td>
              <td>{security.houseView}</td>
              <td>{security.reviewDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}