import { securityMasterData } from "../domain/types/security-master-data";
import Badge, { type BadgeVariant } from "./ui/Badge";
import Panel from "./ui/Panel";

function houseViewVariant(view: string): BadgeVariant {
  if (view === "strong-positive" || view === "positive") return "success";
  if (view === "negative" || view === "strong-negative") return "danger";
  return "neutral";
}

function approvalVariant(status: string): BadgeVariant {
  if (status === "approved") return "success";
  if (status === "watchlist" || status === "under-review") return "warning";
  if (status === "restricted" || status === "removed") return "danger";
  return "neutral";
}

function championVariant(status: string): BadgeVariant {
  if (status === "champion") return "primary";
  if (status === "challenger") return "neutral";
  return "neutral";
}

export function SecurityMasterPanel() {
  return (
    <Panel
      eyebrow="Approved List"
      title="Security Master"
    >
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "-8px" }}>
        Central register for approved securities, house views, conviction
        scores and Champion / Challenger status.
      </p>

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Sector</th>
              <th>House View</th>
              <th>Conviction</th>
              <th>Status</th>
              <th>Role</th>
            </tr>
          </thead>

          <tbody>
            {securityMasterData.map((security) => (
              <tr key={security.id}>
                <td style={{ fontWeight: 700 }}>{security.code}</td>
                <td>{security.name}</td>
                <td>{security.sector}</td>
                <td>
                  <Badge variant={houseViewVariant(security.houseView)}>
                    {security.houseView.replaceAll("-", " ")}
                  </Badge>
                </td>
                <td>{security.convictionScore}/5</td>
                <td>
                  <Badge variant={approvalVariant(security.approvalStatus)}>
                    {security.approvalStatus.replaceAll("-", " ")}
                  </Badge>
                </td>
                <td>
                  <Badge variant={championVariant(security.championStatus)}>
                    {security.championStatus.replaceAll("-", " ")}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
