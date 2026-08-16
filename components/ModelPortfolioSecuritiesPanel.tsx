'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ASSET_CLASSES,
  addCoreSecurity,
  fetchCoreSecurities,
  removeCoreSecurity,
  updateCoreSecurityInClassWeight,
  updateCoreSecurityYield,
  type CoreSecurity,
} from '../lib/engines/model-portfolio-core';
import { buildSecurityUniverse, type SecurityUniverseEntry } from '../lib/engines/security-universe';
import { stripExchangeSuffix } from '../lib/engines/security-lookup';
import { computeConvictionRating, type ConvictionRating } from '../lib/engines/conviction-rating';
import type { TacticalAssetClassView } from '../lib/engines/tactical-asset-view';
import { averagePairwiseCorrelation } from '../lib/engines/portfolio-statistics';
import type { PortfolioAnalytics } from '../lib/engines/portfolio-analytics';
import {
  HoldingMetricGrid,
  HoldingMetricCell,
  holdingMetricInput,
} from './ui/HoldingMetricGrid';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';
import AllocationPieChart from './AllocationPieChart';

// This is the model portfolio itself - the one, static list of which
// securities belong in which asset class. It holds true across every
// risk profile; nothing here is risk-profile-specific and there are no
// weightings on this page at all. Weighting (both each asset class's
// overall % of a given risk profile, and each holding's % within its
// asset class) is set on the Risk Profile tab, per profile - this tab
// only ever answers "what's in the model", not "how much of it".

export function ModelPortfolioSecuritiesPanel() {
  const [securities, setSecurities] = useState<CoreSecurity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingCount, setSavingCount] = useState(0);
  const [convictions, setConvictions] = useState<Record<string, ConvictionRating>>({});
  const [convictionsLoading, setConvictionsLoading] = useState(true);
  const [universe, setUniverse] = useState<SecurityUniverseEntry[]>([]);
  const [tacticalView, setTacticalView] = useState<TacticalAssetClassView | null>(null);
  const [tacticalScanning, setTacticalScanning] = useState(false);
  const [tacticalError, setTacticalError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics/portfolio')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setAnalytics(data.analytics);
        else setAnalyticsError(data.error ?? 'Failed to load correlation data.');
      })
      .catch((err) => setAnalyticsError(err instanceof Error ? err.message : 'Failed to load correlation data.'))
      .finally(() => setAnalyticsLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/tactical-view/latest')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setTacticalView(data.view);
      })
      .catch(() => {
        // Non-critical background load - the "Run scan" button still works either way.
      });
  }, []);

  async function runTacticalScan() {
    setTacticalScanning(true);
    setTacticalError(null);
    try {
      const res = await fetch('/api/tactical-view/run-now', { method: 'POST' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Scan failed.');
      setTacticalView(data.view);
    } catch (err) {
      setTacticalError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setTacticalScanning(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchCoreSecurities()
      .then((secs) => {
        if (!cancelled) setSecurities(secs);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load the model portfolio.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    buildSecurityUniverse().then((map) => {
      if (!cancelled) setUniverse(Array.from(map.values()));
    });
    return () => {
      cancelled = true;
    };
  }, [securities]);

  useEffect(() => {
    if (securities.length === 0) return;
    let cancelled = false;
    Promise.all(
      securities.map(async (s) => {
        try {
          const rating = await computeConvictionRating(s.code);
          return [s.code, rating] as const;
        } catch {
          return [s.code, { houseView: null, convictionScore: null, sources: [] }] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setConvictions(Object.fromEntries(results));
      setConvictionsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [securities]);

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

  function setHoldingYieldLocal(id: string, value: number | null) {
    setSecurities((prev) => prev.map((s) => (s.id === id ? { ...s, yield: value } : s)));
  }

  async function saveHoldingYield(id: string) {
    const sec = securities.find((s) => s.id === id);
    if (!sec) return;
    await withSaving(() => updateCoreSecurityYield(id, sec.yield));
  }

  function setHoldingWeightLocal(id: string, value: number) {
    setSecurities((prev) => prev.map((s) => (s.id === id ? { ...s, inClassWeight: value } : s)));
  }

  async function saveHoldingWeight(id: string) {
    const sec = securities.find((s) => s.id === id);
    if (!sec || !Number.isFinite(sec.inClassWeight)) return;
    await withSaving(() => updateCoreSecurityInClassWeight(id, sec.inClassWeight));
  }

  async function handleRemove(sec: CoreSecurity) {
    const confirmed = window.confirm(
      `Remove ${sec.name} (${sec.code}) from the model portfolio? This removes it from every risk profile.`
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
    holdings: securities
      .filter((s) => s.assetClass === meta.name)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  }));

  // --- Top-of-page visuals: security counts and yield coverage, since
  // there's no weighting on this page to build a $ or % picture from. ---
  const totalSecurities = securities.length;
  const securitiesWithYield = securities.filter((s) => typeof s.yield === 'number');
  const averageForwardYield =
    securitiesWithYield.length > 0
      ? round1(securitiesWithYield.reduce((sum, s) => sum + (s.yield ?? 0), 0) / securitiesWithYield.length)
      : null;
  const yieldCoveragePct =
    totalSecurities > 0 ? round1((securitiesWithYield.length / totalSecurities) * 100) : 0;

  const securitiesWithConviction = securities.filter(
    (s) => convictions[s.code]?.convictionScore !== null && convictions[s.code] !== undefined,
  );
  const convictionCoveragePct =
    totalSecurities > 0 ? round1((securitiesWithConviction.length / totalSecurities) * 100) : 0;

  const assetClassesWithWeightIssues = assetClasses.filter((ac) => {
    if (ac.holdings.length === 0) return false;
    const total = round1(ac.holdings.reduce((sum, h) => sum + h.inClassWeight, 0));
    return Math.abs(total - 100) >= 0.15;
  }).length;

  const sectorCounts = new Map<string, number>();
  for (const sec of securities) {
    const sector = sec.sector ?? 'Unclassified';
    sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);
  }
  const sectorBreakdown = Array.from(sectorCounts.entries()).map(([sector, count]) => ({
    asset_class: sector,
    target_weight: count,
  }));

  if (loading) {
    return (
      <Panel eyebrow="Shared across every risk profile" title="Model Portfolio">
        <StatusBox variant="neutral" display="inline">
          Loading the model portfolio…
        </StatusBox>
      </Panel>
    );
  }

  if (loadError) {
    return (
      <Panel eyebrow="Shared across every risk profile" title="Model Portfolio">
        <StatusBox variant="error" display="inline">
          {loadError}
        </StatusBox>
      </Panel>
    );
  }

  return (
    <Panel
      eyebrow="Shared across every risk profile"
      title="Model Portfolio"
      actions={
        savingCount > 0 ? (
          <span style={savingIndicator}>Saving…</span>
        ) : (
          <span style={savedIndicator}>Saved</span>
        )
      }
    >
      <p style={intro}>
        The master list of specific investment weightings — which securities
        make up the model, by asset class, and how much of its asset class
        each one carries. This is static and holds true across all five risk
        profiles. Asset allocation (how much of the overall portfolio each
        asset class carries) is set per risk profile on the Risk Profile tab.
      </p>

      {saveError && (
        <StatusBox variant="error" display="inline">
          {saveError}
        </StatusBox>
      )}

      <div style={statsRow}>
        <div style={statBoxThin}>
          <span style={statLabel}>Securities</span>
          <span style={statValue}>{totalSecurities}</span>
        </div>
        <div style={statBoxThin}>
          <span style={statLabel}>Asset classes</span>
          <span style={statValue}>{assetClasses.filter((ac) => ac.holdings.length > 0).length}</span>
        </div>
        <div style={statBoxThin}>
          <span style={statLabel}>Avg. fwd yield</span>
          <span style={statValue}>{averageForwardYield !== null ? `${averageForwardYield}%` : '—'}</span>
        </div>
        <div style={statBoxThin}>
          <span style={statLabel}>Yield coverage</span>
          <span style={statValue}>{yieldCoveragePct}%</span>
        </div>
        <div style={statBoxThin}>
          <span style={statLabel}>Conviction coverage</span>
          <span style={statValue}>{convictionsLoading ? '…' : `${convictionCoveragePct}%`}</span>
        </div>
        <div style={statBoxThin}>
          <span style={statLabel}>Weight issues</span>
          <span
            style={{
              ...statValue,
              color: assetClassesWithWeightIssues === 0 ? '#4ade80' : '#fca5a5',
            }}
          >
            {assetClassesWithWeightIssues}
          </span>
        </div>
        <div style={tacticalTableBox}>
          <div style={tacticalTableBoxHeader}>
            <span style={statLabel}>Live Global Asset Class View</span>
            <div style={tacticalHeaderRight}>
              {tacticalView && (
                <span style={tacticalTimestamp}>
                  {new Date(tacticalView.generatedAt).toLocaleString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <button
                type="button"
                onClick={runTacticalScan}
                disabled={tacticalScanning}
                style={tacticalScanButton}
              >
                {tacticalScanning ? '…' : 'Run scan'}
              </button>
            </div>
          </div>
          {tacticalError && (
            <StatusBox variant="error" display="inline">
              {tacticalError}
            </StatusBox>
          )}
          {!tacticalView && !tacticalError ? (
            <p style={emptyText}>No scan run yet.</p>
          ) : (
            <table style={tacticalTable}>
              <tbody>
                {tacticalView?.calls.map((call) => (
                  <tr key={call.assetClass} title={call.rationale}>
                    <td style={tacticalTableTd}>{call.assetClass}</td>
                    <td style={tacticalTableTdRight}>
                      <span style={tacticalStanceTag(call.stance)}>{call.stance}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={correlationBox}>
        <div style={correlationBoxHeader}>
          <span style={statLabel}>Model Portfolio Correlation Rating</span>
          {analytics && !analytics.connected && (
            <span style={illustrativeTag}>Illustrative — connect EODHD for live data</span>
          )}
        </div>
        {analyticsLoading ? (
          <p style={emptyText}>Loading correlation data…</p>
        ) : analyticsError ? (
          <p style={emptyText}>{analyticsError}</p>
        ) : analytics && analytics.assetClassCorrelation.codes.length > 1 ? (
          (() => {
            const avgCorrelation = averagePairwiseCorrelation(analytics.assetClassCorrelation.matrix);
            const rating = Math.max(0, Math.round(100 - Math.abs(avgCorrelation) * 100));
            const ratingColor = rating >= 70 ? '#4ade80' : rating >= 40 ? '#fbbf24' : '#fca5a5';
            return (
              <div style={correlationContent}>
                <span style={{ ...correlationRatingValue, color: ratingColor }}>{rating}/100</span>
                <span style={correlationSubtext}>
                  Average cross-asset-class correlation: {avgCorrelation.toFixed(2)} (0 = a
                  perfectly diversified, uncorrelated allocation)
                </span>
              </div>
            );
          })()
        ) : (
          <p style={emptyText}>Add securities across at least two asset classes to compute this.</p>
        )}
      </div>

      <div style={overviewRow}>
        <div style={overviewTableCol}>
          <table style={overviewTable}>
            <thead>
              <tr>
                <th style={overviewTh}>Asset Class</th>
                <th style={overviewThRight}>Securities</th>
              </tr>
            </thead>
            <tbody>
              {assetClasses.map((ac) => (
                <tr key={ac.name}>
                  <td style={overviewTd}>{ac.name}</td>
                  <td style={overviewTdRight}>{ac.holdings.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={overviewChartCol}>
          {sectorBreakdown.length > 0 ? (
            <>
              <p style={chartCaption}>Securities by sector</p>
              <AllocationPieChart allocations={sectorBreakdown} />
            </>
          ) : (
            <p style={emptyText}>Add securities to see the sector breakdown.</p>
          )}
        </div>
      </div>

      <div style={assetClassList}>
        {assetClasses.map((assetClass) => {
          const candidates = universe.filter(
            (entry) =>
              entry.assetClass === assetClass.name &&
              !assetClass.holdings.some((h) => h.code === entry.code)
          );

          return (
            <div key={assetClass.name} style={assetClassCard}>
              <div style={assetClassHeader}>
                <h4 style={assetClassTitle}>{assetClass.name}</h4>
                <span style={typeBadge}>{assetClass.type}</span>
                <span style={countBadge}>{assetClass.holdings.length} securities</span>
              </div>
              <p style={assetClassDescription}>{assetClass.description}</p>

              <ul style={holdingList}>
                {assetClass.holdings.map((holding) => {
                  const conviction = convictions[holding.code];
                  const convictionScore = conviction?.convictionScore ?? null;
                  const sources = conviction?.sources ?? [];
                  const convictionTooltip =
                    sources.length > 0
                      ? sources.map((s) => `${s.source}: ${s.rating}`).join(' · ')
                      : convictionsLoading
                        ? 'Loading…'
                        : 'No rating data yet';

                  return (
                  <li key={holding.id} style={holdingRow}>
                    <div style={holdingHeader}>
                      <span style={holdingCode}>{holding.code}</span>
                      <span style={holdingName}>{holding.name}</span>
                      {holding.sector && <span style={sectorTag}>{holding.sector}</span>}
                      <button
                        type="button"
                        onClick={() => handleRemove(holding)}
                        style={removeButton}
                        aria-label={`Remove ${holding.name} from the model portfolio`}
                      >
                        Remove
                      </button>
                    </div>
                    <p style={holdingRationale}>{holding.rationale}</p>
                    <HoldingMetricGrid>
                      <HoldingMetricCell label="Weight in class (all risk profiles)">
                        <input
                          type="number"
                          step="0.1"
                          value={holding.inClassWeight}
                          onChange={(e) =>
                            setHoldingWeightLocal(holding.id, parseFloat(e.target.value))
                          }
                          onBlur={() => saveHoldingWeight(holding.id)}
                          style={holdingMetricInput}
                          aria-label={`${holding.name} weight within ${assetClass.name}`}
                        />
                        <span>%</span>
                      </HoldingMetricCell>
                      <HoldingMetricCell label="Forward yield (FY26/27)">
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
                          style={holdingMetricInput}
                          aria-label={`${holding.name} forward yield`}
                        />
                        <span>%</span>
                      </HoldingMetricCell>
                      <HoldingMetricCell
                        label="Conviction"
                      >
                        <span title={convictionTooltip}>
                          {convictionScore !== null
                            ? `${convictionScore}/5`
                            : convictionsLoading
                              ? 'Loading…'
                              : 'No data'}
                        </span>
                      </HoldingMetricCell>
                    </HoldingMetricGrid>
                  </li>
                  );
                })}
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
                      color:
                        Math.abs(
                          round1(assetClass.holdings.reduce((t, h) => t + h.inClassWeight, 0)) - 100
                        ) < 0.15
                          ? '#86efac'
                          : '#fca5a5',
                    }}
                  >
                    {round1(assetClass.holdings.reduce((t, h) => t + h.inClassWeight, 0))}%
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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
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

const statsRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '12px',
  marginBottom: '18px',
};

const statBoxThin = {
  display: 'flex',
  flexDirection: 'column' as const,
  padding: '10px 12px',
  borderRadius: '10px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  minWidth: '100px',
  flex: '0 1 110px',
};

const statLabel = {
  fontSize: '11px',
  color: '#94a3b8',
};

const statValue = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#4ade80',
  marginTop: '2px',
};

const tacticalTableBox = {
  display: 'flex',
  flexDirection: 'column' as const,
  padding: '10px 16px',
  borderRadius: '10px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  minWidth: '340px',
  flex: '2 1 340px',
};

const tacticalTableBoxHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap' as const,
  gap: '8px',
  marginBottom: '6px',
};

const tacticalHeaderRight = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const tacticalTimestamp = {
  fontSize: '10px',
  color: '#64748b',
};

const tacticalScanButton = {
  padding: '3px 10px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 700,
  background: '#0f3d2e',
  border: '1px solid #10b981',
  color: '#86efac',
  cursor: 'pointer',
};

const tacticalTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const tacticalTableTd = {
  padding: '3px 0',
  fontSize: '12px',
  color: '#e2e8f0',
};

const tacticalTableTdRight = {
  ...tacticalTableTd,
  textAlign: 'right' as const,
};

function tacticalStanceTag(stance: 'OW' | 'N' | 'UW') {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    OW: { bg: '#0f3d2e', border: '#10b981', text: '#86efac' },
    N: { bg: '#12203a', border: '#1e3a5f', text: '#94a3b8' },
    UW: { bg: '#4a1520', border: '#ef4444', text: '#fca5a5' },
  };
  const c = colors[stance];
  return {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.text,
    cursor: 'help',
  };
}

const correlationBox = {
  padding: '14px 16px',
  borderRadius: '10px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  marginBottom: '18px',
};

const correlationBoxHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap' as const,
  gap: '8px',
  marginBottom: '8px',
};

const illustrativeTag = {
  fontSize: '10px',
  color: '#fbbf24',
  fontStyle: 'italic' as const,
};

const correlationContent = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '14px',
  flexWrap: 'wrap' as const,
};

const correlationRatingValue = {
  fontSize: '32px',
  fontWeight: 700,
};

const correlationSubtext = {
  fontSize: '12px',
  color: '#94a3b8',
};

const overviewRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '24px',
  marginBottom: '24px',
};

const overviewTableCol = {
  flex: '1 1 260px',
  minWidth: '240px',
};

const overviewChartCol = {
  flex: '1 1 320px',
  minWidth: '300px',
};

const chartCaption = {
  margin: '0 0 4px',
  fontSize: '12px',
  color: '#94a3b8',
  textAlign: 'center' as const,
};

const overviewTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const overviewTh = {
  textAlign: 'left' as const,
  padding: '8px 10px',
  borderBottom: '1px solid #334155',
  color: '#94a3b8',
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const overviewThRight = {
  ...overviewTh,
  textAlign: 'right' as const,
};

const overviewTd = {
  padding: '15px 10px',
  borderBottom: '1px solid #1e293b',
  color: '#e2e8f0',
  fontSize: '13px',
};

const overviewTdRight = {
  ...overviewTd,
  textAlign: 'right' as const,
  fontWeight: 700,
};

const assetClassList = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '18px',
};

const assetClassCard = {
  padding: '16px 18px',
  borderRadius: '12px',
  background: '#0d1f38',
  border: '1px solid #1e3a5f',
};

const assetClassHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap' as const,
};

const assetClassTitle = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const typeBadge = {
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 700,
  background: '#12345b',
  color: '#93c5fd',
};

const countBadge = {
  marginLeft: 'auto',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: '#0f3d2e',
  color: '#86efac',
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
  color: '#38bdf8',
};

const holdingName = {
  fontSize: '13px',
  color: '#cbd5e1',
};

const sectorTag = {
  fontSize: '11px',
  color: '#94a3b8',
};

function convictionBadge(houseView: string | null) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    'strong-positive': { bg: '#0f3d2e', border: '#10b981', text: '#86efac' },
    positive: { bg: '#0f3d2e', border: '#10b981', text: '#86efac' },
    neutral: { bg: '#12203a', border: '#1e3a5f', text: '#94a3b8' },
    negative: { bg: '#4a1520', border: '#ef4444', text: '#fca5a5' },
    'strong-negative': { bg: '#4a1520', border: '#ef4444', text: '#fca5a5' },
  };
  const c = houseView ? colors[houseView] ?? colors.neutral : colors.neutral;
  return {
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 700,
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.text,
    whiteSpace: 'nowrap' as const,
  };
}

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

const weightPercentSign = {
  fontSize: '11px',
  color: '#94a3b8',
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

const manualYieldInput = {
  width: '80px',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#4ade80',
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
