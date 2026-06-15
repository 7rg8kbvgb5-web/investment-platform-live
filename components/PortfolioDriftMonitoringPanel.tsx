import { calculatePortfolioDrift } from "../lib/engines/portfolio-drift-monitoring";

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

export function PortfolioDriftMonitoringPanel() {
  const driftResults = calculatePortfolioDrift(samplePositions);

  return (
    <section style={panel}>
      <h2 style={heading}>Portfolio Drift Monitoring</h2>

      <p style={description}>
        Identifies positions that have drifted away from their target model
        weights and require monitoring or portfolio action.
      </p>

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Code</th>
            <th style={th}>Name</th>
            <th style={th}>Current Weight</th>
            <th style={th}>Target Weight</th>
            <th style={th}>Drift</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {driftResults.map((position) => (
            <tr key={position.code}>
              <td style={td}>{position.code}</td>
              <td style={td}>{position.name}</td>
              <td style={td}>{position.currentWeight}%</td>
              <td style={td}>{position.targetWeight}%</td>
              <td style={td}>{position.driftPercentage}%</td>
              <td style={td}>{position.status}</td>
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