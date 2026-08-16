'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ASSET_CLASSES,
  addCoreSecurity,
  fetchCoreSecurities,
  fetchRiskProfileWeights,
  removeCoreSecurity,
  updateCoreSecurityInClassWeight,
  updateCoreSecurityYield,
  updateRiskProfileAssetClassWeight,
  type CoreSecurity,
} from '../lib/engines/model-portfolio-core';
import { buildSecurityUniverse } from '../lib/engines/security-universe';
import { computePortfolioYield } from '../lib/engines/yield-aggregation';
import { stripExchangeSuffix } from '../lib/engines/security-lookup';
import type { RiskProfile } from '../lib/engines/model-portfolios';
import { useClientAdvice } from './ClientAdviceContext';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';
import AllocationPieChart from './AllocationPieChart';

// This is the house model itself, not a client-specific working copy.
// The securities in model_portfolio_securities are shared across every
// risk profile - editing a security here (add, remove, reweight within
// its asset class) changes it for all five profiles at once. Only each
// asset class's overall weight-of-portfolio is specific to the
// currently selected risk profile (risk_profile_asset_class_weights).
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

  const universe = useMemo(() => Array.from(buildSecurityUniverse().values()), []);

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

  function setHoldingWeightLocal(id: string, value: number) {
    setSecurities((prev) =>
      prev.map((s) => (s.id === id ? { ...s, inClassWeight: value } : s))
    );
  }

  function setHoldingYieldLocal(id: string, value: number | null) {
    setSecurities((prev) => prev.map((s) => (s.id === id ? { ...s, yield: value } : s)));
  }

  async function saveHoldingYield(id: string) {
    const sec = securities.find((s) => s.id === id);
    if (!sec) return;
    await withSaving(() => updateCoreSecurityYield(id, sec.yield));
  }

  async function saveHoldingWeight(id: string) {
    const sec = securities.find((s) => s.id === id);
    if (!sec || !Number.isFinite(sec.inClassWeight)) return;
    await withSaving(() => updateCoreSecurityInClassWeight(id, sec.inClassWeight));
  }

  async function handleRemove(sec: CoreSecurity) {
    const confirmed = window.confirm(
      `Remove ${sec.name} (${sec.code}) from the core model? This removes it from every risk profile, not just ${selectedRiskProfile}.`
    );
    if (!confirmed) return;
    const result = await withSaving(() => removeCoreSecurity(sec.id));
    if (result !== undefined || true) {
      setSecurities((prev) => prev.filter((s) => s.id !== sec.id));
    }
  }

  async function handleAdd(assetClassName: string, code: string) {
    if (!code) return;
    const candidate = universe.find((entry) => entry.code === code);
    if (!candidate) return;

    const added = await withSaving(() =>
      addCoreSecurity({
        assetClass: assetClassName,
        code: candidate.code,
        name: candidate.name,
        sector: candidate.sector,
        rationale: candidate.inSecurityMaster
          ? 'Added from the Approved List.'
          : 'Added manually.',
        inSecurityMaster: candidate.inSecurityMaster,
      })
    );
    if (added) {
      setSecurities((prev) => [...prev, added]);
    }
  }

  const [manualEntry, setManualEntry] = useState<
    Record<string, { code: string; name: string; yield: string }>
  >({});
  const [lookupState, setLookupState] = useState<
    Record<string, { loading: boolean; error: string | null; note: string | null }>
  >({});

  function updateManualEntry(assetClassName: string, field: 'code' | 'name' | 'yield', value: string) {
    setManualEntry((prev) => ({
      ...prev,
      [assetClassName]: { code: '', name: '', yield: '', ...prev[assetClassName], [field]: value },
    }));
  }

  async function handleLookup(assetClassName: string) {
    const rawCode = manualEntry[assetClassName]?.code?.trim();
    if (!rawCode) return;
    const code = stripExchangeSuffix(rawCode);

    setLookupState((prev) => ({ ...prev, [assetClassName]: { loading: true, error: null, note: null } }));
    try {
      const res = await fetch('/api/securities/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Lookup failed.');

      // Clean the code field itself too - the code that ends up saved
      // needs to be the bare ticker, or it won't match a client's actual
      // holding statement later on (which won't carry a ".ASX" suffix).
      setManualEntry((prev) => ({
        ...prev,
        [assetClassName]: {
          code,
          name: data.result.name ?? prev[assetClassName]?.name ?? '',
          yield:
            typeof data.result.yield === 'number'
              ? String(data.result.yield)
              : prev[assetClassName]?.yield ?? '',
        },
      }));

      const foundNothing = data.result.name === null && data.result.yield === null;
      setLookupState((prev) => ({
        ...prev,
        [assetClassName]: {
          loading: false,
          error: foundNothing
            ? `Couldn't find "${code}" — check the ticker, or fill in name and yield manually.`
            : null,
          note: data.result.yieldNote ?? null,
        },
      }));
    } catch (err) {
      setLookupState((prev) => ({
        ...prev,
        [assetClassName]: {
          loading: false,
          error: err instanceof Error ? err.message : 'Lookup failed.',
          note: null,
        },
      }));
    }
  }

  async function handleManualAdd(assetClassName: string) {
    const entry = manualEntry[assetClassName];
    const code = entry?.code ? stripExchangeSuffix(entry.code) : '';
    const name = entry?.name.trim();
    const yieldValue = entry?.yield?.trim();
    if (!code || !name) return;

    const added = await withSaving(() =>
      addCoreSecurity({
        assetClass: assetClassName,
        code,
        name,
        rationale: 'Added manually - not yet on the Approved List.',
        inSecurityMaster: false,
        yield: yieldValue ? parseFloat(yieldValue) : null,
      })
    );
    if (added) {
      setSecurities((prev) => [...prev, added]);
      setManualEntry((prev) => ({ ...prev, [assetClassName]: { code: '', name: '', yield: '' } }));
      setLookupState((prev) => ({ ...prev, [assetClassName]: { loading: false, error: null, note: null } }));
    }
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
        Securities and their in-class weightings are the shared core model —
        editing a holding here applies to every risk profile, not just{' '}
        {selectedRiskProfile}. Each asset class&apos;s overall weight of the
        portfolio is specific to {selectedRiskProfile} only. Every change
        saves automatically.
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
        {assetClasses.map((assetClass) => {
          const candidates = universe.filter(
            (entry) =>
              entry.assetClass === assetClass.name &&
              !assetClass.holdings.some((h) => h.code === entry.code)
          );

          const inClassTotal = round1(
            assetClass.holdings.reduce((total, h) => total + h.inClassWeight, 0)
          );
          const inClassOk = assetClass.holdings.length === 0 || Math.abs(inClassTotal - 100) < 0.15;

          return (
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
                      <button
                        type="button"
                        onClick={() => handleRemove(holding)}
                        style={removeButton}
                        aria-label={`Remove ${holding.name} from the core model`}
                      >
                        Remove
                      </button>
                    </div>
                    <p style={holdingRationale}>{holding.rationale}</p>
                    <div style={holdingWeightRow}>
                      <input
                        type="number"
                        step="0.1"
                        value={holding.inClassWeight}
                        onChange={(e) =>
                          setHoldingWeightLocal(holding.id, parseFloat(e.target.value))
                        }
                        onBlur={() => saveHoldingWeight(holding.id)}
                        style={holdingWeightInput}
                        aria-label={`${holding.name} weight within ${assetClass.name} (shared across all risk profiles)`}
                      />
                      <span style={weightPercentSign}>% of class (all profiles)</span>
                      <span style={overallWeightLabel}>
                        = {round1((assetClass.targetWeight * holding.inClassWeight) / 100)}%
                        of {selectedRiskProfile}
                      </span>
                    </div>
                    <div style={holdingWeightRow}>
                      <input
                        type="number"
                        step="0.1"
                        value={holding.yield ?? ''}
                        placeholder="—"
                        onChange={(e) =>
                          setHoldingYieldLocal(
                            holding.id,
                            e.target.value === '' ? null : parseFloat(e.target.value)
                          )
                        }
                        onBlur={() => saveHoldingYield(holding.id)}
                        style={holdingYieldInput}
                        aria-label={`${holding.name} yield`}
                      />
                      <span style={weightPercentSign}>% fwd. yield</span>
                    </div>
                  </li>
                ))}
                {assetClass.holdings.length === 0 && (
                  <p style={emptyText}>No securities in this asset class yet.</p>
                )}
              </ul>

              {assetClass.holdings.length > 0 && (
                <div style={inClassTotalRow}>
                  <span style={inClassTotalLabel}>Class total</span>
                  <span
                    style={{
                      ...inClassTotalValue,
                      color: inClassOk ? '#86efac' : '#fca5a5',
                    }}
                  >
                    {inClassTotal}%
                  </span>
                </div>
              )}

              {candidates.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    handleAdd(assetClass.name, e.target.value);
                    e.target.value = '';
                  }}
                  style={addSelect}
                >
                  <option value="" disabled>
                    + Add a security to {assetClass.name} (all risk profiles)
                  </option>
                  {candidates.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.code} — {entry.name}
                      {entry.inSecurityMaster ? ' (Approved List)' : ''}
                    </option>
                  ))}
                </select>
              )}

              <div style={manualAddRow}>
                <input
                  type="text"
                  placeholder="Code"
                  value={manualEntry[assetClass.name]?.code ?? ''}
                  onChange={(e) => updateManualEntry(assetClass.name, 'code', e.target.value)}
                  style={manualCodeInput}
                />
                <button
                  type="button"
                  onClick={() => handleLookup(assetClass.name)}
                  disabled={lookupState[assetClass.name]?.loading}
                  style={lookupButton}
                >
                  {lookupState[assetClass.name]?.loading ? 'Looking up…' : 'Look up'}
                </button>
                <input
                  type="text"
                  placeholder="Security name"
                  value={manualEntry[assetClass.name]?.name ?? ''}
                  onChange={(e) => updateManualEntry(assetClass.name, 'name', e.target.value)}
                  style={manualNameInput}
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Fwd yield %"
                  value={manualEntry[assetClass.name]?.yield ?? ''}
                  onChange={(e) => updateManualEntry(assetClass.name, 'yield', e.target.value)}
                  style={manualYieldInput}
                />
                <button
                  type="button"
                  onClick={() => handleManualAdd(assetClass.name)}
                  style={manualAddButton}
                >
                  Add
                </button>
              </div>
              {lookupState[assetClass.name]?.error && (
                <p style={lookupErrorText}>{lookupState[assetClass.name]?.error}</p>
              )}
              {lookupState[assetClass.name]?.note && (
                <p style={lookupNoteText}>{lookupState[assetClass.name]?.note}</p>
              )}
              {candidates.length === 0 && (
                <p style={emptyText}>
                  No suggested candidates on file for {assetClass.name} yet — add by code and name above.
                </p>
              )}
            </div>
          );
        })}
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
