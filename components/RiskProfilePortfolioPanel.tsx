import {
    buildRiskProfilePortfolio,
    type RiskProfileName,
  } from "../lib/engines/risk-profile-portfolio";
  
  const RISK_PROFILES: RiskProfileName[] = [
    "Conservative",
    "Moderate",
    "Balanced",
    "Growth",
    "High Growth",
  ];
  
  export function RiskProfilePortfolioPanel() {
    return (
      <div className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Risk Profile Portfolios</h2>
  
        <p className="mt-2 text-sm text-gray-600">
          Model portfolio holdings generated from sector construction and risk profile sector weights.
        </p>
  
        {RISK_PROFILES.map((riskProfile) => {
          const holdings = buildRiskProfilePortfolio(riskProfile);
  
          return (
            <div key={riskProfile} className="mt-6">
              <h3 className="font-semibold">{riskProfile}</h3>
  
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Sector</th>
                    <th className="text-left">Code</th>
                    <th className="text-left">Name</th>
                    <th className="text-left">Role</th>
                    <th className="text-left">Sector Target</th>
                    <th className="text-left">Sector Split</th>
                    <th className="text-left">Portfolio Weight</th>
                  </tr>
                </thead>
  
                <tbody>
                  {holdings.map((holding) => (
                    <tr key={`${riskProfile}-${holding.code}`}>
                      <td>{holding.sector}</td>
                      <td>{holding.code}</td>
                      <td>{holding.name}</td>
                      <td>{holding.role}</td>
                      <td>{holding.sectorTargetWeight}%</td>
                      <td>{holding.sectorWeight}%</td>
                      <td>{holding.portfolioWeight.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  }