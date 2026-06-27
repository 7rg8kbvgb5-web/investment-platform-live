import {
  buildRiskProfilePortfolio,
  type RiskProfileName,
} from '../lib/engines/risk-profile-portfolio'

interface Props {
  profile: RiskProfileName
}

export default function RiskProfileContent({ profile }: Props) {
  const holdings = buildRiskProfilePortfolio(profile)
  const totalWeight = holdings.reduce(
    (total, holding) => total + holding.portfolioWeight,
    0
  )

  return (
    <section className="card">
      <div className="section">
        <p className="eyebrow">Risk Profile Portfolio</p>
        <h2>{profile} Model Portfolio</h2>
        <p className="muted">
          Generated model portfolio holdings based on sector construction and risk profile weights.
        </p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span>Selected Profile</span>
          <strong>{profile}</strong>
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
            <tr key={`${profile}-${holding.code}`}>
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