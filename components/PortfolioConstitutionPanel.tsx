'use client';

import { getModelPortfolioByRiskProfile } from '../lib/engines/model-portfolios';
import { useClientAdvice } from './ClientAdviceContext';
import Panel from './ui/Panel';

export function PortfolioConstitutionPanel() {
  const { selectedRiskProfile } = useClientAdvice();
  const portfolio = getModelPortfolioByRiskProfile(selectedRiskProfile);

  return (
    <Panel
      eyebrow={`${selectedRiskProfile} Model Portfolio`}
      title="Portfolio Constitution"
    >
      <p style={intro}>{portfolio.objective}</p>

      <div style={assetClassList}>
        {portfolio.assetClasses.map((assetClass) => (
          <div key={assetClass.name} style={assetClassCard}>
            <div style={assetClassHeader}>
              <h4 style={assetClassTitle}>{assetClass.name}</h4>
              <span style={typeBadge}>{assetClass.type}</span>
            </div>
            <p style={assetClassDescription}>{assetClass.description}</p>

            <ul style={holdingList}>
              {assetClass.holdings.map((holding) => (
                <li key={holding.code} style={holdingRow}>
                  <div style={holdingHeader}>
                    <span style={holdingCode}>{holding.code}</span>
                    <span style={holdingName}>{holding.name}</span>
                    {holding.sector && <span style={sectorTag}>{holding.sector}</span>}
                  </div>
                  <p style={holdingRationale}>{holding.rationale}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const intro = {
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  marginTop: '-8px',
  marginBottom: '16px',
  lineHeight: 1.5,
};

const assetClassList = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '14px',
};

const assetClassCard = {
  padding: '16px',
  background: '#12345b',
  borderRadius: '10px',
  border: '1px solid #2d4a6b',
};

const assetClassHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '10px',
};

const assetClassTitle = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 600,
};

const typeBadge = {
  flexShrink: 0,
  padding: '2px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#93c5fd',
};

const assetClassDescription = {
  margin: '6px 0 12px 0',
  fontSize: '13px',
  color: '#94a3b8',
  lineHeight: 1.5,
};

const holdingList = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

const holdingRow = {
  padding: '10px 12px',
  background: '#0b2342',
  borderRadius: '8px',
  border: '1px solid #1e3a5f',
};

const holdingHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap' as const,
};

const holdingCode = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const holdingName = {
  fontSize: '13px',
  color: '#cbd5e1',
};

const sectorTag = {
  marginLeft: 'auto',
  fontSize: '11px',
  color: '#94a3b8',
};

const holdingRationale = {
  margin: '4px 0 0 0',
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.4,
};
