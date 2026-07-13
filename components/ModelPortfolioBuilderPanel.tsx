"use client";

import { useMemo, useState } from "react";
import {
  getAssetClassTotal,
  getHoldingTotal,
  getModelPortfolioByRiskProfile,
  RiskProfile,
} from "../lib/engines/model-portfolios";
import Badge from "./ui/Badge";
import Panel from "./ui/Panel";
import AllocationPieChart from "./AllocationPieChart";

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
    <Panel eyebrow="Model Portfolio Builder" title="Risk Profile Asset Allocation">
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "-8px" }}>
        Source-of-truth model portfolio structure used by client advice,
        rebalancing and proposal generation.
      </p>

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

      <div className="ui-stat-grid">
        <div className="ui-stat-card">
          <p className="ui-stat-label">Selected Profile</p>
          <p className="ui-stat-value">{portfolio.riskProfile}</p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Growth Assets</p>
          <p className="ui-stat-value">{portfolio.growthWeight}%</p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Defensive Assets</p>
          <p className="ui-stat-value">{portfolio.defensiveWeight}%</p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Allocation Check</p>
          <p className="ui-stat-value">{assetClassTotal}%</p>
        </div>
      </div>

      <div className="ui-item-card">
        <p className="ui-stat-label">Portfolio Objective</p>
        <p style={{ marginTop: "6px", fontSize: "0.9rem" }}>{portfolio.objective}</p>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div>
            <p style={{ fontSize: "0.7rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, margin: 0 }}>
              Asset Allocation
            </p>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "4px 0 0" }}>
              Strategic Asset Classes
            </h3>
          </div>
          <Badge variant="primary">Total {assetClassTotal}%</Badge>
        </div>

        <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "minmax(0, 1.4fr) minmax(260px, 1fr)", alignItems: "start" }}>
          <div className="ui-table-wrap">
            <table className="ui-table">
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
                    <td style={{ fontWeight: 700 }}>{assetClass.name}</td>
                    <td>{assetClass.type}</td>
                    <td>{assetClass.targetWeight}%</td>
                    <td style={{ color: "var(--text-secondary)" }}>{assetClass.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ui-item-card">
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px", textAlign: "center" }}>
              {portfolio.riskProfile} Asset Allocation
            </p>
            <AllocationPieChart
              allocations={portfolio.assetClasses.map((assetClass) => ({
                asset_class: assetClass.name,
                target_weight: assetClass.targetWeight,
              }))}
            />
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div>
            <p style={{ fontSize: "0.7rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, margin: 0 }}>
              Investments
            </p>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "4px 0 0" }}>
              Underlying Portfolio Holdings
            </h3>
          </div>
          <Badge variant="primary">Total {holdingTotal}%</Badge>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {portfolio.assetClasses.map((assetClass) => (
            <div key={assetClass.name} className="ui-item-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>{assetClass.name}</h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    {assetClass.description}
                  </p>
                </div>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{assetClass.targetWeight}%</span>
              </div>

              <div className="ui-table-wrap">
                <table className="ui-table">
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
                        <td style={{ fontWeight: 700 }}>{holding.code}</td>
                        <td>{holding.name}</td>
                        <td>{holding.sector ?? "—"}</td>
                        <td>{holding.weight}%</td>
                        <td style={{ color: "var(--text-secondary)" }}>{holding.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
