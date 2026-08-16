'use client';

import { useEffect, useState } from 'react';
import type { PortfolioAnalytics } from '../lib/engines/portfolio-analytics';
import CorrelationHeatmap from './CorrelationHeatmap';
import RiskReturnScatterChart from './RiskReturnScatterChart';
import SharpeRankingChart from './SharpeRankingChart';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';

// Switches Holding-Level Correlation, Risk vs. Return by Holding, and
// Sharpe Ratio Ranking between the model portfolio's own holdings and
// the resulting/recommended holdings from whichever client review was
// most recently worked on in Construction - so an adviser can compare
// "the house model" against "what I'm actually proposing this client"
// on the same risk-adjusted terms.

type Tab = 'model' | 'recommended';

const intro = {
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  marginTop: '-8px',
  marginBottom: '16px',
  lineHeight: 1.5,
};

export function HoldingLevelAnalyticsTabs({ modelAnalytics }: { modelAnalytics: PortfolioAnalytics }) {
  const [activeTab, setActiveTab] = useState<Tab>('model');
  const [recommendedAnalytics, setRecommendedAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [recommendedClientName, setRecommendedClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics/recommended-portfolio')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setRecommendedAnalytics(data.analytics);
          setRecommendedClientName(data.clientName);
        } else {
          setLoadError(data.error ?? 'Failed to load recommended portfolio analytics.');
        }
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load.'))
      .finally(() => setLoading(false));
  }, []);

  const activeAnalytics = activeTab === 'model' ? modelAnalytics : recommendedAnalytics;
  const nameByCode = new Map((activeAnalytics?.holdings ?? []).map((h) => [h.code, h.name]));

  return (
    <>
      <div style={tabBar}>
        <button
          type="button"
          style={activeTab === 'model' ? tabButtonActive : tabButton}
          onClick={() => setActiveTab('model')}
        >
          Model Portfolio
        </button>
        <button
          type="button"
          style={activeTab === 'recommended' ? tabButtonActive : tabButton}
          onClick={() => setActiveTab('recommended')}
        >
          Recommended Portfolio{recommendedClientName ? ` — ${recommendedClientName}` : ''}
        </button>
      </div>

      {activeTab === 'recommended' && loading ? (
        <StatusBox variant="neutral">Loading the recommended portfolio…</StatusBox>
      ) : activeTab === 'recommended' && loadError ? (
        <StatusBox variant="error">{loadError}</StatusBox>
      ) : activeTab === 'recommended' && !recommendedAnalytics ? (
        <StatusBox variant="neutral">
          No client review in progress yet — upload or resume a client on the Construction tab to see
          their recommended portfolio&apos;s analytics here.
        </StatusBox>
      ) : activeAnalytics ? (
        <>
          <Panel eyebrow="Diversification" title="Holding-Level Correlation">
            <p style={intro}>
              The same question one level down, at the individual security: spot specific holdings
              that are redundant with each other, inside or across an asset class.
            </p>
            <CorrelationHeatmap
              codes={activeAnalytics.holdingCorrelation.codes}
              matrix={activeAnalytics.holdingCorrelation.matrix}
              labels={Object.fromEntries(nameByCode)}
            />
          </Panel>

          <Panel eyebrow="Risk-Adjusted Return" title="Risk vs. Return by Holding">
            <p style={intro}>
              Each point is a security - volatility on the x-axis, annualised return on the y-axis,
              coloured by asset class. Look for holdings sitting below others in the same colour: same or
              more risk for less return is the clearest sign a better-in-class alternative is worth
              researching.
            </p>
            <RiskReturnScatterChart holdings={activeAnalytics.holdings} />
          </Panel>

          <Panel eyebrow="Risk-Adjusted Return" title="Sharpe Ratio Ranking">
            <p style={intro}>
              Return earned per unit of risk taken, ranked highest to lowest. The most direct single number
              for comparing whether a security is pulling its weight on a risk-adjusted basis.
            </p>
            <SharpeRankingChart holdings={activeAnalytics.holdings} />
          </Panel>
        </>
      ) : null}
    </>
  );
}

const tabBar = {
  display: 'flex',
  gap: '10px',
  marginTop: '28px',
  marginBottom: '18px',
};

const tabButton = {
  padding: '8px 16px',
  borderRadius: '999px',
  fontSize: '13px',
  fontWeight: 700,
  background: '#0b1f3a',
  border: '1px solid #2b5c95',
  color: '#bfdbfe',
  cursor: 'pointer',
};

const tabButtonActive = {
  ...tabButton,
  background: '#2563eb',
  border: '1px solid #60a5fa',
  color: '#ffffff',
};
