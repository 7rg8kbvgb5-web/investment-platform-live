import { selectedModelIdFromCookies } from '../lib/model-context-server';
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
  const analytics = await getPortfolioAnalytics(undefined, await selectedModelIdFromCookies());
  const overall = diversificationLabel(analytics.overallDiversification);

  return (
    <>
      <StatusBox
        variant={analytics.connected && analytics.modelledCodes.length === 0 ? 'success' : 'warning'}
      >
        {!analytics.connected
          ? 'Illustrative — EODHD isn\u2019t connected, so every figure below uses modelled placeholder series, not real returns. Add EODHD_API_KEY to make this live.'
          : analytics.modelledCodes.length === 0
            ? `Live — every holding uses real EODHD price history (last 12 months, refreshed daily)${analytics.staleCodes.length ? `; ${analytics.staleCodes.join(', ')} from an earlier day's prices` : ''}.`
            : `Partly live — ${Object.keys(analytics.priceSources).length - analytics.modelledCodes.length} of ${Object.keys(analytics.priceSources).length} holdings use real EODHD price history. No price history was available for ${analytics.modelledCodes.join(', ')}, so their figures are modelled, not real${analytics.staleCodes.length ? `; ${analytics.staleCodes.join(', ')} use an earlier day\u2019s prices` : ''}. Price history is cached daily, so coverage fills in over the next few days on the free plan, or at once on the paid plan.`}
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
