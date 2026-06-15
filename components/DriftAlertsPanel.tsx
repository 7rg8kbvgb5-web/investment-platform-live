import { calculatePortfolioDrift } from "../lib/engines/portfolio-drift-monitoring";
import { buildDriftAlerts } from "../lib/engines/drift-alerts";

const samplePositions = [
  {
    code: "BHP",
    name: "BHP Group",
    currentWeight: 6,
    targetWeight: 7,
  },
  {
    code: "NST",
    name: "Northern Star Resources",
    currentWeight: 0,
    targetWeight: 3,
  },
  {
    code: "MQG",
    name: "Macquarie Group",
    currentWeight: 4,
    targetWeight: 5,
  },
];

export function DriftAlertsPanel() {
  const driftResults = calculatePortfolioDrift(samplePositions);
  const alerts = buildDriftAlerts(driftResults);

  return (
    <section style={panel}>
      <h2 style={heading}>Drift Alerts</h2>

      <p style={description}>
        Converts portfolio drift exceptions into adviser alerts for monitoring,
        review, and implementation action.
      </p>

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Code</th>
            <th style={th}>Name</th>
            <th style={th}>Severity</th>
            <th style={th}>Alert Message</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => (
            <tr key={alert.code}>
              <td style={td}>{alert.code}</td>
              <td style={td}>{alert.name}</td>
              <td style={td}>{alert.severity}</td>
              <td style={td}>{alert.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const panel = {
  marginBottom: "30px",
  padding: "24px",
  background: "#061a33",
  borderRadius: "16px",
  border: "1px solid #1e3a5f",
};

const heading = {
  marginTop: 0,
  marginBottom: "8px",
  color: "#ffffff",
};

const description = {
  marginBottom: "18px",
  color: "#b8c7d9",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const th = {
  textAlign: "left" as const,
  padding: "10px",
  color: "#dce8f5",
  borderBottom: "1px solid #29486d",
};

const td = {
  padding: "10px",
  color: "#ffffff",
  borderBottom: "1px solid #153456",
};