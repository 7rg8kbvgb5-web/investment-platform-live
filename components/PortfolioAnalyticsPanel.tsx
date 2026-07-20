import { getPortfolioAnalytics } from '../lib/engines/portfolio-analytics';
import CorrelationHeatmap from './CorrelationHeatmap';
import RiskReturnScatterChart from './RiskReturnScatterChart';
import SharpeRankingChart from './SharpeRankingChart';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';

function diversificationLabel(avgCorrelation: number): { label: string; color: string } {
  if (avgCorrelation < 0.3) return { label: 'Well diversified', color: '#86efac' };
  if (avgCorrelation < 0.6) return { label: 'Moderately diversified', color: '#fbbf24' };
  return { label: 'Concentrated - low dispersion', color: '#fca5a5' };
}

export default async function PortfolioAnalyticsPanel() {
  const analytics = await getPortfolioAnalytics();
  const nameByCode = new Map(analytics.holdings.map((h) => [h.code, h.name]));
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
          How much the securities in this portfolio move together. Lower
          average correlation means more genuine diversification and a
          smoother return profile across the risk profile.
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
          Correlation between asset classes. Asset classes near +1 rise and
          fall together, offering little diversification benefit between
          them; values near 0 or negative smooth the overall return.
        </p>
        <CorrelationHeatmap
          codes={analytics.assetClassCorrelation.codes}
          matrix={analytics.assetClassCorrelation.matrix}
        />
      </Panel>

      <Panel eyebrow="Diversification" title="Holding-Level Correlation">
        <p style={intro}>
          Correlation between the individual securities across every asset
          class. Clusters of high correlation within an asset class suggest
          redundant exposure worth reviewing.
        </p>
        <CorrelationHeatmap
          codes={analytics.holdingCorrelation.codes}
          matrix={analytics.holdingCorrelation.matrix}
          labels={Object.fromEntries(nameByCode)}
        />
      </Panel>

      <Panel eyebrow="Risk-Adjusted Return" title="Risk vs. Return by Holding">
        <p style={intro}>
          Each point is a security - volatility on the x-axis, annualised
          return on the y-axis, coloured by asset class. Look for holdings
          sitting below others in the same colour: same or more risk for
          less return is the clearest sign a better-in-class alternative is
          worth researching.
        </p>
        <RiskReturnScatterChart holdings={analytics.holdings} />
      </Panel>

      <Panel eyebrow="Risk-Adjusted Return" title="Sharpe Ratio Ranking">
        <p style={intro}>
          Return earned per unit of risk taken, ranked highest to lowest.
          The most direct single number for comparing whether a security is
          pulling its weight on a risk-adjusted basis.
        </p>
        <SharpeRankingChart holdings={analytics.holdings} />
      </Panel>
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
