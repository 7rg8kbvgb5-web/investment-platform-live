import { getPortfolioAnalytics } from '../lib/engines/portfolio-analytics';
import { HoldingLevelAnalyticsTabs } from './HoldingLevelAnalyticsTabs';
import CorrelationHeatmap from './CorrelationHeatmap';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';

function diversificationLabel(avgCorrelation: number): { label: string; color: string } {
  if (avgCorrelation < 0.3) return { label: 'Well diversified', color: '#86efac' };
  if (avgCorrelation < 0.6) return { label: 'Moderately diversified', color: '#fbbf24' };
  return { label: 'Concentrated - low dispersion', color: '#fca5a5' };
}

export default async function PortfolioAnalyticsPanel() {
  const analytics = await getPortfolioAnalytics();
  const overall = diversificationLabel(analytics.overallDiversification);

  return (
    <>
      <StatusBox variant={analytics.connected ? 'success' : 'warning'}>
        {analytics.connected
          ? 'Live — correlation, volatility and Sharpe ratios computed from EODHD historical prices (last 12 months).'
          : 'Illustrative — EODHD isn\u2019t connected yet, so these are modelled placeholder series (same asset-class structure real data would show), not real returns. Add EODHD_API_KEY to make this live.'}
      </StatusBox>

      <Panel eyebrow="Diversification" title="Correlation Dispersion">
        <p style={intro}>
          The headline diversification numbers — average pairwise correlation, portfolio-wide and
          by asset class. Lower is better spread; the heatmaps below break this down visually.
        </p>

        <div style={summaryGrid}>
          <div style={summaryCard}>
            <span style={summaryLabel}>Portfolio-wide</span>
            <strong style={{ ...summaryValue, color: overall.color }}>
              {analytics.overallDiversification.toFixed(2)}
            </strong>
            <p style={summaryNote}>{overall.label} · avg pairwise correlation</p>
          </div>
          {Object.entries(analytics.assetClassDiversification).map(([assetClass, value]) => {
            const status = diversificationLabel(value);
            return (
              <div key={assetClass} style={summaryCard}>
                <span style={summaryLabel}>{assetClass}</span>
                <strong style={{ ...summaryValue, color: status.color }}>{value.toFixed(2)}</strong>
                <p style={summaryNote}>{status.label}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel eyebrow="Diversification" title="Asset Class Correlation">
        <p style={intro}>
          Which asset classes actually move independently of each other, and which are
          effectively duplicating the same risk despite being labelled differently.
        </p>
        <CorrelationHeatmap
          codes={analytics.assetClassCorrelation.codes}
          matrix={analytics.assetClassCorrelation.matrix}
        />
      </Panel>

      <HoldingLevelAnalyticsTabs modelAnalytics={analytics} />
    </>
  );
}

const intro = {
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  marginTop: '-8px',
  marginBottom: '16px',
  lineHeight: 1.5,
};

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '12px',
};

const summaryCard = {
  padding: '14px',
  background: '#12345b',
  borderRadius: '10px',
  border: '1px solid #2d4a6b',
};

const summaryLabel = {
  fontSize: '11px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const summaryValue = {
  display: 'block',
  fontSize: '22px',
  margin: '6px 0 4px 0',
};

const summaryNote = {
  margin: 0,
  fontSize: '11px',
  color: '#94a3b8',
};
