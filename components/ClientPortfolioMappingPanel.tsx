import { mapClientPortfolioToModel } from "../lib/engines/client-portfolio-mapping";
import { buildRebalanceRecommendations } from "../lib/engines/rebalance-recommendations";
import { buildTradeBlotter } from "../lib/engines/trade-blotter";

const sampleClientHoldings = [
  {
    code: "BHP",
    name: "BHP Group",
    sector: "Materials",
    currentWeight: 6,
  },
  {
    code: "MQG",
    name: "Macquarie Group",
    sector: "Financials",
    currentWeight: 4,
  },
];

const sampleModelHoldings = [
  {
    code: "BHP",
    name: "BHP Group",
    sector: "Materials",
    targetWeight: 7,
  },
  {
    code: "NST",
    name: "Northern Star Resources",
    sector: "Materials",
    targetWeight: 3,
  },
  {
    code: "MQG",
    name: "Macquarie Group",
    sector: "Financials",
    targetWeight: 5,
  },
];

export function ClientPortfolioMappingPanel() {
  const mapping = mapClientPortfolioToModel(
    sampleClientHoldings,
    sampleModelHoldings
  );
  const recommendations = buildRebalanceRecommendations(
    mapping.map((holding) => ({
      code: holding.code,
      name: holding.name,
      currentWeight: holding.currentWeight,
      targetWeight: holding.targetWeight,
    }))
  );
  const tradeBlotter = buildTradeBlotter(recommendations);
  return (
    <section style={panel}>
      <h2 style={heading}>Client Portfolio Mapping</h2>
      <p style={description}>
        Compares an actual client portfolio against the approved model portfolio
        and identifies missing, underweight, overweight, and in-line positions.
      </p>

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Code</th>
            <th style={th}>Name</th>
            <th style={th}>Sector</th>
            <th style={th}>Current Weight</th>
            <th style={th}>Target Weight</th>
            <th style={th}>Variance</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {mapping.map((holding) => (
            <tr key={holding.code}>
              <td style={td}>{holding.code}</td>
              <td style={td}>{holding.name}</td>
              <td style={td}>{holding.sector}</td>
              <td style={td}>{holding.currentWeight}%</td>
              <td style={td}>{holding.targetWeight}%</td>
              <td style={td}>{holding.variance}%</td>
              <td style={td}>{holding.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={subHeading}>Rebalance Recommendations</h3>

<table style={table}>
  <thead>
    <tr>
      <th style={th}>Code</th>
      <th style={th}>Name</th>
      <th style={th}>Action</th>
      <th style={th}>Weight Change</th>
    </tr>
  </thead>
  <tbody>
    {recommendations.map((recommendation) => (
      <tr key={recommendation.code}>
        <td style={td}>{recommendation.code}</td>
        <td style={td}>{recommendation.name}</td>
        <td style={td}>{recommendation.action}</td>
        <td style={td}>{recommendation.weightChange}%</td>
      </tr>
    ))}
  </tbody>
</table>
<h3 style={subHeading}>Trade Blotter</h3>

<table style={table}>
  <thead>
    <tr>
      <th style={th}>Code</th>
      <th style={th}>Name</th>
      <th style={th}>Side</th>
      <th style={th}>Weight Change</th>
      <th style={th}>Priority</th>
      <th style={th}>Rationale</th>
    </tr>
  </thead>
  <tbody>
    {tradeBlotter.map((trade) => (
      <tr key={trade.code}>
        <td style={td}>{trade.code}</td>
        <td style={td}>{trade.name}</td>
        <td style={td}>{trade.side}</td>
        <td style={td}>{trade.weightChange}%</td>
        <td style={td}>{trade.priority}</td>
        <td style={td}>{trade.rationale}</td>
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
const subHeading = {
    marginTop: "24px",
    marginBottom: "12px",
    color: "#ffffff",
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