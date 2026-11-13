'use client';
import { compareSecurityCodes } from '../lib/engines/security-order';

import { useEffect, useMemo, useState } from 'react';
import {
  ASSET_CLASSES,
  addCoreSecurity,
  fetchCoreSecurities,
  removeCoreSecurity,
  updateCoreSecurityInClassWeight,
  updateCoreSecurityYield,
  updateCoreSecurityHoldingType,
  updateCoreSecurityFranking,
  fetchRiskProfileWeights,
  HOLDING_TYPE_LABELS,
  type CoreSecurity,
  type HoldingType,
} from '../lib/engines/model-portfolio-core';
import { buildSecurityUniverse, type SecurityUniverseEntry } from '../lib/engines/security-universe';
import { looksLikeBond, stripExchangeSuffix } from '../lib/engines/security-lookup';
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
import HouseViewLine from './HouseViewLine';
import HouseViewAlternatives from './HouseViewAlternatives';
import { fetchHouseViews, type HouseViewEntry } from '../lib/engines/house-view';
import StatusBox from './dashboard/StatusBox';
import { normaliseSector } from '../lib/engines/sector-names';
import { useClientAdvice } from './ClientAdviceContext';
import type { RiskProfile } from '../lib/engines/model-portfolios';

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
  const [houseViews, setHouseViews] = useState<Map<string, HouseViewEntry>>(new Map());
  const [universe, setUniverse] = useState<SecurityUniverseEntry[]>([]);
  const [tacticalView, setTacticalView] = useState<TacticalAssetClassView | null>(null);
  const [tacticalScanning, setTacticalScanning] = useState(false);
  const [tacticalError, setTacticalError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const { selectedRiskProfile } = useClientAdvice();
  const [profileWeights, setProfileWeights] = useState<Record<string, number>>({});
  useEffect(() => {
    fetchRiskProfileWeights(selectedRiskProfile as RiskProfile)
      .then(setProfileWeights)
      .catch(() => setProfileWeights({}));
  }, [selectedRiskProfile]);
  const [classifying, setClassifying] = useState(false);
  const [classifyMessage, setClassifyMessage] = useState<string | null>(null);

  async function classifySectors() {
    setClassifying(true);
    setClassifyMessage(null);
    try {
      const res = await fetch('/api/model-portfolio/classify-sectors', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) throw new Error(body.error ?? 'Classification failed.');
      setSecurities(await fetchCoreSecurities());
      const unknown: string[] = body.unknown ?? [];
      setClassifyMessage(
        `${body.classified} holding${body.classified === 1 ? '' : 's'} classified.` +
          (unknown.length > 0 ? ` Not recognised: ${unknown.join(', ')}.` : '')
      );
    } catch (err) {
      setClassifyMessage(err instanceof Error ? err.message : 'Classification failed.');
    } finally {
      setClassifying(false);
    }
  }

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
    fetchHouseViews(securities.map((s) => s.code))
      .then((views) => {
        if (!cancelled) setHouseViews(views);
      })
      .catch(() => undefined);
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

  function setHoldingFrankingLocal(id: string, value: number | null) {
    setSecurities((prev) => prev.map((s) => (s.id === id ? { ...s, frankingPct: value } : s)));
  }

  async function saveHoldingFranking(id: string) {
    const sec = securities.find((s) => s.id === id);
    if (!sec) return;
    await withSaving(() => updateCoreSecurityFranking(id, sec.frankingPct));
  }

  async function changeHoldingType(id: string, holdingType: HoldingType) {
    setSecurities((prev) => prev.map((s) => (s.id === id ? { ...s, holdingType } : s)));
    await withSaving(() => updateCoreSecurityHoldingType(id, holdingType));
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
    Record<
      string,
      { code: string; name: string; yield: string; franking: string; holdingType?: HoldingType | null; isin?: string | null; sector?: string | null }
    >
  >({});
  const [lookupState, setLookupState] = useState<
    Record<string, { loading: boolean; error: string | null; note: string | null }>
  >({});

  function updateManualEntry(assetClassName: string, field: 'code' | 'name' | 'yield' | 'franking', value: string) {
    setManualEntry((prev) => ({
      ...prev,
      [assetClassName]: {
        code: '',
        name: '',
        yield: '',
        franking: '',
        ...prev[assetClassName],
        [field]: value,
        // Retyping the code means the previous lookup no longer applies.
        ...(field === 'code' ? { holdingType: null, isin: null } : {}),
      },
    }));
  }

  async function handleLookup(assetClassName: string) {
    const rawCode = manualEntry[assetClassName]?.code?.trim();
    if (!rawCode) return;
    // Bonds keep their identifier as typed (ISIN or dealer short name); tickers lose any exchange suffix.
    const code = looksLikeBond(rawCode) ? rawCode : stripExchangeSuffix(rawCode);

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
          code: data.result.code ?? code,
          holdingType: data.result.holdingType ?? null,
          isin: data.result.isin ?? null,
          sector: data.result.sector ?? null,
          name: data.result.name ?? prev[assetClassName]?.name ?? '',
          yield:
            typeof data.result.yield === 'number'
              ? String(data.result.yield)
              : prev[assetClassName]?.yield ?? '',
          franking:
            typeof data.result.frankingPct === 'number'
              ? String(data.result.frankingPct)
              : prev[assetClassName]?.franking ?? '',
        },
      }));

      const foundNothing = data.result.name === null && data.result.yield === null;
      setLookupState((prev) => ({
        ...prev,
        [assetClassName]: {
          loading: false,
          error: foundNothing
            ? `Couldn't find "${code}" — check the ticker, ISIN or bond short name, or fill in name and yield manually.`
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
    const isBond = entry?.holdingType === 'direct_bond' || (entry?.code ? looksLikeBond(entry.code) : false);
    const code = entry?.code ? (isBond ? entry.code.trim().toUpperCase() : stripExchangeSuffix(entry.code)) : '';
    const name = entry?.name.trim();
    const yieldValue = entry?.yield?.trim();
    const frankingValue = entry?.franking?.trim();
    if (!code || !name) return;

    const added = await withSaving(() =>
      addCoreSecurity({
        assetClass: assetClassName,
        code,
        name,
        rationale: entry?.isin
          ? `Wholesale bond, ISIN ${entry.isin}. Added manually - not yet on the Approved List.`
          : 'Added manually - not yet on the Approved List.',
        inSecurityMaster: false,
        sector: entry?.sector ?? undefined,
        holdingType: isBond ? 'direct_bond' : entry?.holdingType ?? undefined,
        yield: yieldValue ? parseFloat(yieldValue) : null,
        frankingPct: frankingValue ? parseFloat(frankingValue) : null,
      })
    );
    if (added) {
      setSecurities((prev) => [...prev, added]);
      setManualEntry((prev) => ({ ...prev, [assetClassName]: { code: '', name: '', yield: '', franking: '' } }));
      setLookupState((prev) => ({ ...prev, [assetClassName]: { loading: false, error: null, note: null } }));
    }
  }

  const assetClasses = ASSET_CLASSES.map((meta) => ({
    ...meta,
    holdings: securities
      .filter((s) => s.assetClass === meta.name)
      .sort(compareSecurityCodes),
  }));

  // --- Top-of-page visuals: security counts and yield coverage, since
  // there's no weighting on this page to build a $ or % picture from. ---
  const totalSecurities = securities.length;
  const securitiesWithYield = securities.filter((s) => typeof s.yield === 'number');
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

  // --- Asset class scorecard: what each sleeve of the model actually looks
  // like - concentration, income, house view and the tactical call. ---
  const scorecard = assetClasses.map((ac) => {
    const holdings = ac.holdings;
    const weightTotal = round1(holdings.reduce((sum, h) => sum + h.inClassWeight, 0));
    const byWeight = [...holdings].sort((a, b) => b.inClassWeight - a.inClassWeight);
    const largest = byWeight[0] ?? null;
    const top3 = round1(byWeight.slice(0, 3).reduce((sum, h) => sum + h.inClassWeight, 0));
    const withYield = holdings.filter((h) => typeof h.yield === 'number');
    const yieldWeight = withYield.reduce((sum, h) => sum + h.inClassWeight, 0);
    const weightedYield =
      yieldWeight > 0 ? round1(withYield.reduce((sum, h) => sum + (h.yield ?? 0) * h.inClassWeight, 0) / yieldWeight) : null;
    const leans = { bullish: 0, neutral: 0, bearish: 0 };
    let covered = 0;
    for (const h of holdings) {
      const hv = houseViews.get(h.code);
      if (hv) {
        leans[hv.lean]++;
        covered++;
      }
    }
    const call = tacticalView?.calls.find((c) => c.assetClass === ac.name);
    const stance = call?.stance ?? null;
    const stanceRationale = call?.rationale ?? null;
    return {
      name: ac.name,
      count: holdings.length,
      weightOk: holdings.length === 0 || Math.abs(weightTotal - 100) < 0.15,
      weightTotal,
      largest,
      top3,
      weightedYield,
      yieldCoverage: holdings.length > 0 ? Math.round((withYield.length / holdings.length) * 100) : 0,
      leans,
      covered,
      stance,
      stanceRationale,
    };
  });

  // --- Headline income for the selected risk profile: each asset class's
  // weighted yield, scaled by that class's share of the profile. Grossed-up
  // adds franking credits at the 30% company rate. ---
  let incomeWeight = 0;
  let cashYield = 0;
  let grossYield = 0;
  for (const ac of assetClasses) {
    const acWeight = profileWeights[ac.name] ?? 0;
    const withYield = ac.holdings.filter((h) => typeof h.yield === 'number');
    const inClass = withYield.reduce((sum, h) => sum + h.inClassWeight, 0);
    if (acWeight <= 0 || inClass <= 0) continue;
    const y = withYield.reduce((sum, h) => sum + (h.yield ?? 0) * h.inClassWeight, 0) / inClass;
    const g =
      withYield.reduce(
        (sum, h) => sum + (h.yield ?? 0) * (1 + ((h.frankingPct ?? 0) / 100) * (30 / 70)) * h.inClassWeight,
        0
      ) / inClass;
    incomeWeight += acWeight;
    cashYield += y * acWeight;
    grossYield += g * acWeight;
  }
  const profileYield = incomeWeight > 0 ? round1(cashYield / incomeWeight) : null;
  const profileGrossYield = incomeWeight > 0 ? round1(grossYield / incomeWeight) : null;

  const ratedHoldings = securities.filter((sec) => houseViews.has(sec.code));
  const positiveHoldings = ratedHoldings.filter((sec) => houseViews.get(sec.code)?.lean === 'bullish').length;
  const negativeHoldings = ratedHoldings.filter((sec) => houseViews.get(sec.code)?.lean === 'bearish').length;

  // --- Australian equities by sector, weighted by each holding's weight in
  // the sleeve - the real sector bets the model is making. ---
  const ausEquities = assetClasses.find((ac) => ac.name === 'Australian Equities')?.holdings ?? [];
  const ausSectorWeights = new Map<string, number>();
  for (const h of ausEquities) {
    const sector = normaliseSector(h.sector) ?? 'Unclassified';
    ausSectorWeights.set(sector, (ausSectorWeights.get(sector) ?? 0) + h.inClassWeight);
  }
  const ausSectors = Array.from(ausSectorWeights.entries())
    .map(([sector, weight]) => ({ sector, weight: round1(weight) }))
    .sort((a, b) => (a.sector === 'Unclassified' ? 1 : b.sector === 'Unclassified' ? -1 : b.weight - a.weight));
  const maxSectorWeight = Math.max(1, ...ausSectors.map((s) => s.weight));
  const unclassifiedCount = securities.filter((sec) => !sec.sector || !sec.sector.trim()).length;

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

      <div style={kpiStrip}>
        <div style={kpiTile}>
          <span style={kpiLabel}>Holdings</span>
          <span style={kpiValue}>{totalSecurities}</span>
          <span style={kpiCaption}>across {assetClasses.filter((ac) => ac.holdings.length > 0).length} asset classes</span>
        </div>
        <div style={kpiTile} title="Cash yield of the model at this risk profile's asset allocation, weighted by holding size">
          <span style={kpiLabel}>Model yield · {selectedRiskProfile}</span>
          <span style={kpiValue}>{profileYield !== null ? `${profileYield}%` : '—'}</span>
          <span style={kpiCaption}>
            {profileGrossYield !== null ? `${profileGrossYield}% grossed up for franking` : 'Enter yields to calculate'}
          </span>
        </div>
        <div style={kpiTile} title="Holdings rated positive by Ord Minnett or Barrenjoey, as a share of those rated">
          <span style={kpiLabel}>House view support</span>
          <span style={kpiValue}>
            {ratedHoldings.length > 0 ? `${Math.round((positiveHoldings / ratedHoldings.length) * 100)}%` : '—'}
          </span>
          <span style={{ ...kpiCaption, color: negativeHoldings > 0 ? '#fca5a5' : kpiCaption.color }}>
            {ratedHoldings.length > 0
              ? `${positiveHoldings} positive${negativeHoldings > 0 ? ` · ${negativeHoldings} negative` : ''} of ${ratedHoldings.length} rated`
              : 'No house ratings loaded'}
          </span>
        </div>
        <div style={kpiTile} title="Share of holdings with a yield entered, and with at least one rating source">
          <span style={kpiLabel}>Data coverage</span>
          <span style={{ ...kpiValue, color: yieldCoveragePct >= 90 && convictionCoveragePct >= 75 ? '#4ade80' : '#fbbf24' }}>
            {Math.round(yieldCoveragePct)}%
          </span>
          <span style={kpiCaption}>
            yields · {convictionsLoading ? '…' : `${Math.round(convictionCoveragePct)}%`} ratings
          </span>
        </div>
        <div style={kpiTile} title="Holding weights within each asset class must total 100%">
          <span style={kpiLabel}>Weight check</span>
          <span style={{ ...kpiValue, color: assetClassesWithWeightIssues === 0 ? '#4ade80' : '#fca5a5' }}>
            {assetClassesWithWeightIssues === 0 ? 'All 100%' : assetClassesWithWeightIssues}
          </span>
          <span style={kpiCaption}>
            {assetClassesWithWeightIssues === 0
              ? 'every asset class balanced'
              : `asset class${assetClassesWithWeightIssues === 1 ? '' : 'es'} not at 100%`}
          </span>
        </div>
      </div>

      <div style={correlationBox}>
        <div style={correlationBoxHeader}>
          <span style={statLabel}>Model Portfolio Correlation Rating</span>
          {analytics && !analytics.connected ? (
            <span style={illustrativeTag}>Illustrative — connect EODHD for live data</span>
          ) : analytics && (analytics.modelledCodes?.length ?? 0) > 0 ? (
            <span style={illustrativeTag} title={`Modelled: ${analytics.modelledCodes.join(', ')}`}>
              Partly modelled — {analytics.modelledCodes.length} holding{analytics.modelledCodes.length === 1 ? '' : 's'} without price history
            </span>
          ) : null}
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
          <div style={sectorHeader}>
            <p style={overviewHeading}>Asset class scorecard</p>
            <span style={tacticalHeaderRight}>
              {tacticalError && <span style={{ fontSize: '11px', color: '#fca5a5' }}>{tacticalError}</span>}
              {tacticalView && (
                <span style={tacticalTimestamp}>
                  Tactical view{' '}
                  {new Date(tacticalView.generatedAt).toLocaleString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <button type="button" onClick={runTacticalScan} disabled={tacticalScanning} style={tacticalScanButton}>
                {tacticalScanning ? 'Running…' : tacticalView ? 'Refresh' : 'Run tactical scan'}
              </button>
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={overviewTable}>
              <thead>
                <tr>
                  <th style={overviewTh}>Asset class</th>
                  <th style={overviewThRight}>Holdings</th>
                  <th style={overviewTh} title="Largest holding and its share of the asset class">Largest</th>
                  <th style={overviewThRight} title="Share of the asset class held in its three largest holdings">Top 3</th>
                  <th style={overviewThRight} title="Weighted forward yield across holdings with a yield entered">Yield</th>
                  <th style={overviewTh} title="Ord Minnett / Barrenjoey ratings across the holdings: positive · neutral · negative">House view</th>
                  <th style={overviewTh} title="Live tactical call for the asset class">Tactical</th>
                </tr>
              </thead>
              <tbody>
                {scorecard.map((row) => (
                  <tr key={row.name}>
                    <td style={overviewTdName}>
                      {row.name}
                      {!row.weightOk && (
                        <span style={weightWarn} title="Holding weights in this asset class don't total 100%">
                          {row.weightTotal}%
                        </span>
                      )}
                    </td>
                    <td style={overviewTdRight}>{row.count}</td>
                    <td style={overviewTd}>
                      {row.largest ? (
                        <>
                          <span style={codeAccent}>{row.largest.code}</span>{' '}
                          <span style={mutedText}>{round1(row.largest.inClassWeight)}%</span>
                        </>
                      ) : (
                        <span style={mutedText}>—</span>
                      )}
                    </td>
                    <td style={overviewTdRight}>
                      {row.count === 0 ? (
                        <span style={mutedText}>—</span>
                      ) : (
                        <span style={{ color: row.count > 3 && row.top3 >= 60 ? '#fbbf24' : '#e2e8f0' }}>{row.top3}%</span>
                      )}
                    </td>
                    <td style={overviewTdRight}>
                      {row.weightedYield !== null ? (
                        <span title={`${row.yieldCoverage}% of holdings have a yield entered`}>{row.weightedYield}%</span>
                      ) : (
                        <span style={mutedText}>—</span>
                      )}
                    </td>
                    <td style={overviewTd}>
                      {row.covered === 0 ? (
                        <span style={mutedText}>{row.count === 0 ? '—' : 'Not covered'}</span>
                      ) : (
                        <span style={leanSummary} title={`${row.covered} of ${row.count} holdings rated`}>
                          <span style={{ color: '#4ade80' }}>{row.leans.bullish}</span>
                          <span style={mutedText}> · </span>
                          <span style={{ color: '#cbd5e1' }}>{row.leans.neutral}</span>
                          <span style={mutedText}> · </span>
                          <span style={{ color: '#fca5a5' }}>{row.leans.bearish}</span>
                        </span>
                      )}
                    </td>
                    <td style={overviewTd}>
                      {row.stance ? (
                        <span style={tacticalStanceTag(row.stance)} title={row.stanceRationale ?? undefined}>
                          {row.stance}
                        </span>
                      ) : (
                        <span style={mutedText}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={overviewFootnote}>
            Top 3 is highlighted when three holdings carry 60% or more of a sleeve. House view counts holdings rated
            positive · neutral · negative by Ord Minnett or Barrenjoey.
          </p>
        </div>

        <div style={overviewChartCol}>
          <div style={sectorHeader}>
            <p style={overviewHeading}>Australian equities by sector</p>
            {unclassifiedCount > 0 && (
              <button type="button" onClick={classifySectors} disabled={classifying} style={classifyButton}>
                {classifying ? 'Classifying…' : `Classify ${unclassifiedCount} holding${unclassifiedCount === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
          <p style={overviewSubheading}>Share of the Australian equities sleeve, by holding weight</p>
          {classifyMessage && <p style={classifyNote}>{classifyMessage}</p>}
          {ausSectors.length === 0 ? (
            <p style={emptyText}>Add Australian equities to see the sector mix.</p>
          ) : (
            <div style={sectorBars}>
              {ausSectors.map(({ sector, weight }) => (
                <div key={sector} style={sectorBarRow}>
                  <span style={{ ...sectorBarLabel, color: sector === 'Unclassified' ? '#64748b' : '#e2e8f0' }}>{sector}</span>
                  <div style={sectorBarTrack}>
                    <div
                      style={{
                        ...sectorBarFill,
                        width: `${(weight / maxSectorWeight) * 100}%`,
                        background: sector === 'Unclassified' ? '#334155' : '#38bdf8',
                      }}
                    />
                  </div>
                  <span style={sectorBarValue}>{weight}%</span>
                </div>
              ))}
            </div>
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
                      <select
                        value={holding.holdingType}
                        onChange={(e) => changeHoldingType(holding.id, e.target.value as HoldingType)}
                        style={holdingTypeSelect}
                        aria-label={`${holding.name} holding type`}
                      >
                        {(Object.keys(HOLDING_TYPE_LABELS) as HoldingType[]).map((type) => (
                          <option key={type} value={type}>
                            {HOLDING_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>
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
                      <HoldingMetricCell label="Franked">
                        <input
                          type="number"
                          step="5"
                          min={0}
                          max={100}
                          value={holding.frankingPct ?? ''}
                          placeholder="—"
                          onChange={(e) =>
                            setHoldingFrankingLocal(
                              holding.id,
                              e.target.value === '' ? null : parseFloat(e.target.value)
                            )
                          }
                          onBlur={() => saveHoldingFranking(holding.id)}
                          style={holdingMetricInput}
                          aria-label={`${holding.name} franking level`}
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
                    <HouseViewLine view={houseViews.get(holding.code.trim().toUpperCase())} />
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
                  placeholder="Code, ISIN or bond"
                  title="ASX code (e.g. CBA), or for wholesale bonds the ISIN (AU3CB0326452) or short name (AGL 5.77% Sep-35)"
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
                <input
                  type="number"
                  step="5"
                  min={0}
                  max={100}
                  placeholder="Franked %"
                  value={manualEntry[assetClass.name]?.franking ?? ''}
                  onChange={(e) => updateManualEntry(assetClass.name, 'franking', e.target.value)}
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

      <HouseViewAlternatives />
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

const kpiStrip = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: '12px',
  marginBottom: '18px',
};

const kpiTile = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '14px 16px',
  borderRadius: '10px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  minWidth: 0,
};

const kpiLabel = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const kpiValue = {
  fontSize: '26px',
  lineHeight: 1.15,
  fontWeight: 700,
  color: '#4ade80',
};

const kpiCaption = {
  fontSize: '12px',
  color: '#64748b',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};



const statLabel = {
  fontSize: '11px',
  color: '#94a3b8',
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
  flex: '3 1 560px',
  minWidth: '0',
};

const overviewChartCol = {
  flex: '2 1 320px',
  minWidth: '280px',
};

const overviewHeading = {
  margin: '0 0 8px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
};

const overviewSubheading = {
  margin: '0 0 12px',
  fontSize: '12px',
  color: '#64748b',
};

const overviewFootnote = {
  margin: '10px 0 0',
  fontSize: '11px',
  color: '#64748b',
  lineHeight: 1.5,
};

const overviewTdName = {
  padding: '12px 10px',
  borderBottom: '1px solid #1e293b',
  color: '#e2e8f0',
  fontSize: '13px',
  fontWeight: 600,
  whiteSpace: 'nowrap' as const,
};

const weightWarn = {
  marginLeft: '8px',
  padding: '1px 6px',
  borderRadius: '6px',
  background: '#2a1215',
  color: '#fca5a5',
  fontSize: '11px',
  fontWeight: 700,
};

const codeAccent = {
  color: '#38bdf8',
  fontWeight: 700,
};

const mutedText = {
  color: '#64748b',
};

const leanSummary = {
  fontWeight: 700,
  whiteSpace: 'nowrap' as const,
};

const sectorHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
};

const classifyButton = {
  padding: '5px 12px',
  borderRadius: '8px',
  border: '1px solid #38bdf8',
  background: '#0c3a5c',
  color: '#e0f2fe',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  marginBottom: '8px',
};

const classifyNote = {
  margin: '0 0 10px',
  fontSize: '12px',
  color: '#86efac',
};

const sectorBars = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '9px',
};

const sectorBarRow = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr 52px',
  alignItems: 'center',
  gap: '10px',
};

const sectorBarLabel = {
  fontSize: '13px',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const sectorBarTrack = {
  height: '10px',
  borderRadius: '5px',
  background: '#13233a',
  overflow: 'hidden',
};

const sectorBarFill = {
  height: '100%',
  borderRadius: '5px',
};

const sectorBarValue = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
  textAlign: 'right' as const,
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
  padding: '12px 10px',
  borderBottom: '1px solid #1e293b',
  color: '#e2e8f0',
  fontSize: '13px',
};

const overviewTdRight = {
  ...overviewTd,
  textAlign: 'right' as const,
  fontWeight: 600,
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

const holdingTypeSelect = {
  padding: '2px 6px',
  borderRadius: '6px',
  fontSize: '10px',
  fontWeight: 600,
  background: '#12203a',
  border: '1px solid #2d4a6b',
  color: '#93c5fd',
  cursor: 'pointer',
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
  width: '190px',
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
