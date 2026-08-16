'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ASSET_CLASSES,
  fetchCoreSecurities,
  fetchRiskProfileWeights,
  updateRiskProfileAssetClassWeight,
  type CoreSecurity,
} from '../lib/engines/model-portfolio-core';
import { computePortfolioYield } from '../lib/engines/yield-aggregation';
import type { RiskProfile } from '../lib/engines/model-portfolios';
import { useClientAdvice } from './ClientAdviceContext';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';
import AllocationPieChart from './AllocationPieChart';

// This is the weighting layer of the house model, per risk profile - NOT
// where securities themselves are added, removed, or given a yield. That
// happens once, on the Model Portfolio tab, and holds true across every
// profile. Here, two things are specific to whichever risk profile is
// selected: each asset class's overall weight of the portfolio, and each
// holding's weight within its asset class (in-class weight is shared
// across all five profiles by design - only the asset-class-level weight
// varies - so editing it here changes it everywhere, same as before).
// Every edit saves to Supabase immediately - there is no separate
// "model" to reset to, because this IS the model. Client-specific
// bespoke adjustments happen later, in Construction.

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

const OBJECTIVES: Record<string, string> = {
  Conservative:
    'Designed for investors prioritising capital stability, liquidity and income, with modest exposure to growth assets.',
  Moderate:
    'Designed for investors seeking moderate growth while retaining a meaningful allocation to defensive assets.',
  Balanced:
    'Designed for investors seeking a balance between long-term capital growth, income generation and downside risk management.',
  Growth:
    'Designed for investors seeking long-term capital growth, with a higher allocation to growth assets and tolerance for market volatility.',
  'High Growth':
    'Designed for investors with a long investment timeframe seeking maximum long-term growth and a high tolerance for volatility.',
};

export function PortfolioConstitutionPanel() {
  const { selectedRiskProfile } = useClientAdvice();

  const [securities, setSecurities] = useState<CoreSecurity[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingCount, setSavingCount] = useState(0);

  const load = useCallback(async (profile: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [secs, w] = await Promise.all([
        fetchCoreSecurities(),
        fetchRiskProfileWeights(profile as RiskProfile),
      ]);
      setSecurities(secs);
      setWeights(w);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load the model portfolio.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(selectedRiskProfile);
  }, [selectedRiskProfile, load]);

  async function withSaving<T>(action: () => Promise<T>): Promise<T | undefined> {
    setSavingCount((c) => c + 1);
    setSaveError(null);
    try {
      return await action();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.');
      return undefined;
    } finally {
      setSavingCount((c) => Math.max(0, c - 1));
    }
  }

  function setAssetClassWeightLocal(assetClassName: string, value: number) {
    setWeights((prev) => ({ ...prev, [assetClassName]: value }));
  }

  async function saveAssetClassWeight(assetClassName: string) {
    const value = weights[assetClassName];
    if (!Number.isFinite(value)) return;
    await withSaving(() =>
      updateRiskProfileAssetClassWeight(selectedRiskProfile as RiskProfile, assetClassName, value)
    );
  }

  const assetClasses = ASSET_CLASSES.map((meta) => ({
    ...meta,
    targetWeight: weights[meta.name] ?? 0,
    holdings: securities
      .filter((s) => s.assetClass === meta.name)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  }));

  const portfolioTotal = round1(
    assetClasses.reduce((total, ac) => total + ac.targetWeight, 0)
  );
  const portfolioOk = Math.abs(portfolioTotal - 100) < 0.15;

  // Weight-based yield rollup for the model itself - no dollar figures
  // here since this view isn't tied to any one client's portfolio value
  // (that happens in Construction, against the client's actual $).
  const yieldSummary = computePortfolioYield({
    riskProfile: selectedRiskProfile as RiskProfile,
    objective: '',
    growthWeight: 0,
    defensiveWeight: 0,
    assetClasses: assetClasses.map((ac) => ({
      name: ac.name,
      type: ac.type,
      targetWeight: ac.targetWeight,
      description: ac.description,
      holdings: ac.holdings.map((h) => ({
        code: h.code,
        name: h.name,
        sector: h.sector ?? undefined,
        weight: round1((ac.targetWeight * h.inClassWeight) / 100),
        rationale: h.rationale,
        yield: h.yield ?? undefined,
      })),
    })),
  });

  if (loading) {
    return (
      <Panel eyebrow={`${selectedRiskProfile} Model Portfolio`} title="Portfolio Constitution">
        <StatusBox variant="neutral" display="inline">
          Loading the core model portfolio…
        </StatusBox>
      </Panel>
    );
  }

  if (loadError) {
    return (
      <Panel eyebrow={`${selectedRiskProfile} Model Portfolio`} title="Portfolio Constitution">
        <StatusBox variant="error" display="inline">
          {loadError}
        </StatusBox>
      </Panel>
    );
  }

  return (
    <Panel
      eyebrow={`${selectedRiskProfile} Model Portfolio`}
      title="Portfolio Constitution"
      actions={
        savingCount > 0 ? (
          <span style={savingIndicator}>Saving…</span>
        ) : (
          <span style={savedIndicator}>Saved</span>
        )
      }
    >
      <p style={intro}>{OBJECTIVES[selectedRiskProfile] ?? ''}</p>

      <div style={yieldSummaryBox}>
        <div style={yieldSummaryHeader}>
          <span style={yieldSummaryTitle}>Forward Portfolio Yield ({selectedRiskProfile}, FY26/27)</span>
          <span style={yieldSummaryCoverage}>
            {yieldSummary.totalYieldCoveragePct}% of weight has a stated yield
          </span>
        </div>
        <div style={yieldSummaryValue}>
          {yieldSummary.totalBlendedYieldPct !== null
            ? `${yieldSummary.totalBlendedYieldPct}% blended`
            : 'No yield data yet'}
        </div>
        <div style={yieldClassGrid}>
          {yieldSummary.assetClasses
            .filter((ac) => ac.weight > 0)
            .map((ac) => (
              <div key={ac.assetClass} style={yieldClassChip}>
                <span style={yieldClassChipName}>{ac.assetClass}</span>
                <span style={yieldClassChipValue}>
                  {ac.blendedYieldPct !== null ? `${ac.blendedYieldPct}%` : '—'}
                </span>
              </div>
            ))}
        </div>
      </div>

      <StatusBox variant="neutral" display="inline">
        Asset allocation only — each asset class&apos;s overall weight of the
        portfolio for {selectedRiskProfile}. The securities themselves and
        their specific investment weightings are managed on the Model
        Portfolio tab and are shared across every risk profile. Every
        change here saves automatically.
      </StatusBox>

      {saveError && (
        <StatusBox variant="error" display="inline">
          {saveError}
        </StatusBox>
      )}

      <div style={overviewRow}>
        <div style={overviewTableCol}>
          <div style={portfolioTotalRow}>
            <span style={portfolioTotalLabel}>Portfolio total (asset classes)</span>
            <span style={{ ...portfolioTotalValue, color: portfolioOk ? '#86efac' : '#fca5a5' }}>
              {portfolioTotal}%
            </span>
          </div>

          <table style={overviewTable}>
            <thead>
              <tr>
                <th style={overviewTh}>Asset Class</th>
                <th style={overviewThRight}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {assetClasses.map((assetClass) => (
                <tr key={assetClass.name}>
                  <td style={overviewTd}>{assetClass.name}</td>
                  <td style={overviewTdRight}>{assetClass.targetWeight}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={overviewChartCol}>
          <AllocationPieChart
            allocations={assetClasses.map((ac) => ({
              asset_class: ac.name,
              target_weight: ac.targetWeight,
            }))}
          />
        </div>
      </div>

      <div style={assetClassList}>
        {assetClasses.map((assetClass) => (
          <div key={assetClass.name} style={assetClassCard}>
            <div style={assetClassHeader}>
              <h4 style={assetClassTitle}>{assetClass.name}</h4>
              <span style={typeBadge}>{assetClass.type}</span>
              <div style={assetClassWeightControl}>
                <input
                  type="number"
                  step="0.1"
                  value={assetClass.targetWeight}
                  onChange={(e) =>
                    setAssetClassWeightLocal(assetClass.name, parseFloat(e.target.value))
                  }
                  onBlur={() => saveAssetClassWeight(assetClass.name)}
                  style={assetClassWeightInput}
                  aria-label={`${assetClass.name} weight of overall portfolio for ${selectedRiskProfile}`}
                />
                <span style={weightPercentSign}>% of portfolio ({selectedRiskProfile})</span>
              </div>
            </div>
            <p style={assetClassDescription}>{assetClass.description}</p>

            <ul style={holdingList}>
              {assetClass.holdings.map((holding) => (
                <li key={holding.id} style={holdingRow}>
                  <div style={holdingHeader}>
                    <span style={holdingCode}>{holding.code}</span>
                    <span style={holdingName}>{holding.name}</span>
                    {holding.sector && <span style={sectorTag}>{holding.sector}</span>}
                    <span style={holdingYieldTag}>
                      {typeof holding.yield === 'number' ? `${holding.yield}% fwd. yield` : 'No yield set'}
                    </span>
                  </div>
                  <p style={holdingRationale}>{holding.rationale}</p>
                  <div style={holdingWeightRow}>
                    <span style={readOnlyWeightTag}>{holding.inClassWeight}% of class</span>
                    <span style={overallWeightLabel}>
                      = {round1((assetClass.targetWeight * holding.inClassWeight) / 100)}%
                      of {selectedRiskProfile}
                    </span>
                  </div>
                </li>
              ))}
              {assetClass.holdings.length === 0 && (
                <p style={emptyText}>
                  No securities in this asset class yet — add them on the Model
                  Portfolio tab.
                </p>
              )}
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
  marginBottom: '12px',
  lineHeight: 1.5,
};

const savingIndicator = {
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  background: '#3f2b12',
  border: '1px solid #f59e0b',
  color: '#fbbf24',
};

const savedIndicator = {
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  background: '#0f3d2e',
  border: '1px solid #10b981',
  color: '#86efac',
};

const portfolioTotalRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  marginTop: '10px',
  background: '#0b2342',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const portfolioTotalLabel = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#94a3b8',
};

const portfolioTotalValue = {
  fontSize: '13px',
  fontWeight: 700,
};

const assetClassList = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '14px',
  marginTop: '16px',
};

const overviewRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '20px',
  marginTop: '10px',
  alignItems: 'stretch',
};

const overviewTableCol = {
  flex: '1 1 320px',
  minWidth: '280px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '10px',
};

const overviewChartCol = {
  flex: '1 1 340px',
  minWidth: '300px',
};

const overviewTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  background: '#0b2342',
  borderRadius: '8px',
  overflow: 'hidden',
  border: '1px solid #2d4a6b',
};

const overviewTh = {
  textAlign: 'left' as const,
  padding: '8px 12px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  borderBottom: '1px solid #2d4a6b',
};

const overviewThRight = {
  ...overviewTh,
  textAlign: 'right' as const,
};

const overviewTd = {
  padding: '8px 12px',
  fontSize: '13px',
  color: '#e2e8f0',
  borderBottom: '1px solid #1e3a5f',
};

const overviewTdRight = {
  ...overviewTd,
  textAlign: 'right' as const,
  fontWeight: 700,
};

const assetClassCard = {
  padding: '16px',
  background: '#12345b',
  borderRadius: '10px',
  border: '1px solid #2d4a6b',
};

const assetClassHeader = {
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap' as const,
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

const assetClassWeightControl = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginLeft: 'auto',
};

const assetClassWeightInput = {
  width: '64px',
  padding: '5px 8px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 700,
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const weightPercentSign = {
  fontSize: '11px',
  color: '#94a3b8',
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
  fontSize: '11px',
  color: '#94a3b8',
};

const holdingYieldTag = {
  marginLeft: 'auto',
  fontSize: '11px',
  fontWeight: 600,
  color: '#4ade80',
};

const removeButton = {
  marginLeft: 'auto',
  padding: '3px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: '#4a1520',
  border: '1px solid #ef4444',
  color: '#fca5a5',
  cursor: 'pointer',
};

const holdingRationale = {
  margin: '4px 0 0 0',
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.4,
};

const holdingWeightRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexWrap: 'wrap' as const,
  marginTop: '8px',
};

const holdingWeightInput = {
  width: '60px',
  padding: '5px 8px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 700,
  background: '#12345b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const overallWeightLabel = {
  fontSize: '11px',
  color: '#93c5fd',
  fontWeight: 600,
};

const readOnlyWeightTag = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#94a3b8',
};

const inClassTotalRow = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  marginTop: '10px',
  paddingTop: '8px',
  borderTop: '1px dashed #2d4a6b',
};

const inClassTotalLabel = {
  fontSize: '11px',
  color: '#94a3b8',
};

const inClassTotalValue = {
  fontSize: '12px',
  fontWeight: 700,
};

const emptyText = {
  margin: 0,
  fontSize: '12px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
};

const addSelect = {
  marginTop: '10px',
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const manualAddRow = {
  display: 'flex',
  gap: '8px',
  marginTop: '10px',
};

const manualCodeInput = {
  width: '90px',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const manualNameInput = {
  flex: 1,
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const manualAddButton = {
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  background: '#0f3d2e',
  border: '1px solid #10b981',
  color: '#86efac',
  cursor: 'pointer',
};

const holdingYieldInput = {
  width: '60px',
  padding: '5px 8px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 700,
  background: '#12345b',
  border: '1px solid #2d4a6b',
  color: '#4ade80',
};

const lookupButton = {
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  background: '#0b2447',
  border: '1px solid #60a5fa',
  color: '#93c5fd',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
};

const manualYieldInput = {
  width: '80px',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#4ade80',
};

const lookupErrorText = {
  margin: '6px 0 0',
  fontSize: '11px',
  color: '#fca5a5',
};

const lookupNoteText = {
  margin: '6px 0 0',
  fontSize: '11px',
  color: '#64748b',
  fontStyle: 'italic' as const,
};

const yieldSummaryBox = {
  padding: '12px 14px',
  borderRadius: '10px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  marginBottom: '16px',
};

const yieldSummaryHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
};

const yieldSummaryTitle = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#93c5fd',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.03em',
};

const yieldSummaryCoverage = {
  fontSize: '11px',
  color: '#64748b',
};

const yieldSummaryValue = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#4ade80',
  marginTop: '4px',
};

const yieldClassGrid = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '8px',
  marginTop: '10px',
};

const yieldClassChip = {
  display: 'flex',
  flexDirection: 'column' as const,
  padding: '6px 10px',
  borderRadius: '8px',
  background: '#04142b',
  border: '1px solid #1e3a5f',
  minWidth: '110px',
};

const yieldClassChipName = {
  fontSize: '10px',
  color: '#94a3b8',
};

const yieldClassChipValue = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
};
