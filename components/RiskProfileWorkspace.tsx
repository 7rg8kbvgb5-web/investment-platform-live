'use client'

import { useState } from 'react'
import {
  buildRiskProfilePortfolio,
  type RiskProfileName,
} from '../lib/engines/risk-profile-portfolio'

const profiles: RiskProfileName[] = [
  'Conservative',
  'Moderate',
  'Balanced',
  'Growth',
  'High Growth',
]

export default function RiskProfileWorkspace() {
  const [selectedProfile, setSelectedProfile] =
    useState<RiskProfileName>('Balanced')

  const holdings = buildRiskProfilePortfolio(selectedProfile)

  const totalWeight = holdings.reduce(
    (total, holding) => total + holding.portfolioWeight,
    0
  )

  return (
    <section className="card">
      <div className="section">
        <p className="eyebrow">Risk Profile Portfolios</p>
        <h2>{selectedProfile} Model Portfolio</h2>
        <p className="muted">
          Select a model portfolio to review its holdings, sector exposure and portfolio weights.
        </p>
      </div>

      <div className="risk-tabs">
  {profiles.map((profile) => (
    <button
      key={profile}
      type="button"
      className={`risk-tab ${selectedProfile === profile ? 'active' : ''}`}
      onClick={() => setSelectedProfile(profile)}
    >
      {profile}
    </button>
  ))}
</div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span>Selected Profile</span>
          <strong>{selectedProfile}</strong>
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
            <tr key={`${selectedProfile}-${holding.code}`}>
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