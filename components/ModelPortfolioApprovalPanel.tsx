import { getModelPortfolioApproval } from "../lib/engines/model-portfolio-approval";

export function ModelPortfolioApprovalPanel() {
  const approval = getModelPortfolioApproval();

  return (
    <section style={panel}>
      <h2 style={heading}>Model Portfolio Approval Workflow</h2>

      <p style={description}>
        Tracks the approval status of model portfolio changes prior to
        implementation and client rollout.
      </p>

      <table style={table}>
        <tbody>
          <tr>
            <td style={label}>Portfolio</td>
            <td style={value}>{approval.portfolioName}</td>
          </tr>

          <tr>
            <td style={label}>Version</td>
            <td style={value}>{approval.version}</td>
          </tr>

          <tr>
            <td style={label}>Status</td>
            <td style={value}>{approval.status}</td>
          </tr>

          <tr>
            <td style={label}>Submitted By</td>
            <td style={value}>{approval.submittedBy}</td>
          </tr>

          <tr>
            <td style={label}>Reviewed By</td>
            <td style={value}>{approval.reviewedBy ?? "Pending Review"}</td>
          </tr>

          <tr>
            <td style={label}>Effective Date</td>
            <td style={value}>{approval.effectiveDate}</td>
          </tr>

          <tr>
            <td style={label}>Committee Notes</td>
            <td style={value}>
              {approval.committeeNotes ?? "Awaiting committee review"}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

const panel = {
  marginBottom: "25px",
  padding: "25px",
  background: "#0b1f3a",
  borderRadius: "12px",
  border: "1px solid #1e3a5f",
};

const heading = {
  color: "#ffffff",
  marginBottom: "10px",
};

const description = {
  color: "#cbd5e1",
  marginBottom: "20px",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const label = {
  color: "#94a3b8",
  padding: "10px",
  borderBottom: "1px solid #1e3a5f",
  width: "30%",
};

const value = {
  color: "#ffffff",
  padding: "10px",
  borderBottom: "1px solid #1e3a5f",
};