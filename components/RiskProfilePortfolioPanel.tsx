'use client'

import { useState } from 'react'
import {
  buildRiskProfilePortfolio,
  type RiskProfileName,
} from '../lib/engines/risk-profile-portfolio'

const RISK_PROFILES: RiskProfileName[] = [
  'Conservative',
  'Moderate',
  'Balanced',
  'Growth',
  'High Growth',
]

export function RiskProfilePortfolioPanel() {
  const [activeRiskProfile, setActiveRiskProfile] =
    useState<RiskProfileName>('Balanced')

  const holdings = buildRiskProfilePortfolio(activeRiskProfile)
  const totalWeight = holdings.reduce(
    (total, holding) => total + holding.portfolioWeight,
    0
  )

  return (
    <section className="card">
      <div className="section">
        <p className="eyebrow">Risk Profile Portfolios</p>
        <h2>{activeRiskProfile} Model Portfolio</h2>
        <p className="muted">
          Review the generated model portfolio holdings for each risk category.
        </p>
      </div>

      <div className="workspace-tabs">
        {RISK_PROFILES.map((riskProfile) => (
          <button
            key={riskProfile}
            type="button"
            className={`workspace-tab ${
              activeRiskProfile === riskProfile ? 'active' : ''
            }`}
            onClick={() => setActiveRiskProfile(riskProfile)}
          >
            {riskProfile}
          </button>
        ))}
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span>Selected Profile</span>
          <strong>{activeRiskProfile}</strong>
        </div>

        <div className="kpi-card">
          <span>Holdings</span>
          <strong>{holdings.length}</strong>
        </div>

        <div className="kpi-card">
          <span>Total Weight</span>
          <strong>{totalWeight.toFixed(1)}%</strong>
        </div>

        <div className="kpi-card">
          <span>Status</span>
          <strong>Model</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Sector</th>
            <th>Code</th>
            <th>Name</th>
            <th>Role</th>
            <th>Sector Target</th>
            <th>Sector Split</th>
            <th>Portfolio Weight</th>
          </tr>
        </thead>

        <tbody>
          {holdings.map((holding) => (
            <tr key={`${activeRiskProfile}-${holding.code}`}>
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
    </section>
  )
}