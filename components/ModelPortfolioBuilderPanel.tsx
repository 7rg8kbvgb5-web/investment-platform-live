"use client";

import { useMemo, useState } from "react";
import {
  getAssetClassTotal,
  getHoldingTotal,
  getModelPortfolioByRiskProfile,
  RiskProfile,
} from "../lib/engines/model-portfolios";

const riskProfiles: RiskProfile[] = [
  "Conservative",
  "Moderate",
  "Balanced",
  "Growth",
  "High Growth",
];

export default function ModelPortfolioBuilderPanel() {
  const [selectedRiskProfile, setSelectedRiskProfile] =
    useState<RiskProfile>("Balanced");

  const portfolio = useMemo(
    () => getModelPortfolioByRiskProfile(selectedRiskProfile),
    [selectedRiskProfile]
  );

  const assetClassTotal = getAssetClassTotal(portfolio);
  const holdingTotal = getHoldingTotal(portfolio);

  return (
    <section className="panel model-portfolio-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Model Portfolio Builder</p>
          <h2>Risk Profile Asset Allocation</h2>
          <p className="panel-subtitle">
            Source-of-truth model portfolio structure used by client advice,
            rebalancing and proposal generation.
          </p>
        </div>
      </div>

      <div className="risk-tabs">
        {riskProfiles.map((profile) => (
          <button
            key={profile}
            type="button"
            className={
              selectedRiskProfile === profile
                ? "risk-tab risk-tab-active"
                : "risk-tab"
            }
            onClick={() => setSelectedRiskProfile(profile)}
          >
            {profile}
          </button>
        ))}
      </div>

      <div className="model-summary-grid">
        <div className="summary-card">
          <span className="summary-label">Selected Profile</span>
          <strong>{portfolio.riskProfile}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Growth Assets</span>
          <strong>{portfolio.growthWeight}%</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Defensive Assets</span>
          <strong>{portfolio.defensiveWeight}%</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Allocation Check</span>
          <strong>{assetClassTotal}%</strong>
        </div>
      </div>

      <div className="model-objective-card">
        <span className="summary-label">Portfolio Objective</span>
        <p>{portfolio.objective}</p>
      </div>

      <div className="model-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Asset Allocation</p>
            <h3>Strategic Asset Classes</h3>
          </div>
          <span className="section-pill">Total {assetClassTotal}%</span>
        </div>

        <div className="table-wrap">
          <table className="model-table">
            <thead>
              <tr>
                <th>Asset Class</th>
                <th>Type</th>
                <th>Target Weight</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.assetClasses.map((assetClass) => (
                <tr key={assetClass.name}>
                  <td>
                    <strong>{assetClass.name}</strong>
                  </td>
                  <td>{assetClass.type}</td>
                  <td>{assetClass.targetWeight}%</td>
                  <td>{assetClass.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="model-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Investments</p>
            <h3>Underlying Portfolio Holdings</h3>
          </div>
          <span className="section-pill">Total {holdingTotal}%</span>
        </div>

        <div className="asset-class-stack">
          {portfolio.assetClasses.map((assetClass) => (
            <div key={assetClass.name} className="asset-class-card">
              <div className="asset-class-card-header">
                <div>
                  <h4>{assetClass.name}</h4>
                  <p>{assetClass.description}</p>
                </div>
                <span>{assetClass.targetWeight}%</span>
              </div>

              <div className="table-wrap">
                <table className="model-table compact">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Investment</th>
                      <th>Sector</th>
                      <th>Weight</th>
                      <th>Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetClass.holdings.map((holding) => (
                      <tr key={`${assetClass.name}-${holding.code}`}>
                        <td>
                          <strong>{holding.code}</strong>
                        </td>
                        <td>{holding.name}</td>
                        <td>{holding.sector ?? "—"}</td>
                        <td>{holding.weight}%</td>
                        <td>{holding.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}