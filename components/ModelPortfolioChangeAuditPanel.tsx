import { getModelPortfolioChangeAudit } from "../lib/engines/model-portfolio-change-audit";

export function ModelPortfolioChangeAuditPanel() {
  const auditEntries = getModelPortfolioChangeAudit();

  return (
    <section style={panel}>
      <h2 style={heading}>Model Portfolio Change Audit</h2>

      <p style={description}>
        Complete audit trail of model portfolio changes, approvals and
        implementation decisions.
      </p>

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Field</th>
            <th style={th}>Previous</th>
            <th style={th}>New</th>
            <th style={th}>Changed By</th>
            <th style={th}>Approved By</th>
          </tr>
        </thead>
        <tbody>
          {auditEntries.map((entry) => (
            <tr key={entry.id}>
              <td style={td}>{entry.changedField}</td>
              <td style={td}>{entry.previousValue}</td>
              <td style={td}>{entry.newValue}</td>
              <td style={td}>{entry.changedBy}</td>
              <td style={td}>{entry.approvedBy}</td>
            </tr>
          ))}
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

const th = {
  textAlign: "left" as const,
  padding: "10px",
  borderBottom: "1px solid #1e3a5f",
  color: "#94a3b8",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #1e3a5f",
  color: "#ffffff",
};