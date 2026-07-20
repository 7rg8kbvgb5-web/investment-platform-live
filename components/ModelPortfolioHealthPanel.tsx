'use client';

import { analyzeModelPortfolioHealth } from '../lib/engines/model-portfolio-health';
import { useClientAdvice } from './ClientAdviceContext';

const STATUS_LABEL: Record<string, string> = {
  challenger: 'Challenger',
  'not-assessed': 'Not assessed',
};

const STATUS_COLOR: Record<string, string> = {
  challenger: '#fbbf24',
  'not-assessed': '#94a3b8',
};

export default function ModelPortfolioHealthPanel() {
  const { selectedRiskProfile } = useClientAdvice();
  const health = analyzeModelPortfolioHealth(selectedRiskProfile);

  return (
    <section style={hero}>
      <div style={copy}>
        <p style={eyebrow}>{selectedRiskProfile} Model Portfolio</p>
        <h1 style={title}>Model Portfolio Health</h1>
        <p style={subtitle}>
          Whether the securities currently in this model portfolio are the
          best available investment within their asset class.
        </p>
      </div>

      <div style={kpiGrid}>
        <div style={kpi}>
          <span style={kpiLabel}>Health Score</span>
          <strong style={kpiValue}>{health.healthScore}%</strong>
          <p style={kpiNote}>Holdings confirmed best-in-class</p>
        </div>

        <div style={kpi}>
          <span style={kpiLabel}>Champions</span>
          <strong style={kpiValue}>{health.championCount}</strong>
          <p style={kpiNote}>of {health.totalHoldings} holdings</p>
        </div>

        <div style={kpi}>
          <span style={kpiLabel}>Challengers</span>
          <strong style={kpiValue}>{health.challengerCount}</strong>
          <p style={kpiNote}>Under review vs. current champion</p>
        </div>

        <div style={kpi}>
          <span style={kpiLabel}>Not Assessed</span>
          <strong style={kpiValue}>{health.notAssessedCount}</strong>
          <p style={kpiNote}>No best-in-class confirmation yet</p>
        </div>
      </div>

      {health.actionItems.length > 0 && (
        <div style={actionSection}>
          <h4 style={actionTitle}>Actionable in this portfolio</h4>
          <ul style={actionList}>
            {health.actionItems.map((item) => (
              <li key={item.code} style={actionRow}>
                <div style={actionRowHeader}>
                  <span style={actionCode}>{item.code}</span>
                  <span style={actionName}>{item.name}</span>
                  <span style={{ ...actionBadge, color: STATUS_COLOR[item.status], borderColor: STATUS_COLOR[item.status] }}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <p style={actionDetail}>
                  {item.assetClass} · {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const hero = {
  marginBottom: '25px',
  padding: '26px 30px',
  background: '#0b2342',
  borderRadius: '18px',
  border: '1px solid #2d4a6b',
};

const copy = {
  marginBottom: '20px',
};

const eyebrow = {
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  color: '#8fb7e8',
  fontSize: '13px',
  marginBottom: '8px',
};

const title = {
  fontSize: '28px',
  margin: '0 0 8px 0',
};

const subtitle = {
  fontSize: '15px',
  maxWidth: '760px',
  opacity: 0.85,
  lineHeight: 1.5,
  margin: 0,
};

const kpiGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '14px',
};

const kpi = {
  padding: '14px',
  background: '#12345b',
  borderRadius: '10px',
  border: '1px solid #2d4a6b',
};

const kpiLabel = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const kpiValue = {
  display: 'block',
  fontSize: '26px',
  margin: '6px 0 4px 0',
};

const kpiNote = {
  margin: 0,
  fontSize: '12px',
  color: '#94a3b8',
};

const actionSection = {
  marginTop: '22px',
  paddingTop: '18px',
  borderTop: '1px solid #1e3a5f',
};

const actionTitle = {
  margin: '0 0 12px 0',
  fontSize: '14px',
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const actionList = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

const actionRow = {
  padding: '10px 12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const actionRowHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap' as const,
};

const actionCode = {
  fontSize: '13px',
  fontWeight: 700,
};

const actionName = {
  fontSize: '13px',
  color: '#cbd5e1',
};

const actionBadge = {
  marginLeft: 'auto',
  padding: '2px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  border: '1px solid',
  background: '#0b2342',
};

const actionDetail = {
  margin: '4px 0 0 0',
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.4,
};
