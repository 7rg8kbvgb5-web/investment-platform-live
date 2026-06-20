import { sectorHealthScores } from '../lib/engines/sector-intelligence';
import { rankedSecurityRankings } from '../lib/engines/security-ranking';
import { buildSectorAllocations } from '../lib/engines/sector-allocation';

export function PortfolioConstructionAuditPanel() {
  const sectorScores = sectorHealthScores;
  const securityRankings = rankedSecurityRankings;
  const sectorAllocations = buildSectorAllocations();

  return (
    <section style={panel}>
      <h2 style={heading}>Portfolio Construction Audit</h2>
      <p style={description}>
        Explains how sector health scores, security rankings, and sector allocation recommendations flow into portfolio construction.
      </p>

      <div style={grid}>
        {sectorAllocations.map((sector) => {
          const health = sectorScores.find((item) => item.sector === sector.sector);

          const securities = securityRankings
            .filter((item) => item.sector === sector.sector)
            .sort((a, b) => b.totalScore - a.totalScore);

          const topSecurity = securities[0];

          return (
            <div key={sector.sector} style={card}>
              <div style={topRow}>
                <h3 style={sectorName}>{sector.sector}</h3>
                <span style={badge}>{sector.recommendation}</span>
              </div>

              <p style={line}>
                <strong>Sector Health Score:</strong> {health?.totalScore ?? 'N/A'}
              </p>

              <p style={line}>
                <strong>Target Sector Weight:</strong> {sector.adjustedWeight}%
              </p>

              <p style={line}>
                <strong>Top Ranked Security:</strong>{' '}
                {topSecurity ? `${topSecurity.name} (${topSecurity.code})` : 'N/A'}
              </p>

              <p style={line}>
                <strong>Security Score:</strong> {topSecurity?.totalScore ?? 'N/A'}
              </p>

              <p style={rationale}>
                Base sector weight of {sector.baseWeight}% adjusted by a multiplier of{' '}
                {sector.adjustmentMultiplier} due to a {sector.recommendation.toLowerCase()} sector signal.
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const panel = {
  marginBottom: '30px',
  padding: '28px',
  background: '#04142b',
  borderRadius: '18px',
  border: '1px solid #1e3a5f',
};

const heading = {
  margin: '0 0 8px',
  color: '#ffffff',
};

const description = {
  margin: '0 0 22px',
  color: '#9fb3c8',
};

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '18px',
};

const card = {
  padding: '18px',
  background: '#071b36',
  borderRadius: '14px',
  border: '1px solid #24476f',
};

const topRow = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'center',
  marginBottom: '12px',
};

const sectorName = {
  margin: 0,
  color: '#ffffff',
};

const badge = {
  padding: '5px 10px',
  borderRadius: '999px',
  background: '#123a63',
  color: '#d8ecff',
  fontSize: '12px',
  whiteSpace: 'nowrap' as const,
};

const line = {
  margin: '8px 0',
  color: '#cbd8e6',
};

const rationale = {
  marginTop: '14px',
  color: '#9fb3c8',
  fontSize: '14px',
  lineHeight: 1.5,
};