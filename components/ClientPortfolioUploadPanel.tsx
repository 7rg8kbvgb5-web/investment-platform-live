'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  parseClientPortfolioCsv,
  type ParsedPortfolioUpload,
  type UploadedHolding,
} from '../lib/engines/client-portfolio-upload'
import { mapClientHoldings } from '../lib/engines/client-holdings-mapping'
import { classifyPortfolioRiskProfile } from '../lib/engines/portfolio-risk-classification'
import type { RiskProfile, ModelPortfolio } from '../lib/engines/model-portfolios'
import {
  RISK_PROFILES,
  fetchModelPortfolio,
  fetchAllRiskProfileWeights,
  computeGrowthDefensiveByProfile,
} from '../lib/engines/model-portfolio-core'
import { compareClientPortfolioToModel } from '../lib/engines/portfolio-review-comparison'
import { computePortfolioYield } from '../lib/engines/yield-aggregation'
import {
  applyClientWeightOverrides,
  type AssetClassWeightOverrides,
  type HoldingWeightOverrides,
} from '../lib/engines/client-weight-overrides'
import { normaliseCode } from '../lib/engines/security-universe'
import {
  saveClientReview,
  listClientReviews,
  fetchClientReview,
  deleteClientReview,
} from '../lib/engines/client-portfolio-reviews'
import AssetClassComparisonChart from './AssetClassComparisonChart'
import HoldingAdjustmentChart from './HoldingAdjustmentChart'
import AllocationPieChart from './AllocationPieChart'
import StatusBox from './dashboard/StatusBox'

type ExtractionMeta = {
  clientName: string | null
  asAtDate: string | null
  totalPortfolioValue: number | null
}

const ACTION_STYLE: Record<string, { bg: string; fg: string }> = {
  buy: { bg: '#0f3d2e', fg: '#4ade80' },
  increase: { bg: '#0f3d2e', fg: '#4ade80' },
  reduce: { bg: '#3f2b12', fg: '#facc15' },
  sell: { bg: '#3f1620', fg: '#f87171' },
  hold: { bg: '#0d2542', fg: '#94a3b8' },
}

const EXAMPLE_HOLDINGS: UploadedHolding[] = [
  { code: 'CBA', name: 'Commonwealth Bank', weight: 14, sourceRow: 1 },
  { code: 'NAB', name: 'National Australia Bank', weight: 9, sourceRow: 2 },
  { code: 'BHP', name: 'BHP Group', weight: 6, sourceRow: 3 },
  { code: 'WES', name: 'Wesfarmers', weight: 4, sourceRow: 4 },
  { code: 'IVV', name: 'iShares S&P 500 ETF', weight: 12, sourceRow: 5 },
  { code: 'VAP', name: 'Australian Property Securities ETF', weight: 8, sourceRow: 6 },
  { code: 'IAF', name: 'iShares Core Composite Bond ETF', weight: 22, sourceRow: 7 },
  { code: 'Cash', name: 'Cash / At Call Account', weight: 25, sourceRow: 8 },
]

export default function ClientPortfolioUploadPanel() {
  const [mode, setMode] = useState<'pdf' | 'csv'>('pdf')
  const [csvText, setCsvText] = useState('')
  const [holdings, setHoldings] = useState<UploadedHolding[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [meta, setMeta] = useState<ExtractionMeta>({
    clientName: null,
    asAtDate: null,
    totalPortfolioValue: null,
  })
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [riskOverride, setRiskOverride] = useState<RiskProfile | 'auto'>('auto')
  const [manualPortfolioValue, setManualPortfolioValue] = useState<string>('')
  const [prices, setPrices] = useState<Record<string, number | null>>({})
  const [pricesLoading, setPricesLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Every risk profile's growth/defensive split, fetched live from the
  // Supabase-backed core model once on mount, so risk classification
  // always ranks against the house model as it actually is right now -
  // not a hardcoded snapshot.
  const [allWeights, setAllWeights] = useState<Record<
    RiskProfile,
    Record<string, number>
  > | null>(null)
  const [allWeightsError, setAllWeightsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchAllRiskProfileWeights()
      .then((w) => {
        if (!cancelled) setAllWeights(w)
      })
      .catch((err) => {
        if (!cancelled) {
          setAllWeightsError(
            err instanceof Error ? err.message : 'Failed to load risk profile weights.',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Total portfolio value used to size trades in dollars. The upload's own
  // stated total (from a PDF that prints it) takes precedence; otherwise
  // the adviser can enter it manually - either way, everything downstream
  // (dollar values, units) lights up once one is available.
  const effectiveTotalPortfolioValue: number | undefined =
    meta.totalPortfolioValue ?? (manualPortfolioValue ? parseFloat(manualPortfolioValue) || undefined : undefined)

  function loadExamplePortfolio() {
    setHoldings(EXAMPLE_HOLDINGS)
    setWarnings([])
    setParseError(null)
    setMeta({
      clientName: 'Example Client (sample data)',
      asAtDate: new Date().toISOString().slice(0, 10),
      totalPortfolioValue: null,
    })
  }

  async function handlePdfUpload(file: File) {
    setParsing(true)
    setParseError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/portfolios/parse-pdf', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!data.ok) {
        throw new Error(data.error ?? 'Failed to parse the PDF.')
      }

      setHoldings(data.holdings ?? [])
      setWarnings(data.warnings ?? [])
      setMeta({
        clientName: data.clientName,
        asAtDate: data.asAtDate,
        totalPortfolioValue: data.totalPortfolioValue,
      })
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse the PDF.')
    } finally {
      setParsing(false)
    }
  }

  function handleCsvChange(value: string) {
    setCsvText(value)
    setMeta({ clientName: null, asAtDate: null, totalPortfolioValue: null })

    if (!value.trim()) {
      setHoldings([])
      setWarnings([])
      return
    }

    const result: ParsedPortfolioUpload = parseClientPortfolioCsv(value)
    setHoldings(result.holdings)
    setWarnings(result.warnings)
  }

  const mappingResult = useMemo(() => mapClientHoldings(holdings), [holdings])

  const growthDefensiveByProfile = useMemo(
    () => (allWeights ? computeGrowthDefensiveByProfile(allWeights) : null),
    [allWeights],
  )

  const riskClassification = useMemo(
    () =>
      growthDefensiveByProfile
        ? classifyPortfolioRiskProfile(
            mappingResult.growthWeight,
            mappingResult.defensiveWeight,
            growthDefensiveByProfile,
          )
        : null,
    [mappingResult.growthWeight, mappingResult.defensiveWeight, growthDefensiveByProfile],
  )

  const effectiveRiskProfile: RiskProfile | null =
    riskOverride === 'auto' ? riskClassification?.nearestRiskProfile ?? null : riskOverride

  // The target model itself now lives in Supabase (shared core securities +
  // per-profile weights) rather than a static file, so it's fetched live
  // whenever the effective risk profile changes - this is what makes any
  // edit made on the Risk Profile tab show up here automatically.
  const [model, setModel] = useState<ModelPortfolio | null>(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  useEffect(() => {
    if (!effectiveRiskProfile) {
      setModel(null)
      return
    }
    let cancelled = false
    setModelLoading(true)
    setModelError(null)
    fetchModelPortfolio(effectiveRiskProfile)
      .then((m) => {
        if (!cancelled) setModel(m)
      })
      .catch((err) => {
        if (!cancelled) {
          setModelError(
            err instanceof Error ? err.message : 'Failed to load the model portfolio.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setModelLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [effectiveRiskProfile])

  // Client-specific bespoke weight overrides for this proposal only - never
  // written back to the house model. Cleared whenever the risk profile
  // being compared against changes, since overrides keyed to one model's
  // asset classes/holdings don't carry meaning against a different one.
  const [assetClassOverrides, setAssetClassOverrides] =
    useState<AssetClassWeightOverrides>({})
  const [holdingOverrides, setHoldingOverrides] = useState<HoldingWeightOverrides>({})

  useEffect(() => {
    setAssetClassOverrides({})
    setHoldingOverrides({})
  }, [effectiveRiskProfile])

  const hasClientOverrides =
    Object.keys(assetClassOverrides).length > 0 || Object.keys(holdingOverrides).length > 0

  const clientAdjustedModel = useMemo(
    () => (model ? applyClientWeightOverrides(model, assetClassOverrides, holdingOverrides) : null),
    [model, assetClassOverrides, holdingOverrides],
  )

  function setAssetClassWeight(name: string, value: number) {
    setAssetClassOverrides((prev) => ({ ...prev, [name]: value }))
  }

  function resetAssetClassWeight(name: string) {
    setAssetClassOverrides((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  function setHoldingWeight(code: string, value: number) {
    setHoldingOverrides((prev) => ({ ...prev, [normaliseCode(code)]: value }))
  }

  function resetHoldingWeight(code: string) {
    setHoldingOverrides((prev) => {
      const next = { ...prev }
      delete next[normaliseCode(code)]
      return next
    })
  }

  function resetAllClientOverrides() {
    setAssetClassOverrides({})
    setHoldingOverrides({})
  }

  // --- Save/resume a client's in-progress review ---
  // Everything above (uploaded holdings, risk override, portfolio value,
  // bespoke weight overrides) previously lived only in this tab's memory.
  // Naming a review after a client and letting it autosave means closing
  // the tab and coming back tomorrow picks up exactly where it left off -
  // the house model itself was always safe in Supabase; this closes the
  // gap for the client-specific working file.
  const [clientReviewName, setClientReviewName] = useState('')
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [showLoadPicker, setShowLoadPicker] = useState(false)
  const [savedReviews, setSavedReviews] = useState<
    { id: string; clientName: string; updatedAt: string }[]
  >([])
  const [loadingSavedReviews, setLoadingSavedReviews] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHydrating = useRef(false)

  useEffect(() => {
    if (isHydrating.current) {
      isHydrating.current = false
      return
    }
    const name = clientReviewName.trim()
    if (!name || holdings.length === 0) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    setReviewStatus('saving')
    saveTimer.current = setTimeout(async () => {
      try {
        const savedId = await saveClientReview(reviewId, name, {
          holdings,
          meta,
          riskOverride,
          manualPortfolioValue,
          assetClassOverrides,
          holdingOverrides,
        })
        setReviewId((prev) => prev ?? savedId)
        setReviewStatus('saved')
      } catch (err) {
        setReviewError(err instanceof Error ? err.message : 'Failed to save.')
        setReviewStatus('error')
      }
    }, 1200)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // clientReviewName intentionally excluded from deps beyond its own
    // change - editing it retriggers via the other dependencies changing
    // too, and including it directly would refire on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, meta, riskOverride, manualPortfolioValue, assetClassOverrides, holdingOverrides, clientReviewName])

  async function openLoadPicker() {
    setShowLoadPicker(true)
    setLoadingSavedReviews(true)
    try {
      const reviews = await listClientReviews()
      setSavedReviews(reviews)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to load saved reviews.')
    } finally {
      setLoadingSavedReviews(false)
    }
  }

  async function loadReview(id: string) {
    try {
      const review = await fetchClientReview(id)
      isHydrating.current = true
      setClientReviewName(review.clientName)
      setReviewId(review.id)
      setHoldings(review.state.holdings)
      setMeta(review.state.meta)
      setRiskOverride(review.state.riskOverride)
      setManualPortfolioValue(review.state.manualPortfolioValue)
      setAssetClassOverrides(review.state.assetClassOverrides)
      setHoldingOverrides(review.state.holdingOverrides)
      setReviewStatus('saved')
      setShowLoadPicker(false)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to load review.')
    }
  }

  async function removeReview(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const confirmed = window.confirm('Delete this saved client review? This cannot be undone.')
    if (!confirmed) return
    try {
      await deleteClientReview(id)
      setSavedReviews((prev) => prev.filter((r) => r.id !== id))
      if (reviewId === id) {
        startNewReview()
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to delete review.')
    }
  }

  function startNewReview() {
    isHydrating.current = true
    setClientReviewName('')
    setReviewId(null)
    setReviewStatus('idle')
    setHoldings([])
    setCsvText('')
    setWarnings([])
    setMeta({ clientName: null, asAtDate: null, totalPortfolioValue: null })
    setRiskOverride('auto')
    setManualPortfolioValue('')
    setAssetClassOverrides({})
    setHoldingOverrides({})
  }

  // Every code that could plausibly need a live price: what the client
  // holds today, plus every holding in the model being compared against
  // (the buy candidates). Fetched once per (holdings, model) change.
  const codesToPrice = useMemo(() => {
    const codes = new Set<string>()
    for (const holding of mappingResult.mappedHoldings) {
      if (holding.mapped) codes.add(holding.code)
    }
    if (clientAdjustedModel) {
      for (const assetClass of clientAdjustedModel.assetClasses) {
        for (const holding of assetClass.holdings) codes.add(holding.code)
      }
    }
    return Array.from(codes)
  }, [mappingResult.mappedHoldings, clientAdjustedModel])

  useEffect(() => {
    if (codesToPrice.length === 0) {
      setPrices({})
      return
    }

    let cancelled = false
    setPricesLoading(true)

    fetch('/api/market-data/quote-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codes: codesToPrice }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.ok) return
        const priceMap: Record<string, number | null> = {}
        for (const [code, entry] of Object.entries(
          data.quotes as Record<string, { price: number | null }>,
        )) {
          priceMap[code] = entry.price
        }
        setPrices(priceMap)
      })
      .catch(() => {
        if (!cancelled) setPrices({})
      })
      .finally(() => {
        if (!cancelled) setPricesLoading(false)
      })

    return () => {
      cancelled = true
    }
    // codesToPrice is a derived array (new identity each render) - compare
    // by its joined contents instead so this only refetches when the
    // actual set of codes changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codesToPrice.join(',')])

  const comparison = useMemo(
    () =>
      clientAdjustedModel
        ? compareClientPortfolioToModel(mappingResult.mappedHoldings, clientAdjustedModel, {
            totalPortfolioValue: effectiveTotalPortfolioValue,
            prices,
          })
        : null,
    [mappingResult.mappedHoldings, clientAdjustedModel, effectiveTotalPortfolioValue, prices],
  )

  // Aggregate yield/income for the target (post-rebalance) portfolio, at
  // this client's actual dollar value where known. Uses clientAdjustedModel
  // so any bespoke weight overrides above flow through into the income
  // figures too - the yield picture always matches what's actually being
  // proposed.
  const yieldSummary = useMemo(
    () =>
      clientAdjustedModel
        ? computePortfolioYield(clientAdjustedModel, effectiveTotalPortfolioValue ?? null)
        : null,
    [clientAdjustedModel, effectiveTotalPortfolioValue],
  )

  const pricesConnected = Object.values(prices).some((p) => p !== null && p !== undefined)

  const hasHoldings = holdings.length > 0

  return (
    <section style={panel}>
      <p style={eyebrow}>Client Portfolio Review</p>
      <h2 style={heading}>Upload &amp; Review Against Model Portfolio</h2>
      <p style={description}>
        Upload a client portfolio statement (PDF) to break it down by asset
        class and security, classify its risk profile, and see exactly
        which positions need to change to align with the house model.
      </p>

      <div style={reviewBar}>
        <div style={reviewNameField}>
          <input
            type="text"
            placeholder="Client name (e.g. J Smith) — saves this review as you work"
            value={clientReviewName}
            onChange={(e) => setClientReviewName(e.target.value)}
            style={reviewNameInput}
          />
          {reviewStatus === 'saving' && <span style={reviewStatusSaving}>Saving…</span>}
          {reviewStatus === 'saved' && <span style={reviewStatusSaved}>Saved</span>}
          {reviewStatus === 'error' && (
            <span style={reviewStatusError} title={reviewError ?? undefined}>
              Save failed
            </span>
          )}
        </div>
        <div style={reviewButtonGroup}>
          <button type="button" style={reviewBarButton} onClick={openLoadPicker}>
            Resume a client…
          </button>
          {(hasHoldings || clientReviewName) && (
            <button type="button" style={reviewBarButton} onClick={startNewReview}>
              New review
            </button>
          )}
        </div>
      </div>

      {showLoadPicker && (
        <div style={loadPickerBox}>
          <div style={loadPickerHeader}>
            <span style={loadPickerTitle}>Saved client reviews</span>
            <button
              type="button"
              style={loadPickerClose}
              onClick={() => setShowLoadPicker(false)}
            >
              Close
            </button>
          </div>
          {loadingSavedReviews ? (
            <p style={loadPickerEmpty}>Loading…</p>
          ) : savedReviews.length === 0 ? (
            <p style={loadPickerEmpty}>No saved reviews yet — name a client above to start one.</p>
          ) : (
            <ul style={loadPickerList}>
              {savedReviews.map((r) => (
                <li key={r.id} style={loadPickerRow} onClick={() => loadReview(r.id)}>
                  <span style={loadPickerName}>{r.clientName}</span>
                  <span style={loadPickerDate}>
                    {new Date(r.updatedAt).toLocaleString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <button
                    type="button"
                    style={loadPickerDelete}
                    onClick={(e) => removeReview(r.id, e)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={modeToggleRow}>
        <button
          type="button"
          onClick={() => setMode('pdf')}
          style={mode === 'pdf' ? modeButtonActive : modeButton}
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => setMode('csv')}
          style={mode === 'csv' ? modeButtonActive : modeButton}
        >
          Paste CSV instead
        </button>
        <button
          type="button"
          onClick={loadExamplePortfolio}
          style={exampleButton}
        >
          See it with an example portfolio
        </button>
      </div>

      {mode === 'pdf' ? (
        <div
          style={dropzone}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file) handlePdfUpload(file)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handlePdfUpload(file)
            }}
          />
          <p style={dropzoneText}>
            {parsing
              ? 'Reading portfolio statement…'
              : 'Click to choose a PDF, or drag one here'}
          </p>
          <p style={dropzoneSubtext}>
            Custodian or platform statement, wrap account report, or any
            portfolio PDF with a holdings list.
          </p>
        </div>
      ) : (
        <textarea
          value={csvText}
          onChange={(e) => handleCsvChange(e.target.value)}
          placeholder={'Code,Weight\nCBA,12\nBHP,10\nMQG,8\nNST,5'}
          style={textarea}
        />
      )}

      {parseError ? <StatusBox variant="error">{parseError}</StatusBox> : null}
      {allWeightsError ? <StatusBox variant="error">{allWeightsError}</StatusBox> : null}
      {modelError ? <StatusBox variant="error">{modelError}</StatusBox> : null}

      {warnings.length > 0 ? (
        <StatusBox variant="warning">
          <strong>Review before relying on this:</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </StatusBox>
      ) : null}

      {!hasHoldings && !parsing ? (
        <StatusBox variant="neutral">
          Nothing loaded yet — upload a statement, paste a CSV, or click
          &quot;See it with an example portfolio&quot; above. Once holdings are in,
          this shows the growth/defensive risk classification, the target
          model&apos;s constitution, asset-class allocation vs the model
          (chart), and exact security-level buy/increase/reduce/sell
          recommendations (chart) below.
        </StatusBox>
      ) : null}

      {hasHoldings && (modelLoading || !allWeights) && !modelError ? (
        <StatusBox variant="neutral">Loading the live model portfolio…</StatusBox>
      ) : null}

      {hasHoldings && model && comparison && riskClassification && effectiveRiskProfile ? (
        <>
          {/* Summary bar */}
          <div style={summaryRow}>
            <SummaryCard
              title="Client"
              value={meta.clientName ?? '—'}
            />
            <SummaryCard title="As At" value={meta.asAtDate ?? '—'} />
            <SummaryCard
              title="Holdings"
              value={String(holdings.length)}
            />
            <SummaryCard
              title="Mapped"
              value={`${mappingResult.mappedCount} / ${holdings.length}`}
            />
            <SummaryCard
              title="Growth / Defensive"
              value={`${mappingResult.growthWeight}% / ${mappingResult.defensiveWeight}%`}
            />
          </div>

          {/* Portfolio value + pricing status - drives dollar/unit trade sizing below */}
          <div style={subPanel}>
            <div style={subPanelHeaderRow}>
              <p style={subHeading}>Portfolio Value &amp; Live Pricing</p>
              {pricesLoading ? (
                <span style={pricingStatusMuted}>Fetching live prices…</span>
              ) : pricesConnected ? (
                <span style={pricingStatusOk}>Live prices connected</span>
              ) : (
                <span style={pricingStatusWarn}>
                  No live prices — connect EODHD on the Data Analytics page for unit sizing
                </span>
              )}
            </div>
            {meta.totalPortfolioValue ? (
              <p style={bodyText}>
                Total portfolio value from the statement:{' '}
                <strong>{formatCurrency(meta.totalPortfolioValue)}</strong>. Used to size
                every recommended trade in dollars below.
              </p>
            ) : (
              <>
                <p style={bodyText}>
                  The statement didn&apos;t state a total portfolio value, so dollar and
                  unit trade sizing can&apos;t be shown yet — weight-based comparisons
                  below still work regardless. Enter it manually to size trades:
                </p>
                <input
                  type="number"
                  placeholder="e.g. 850000"
                  value={manualPortfolioValue}
                  onChange={(e) => setManualPortfolioValue(e.target.value)}
                  style={portfolioValueInput}
                />
              </>
            )}
          </div>

          {/* Risk classification */}
          <div style={subPanel}>
            <div style={subPanelHeaderRow}>
              <p style={subHeading}>Risk Profile Classification</p>

              <label style={selectLabel}>
                Compare against
                <select
                  style={select}
                  value={riskOverride}
                  onChange={(e) =>
                    setRiskOverride(e.target.value as RiskProfile | 'auto')
                  }
                >
                  <option value="auto">
                    Auto (nearest: {riskClassification.nearestRiskProfile})
                  </option>
                  {RISK_PROFILES.map((profile) => (
                    <option key={profile} value={profile}>
                      {profile}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p style={bodyText}>
              Based on mapped holdings, this portfolio sits at{' '}
              <strong>{riskClassification.clientGrowthWeight}% growth</strong> /{' '}
              {riskClassification.clientDefensiveWeight}% defensive. The
              nearest house model is{' '}
              <strong>{riskClassification.nearestRiskProfile}</strong>{' '}
              ({riskClassification.nearestModelGrowthWeight}% growth target,{' '}
              {riskClassification.growthWeightGap > 0 ? '+' : ''}
              {riskClassification.growthWeightGap}pp difference).
              {riskOverride !== 'auto' && riskOverride !== riskClassification.nearestRiskProfile
                ? ` You're currently comparing against ${riskOverride} instead — the adviser's own read of the client's risk tolerance always takes precedence over this automatic estimate.`
                : ''}
            </p>
          </div>

          {/* Target model constitution - same table+chart layout as the
              Risk Profile tab, read live from the same Supabase core, so
              this always matches what's actually defined there. */}
          <div style={subPanel}>
            <p style={subHeading}>
              {effectiveRiskProfile} Model Constitution (Target)
            </p>
            <p style={bodyText}>{model.objective}</p>
            <div style={constitutionOverviewRow}>
              <div style={constitutionTableCol}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Asset Class</th>
                      <th style={th}>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.assetClasses.map((ac) => (
                      <tr key={ac.name}>
                        <td style={td}>{ac.name}</td>
                        <td style={td}>{ac.targetWeight}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={constitutionChartCol}>
                <AllocationPieChart
                  allocations={model.assetClasses.map((ac) => ({
                    asset_class: ac.name,
                    target_weight: ac.targetWeight,
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Asset class comparison */}
          <div style={subPanel}>
            <p style={subHeading}>
              Asset Class Allocation vs {effectiveRiskProfile} Model
            </p>
            {hasClientOverrides ? (
              <div style={bespokeBanner}>
                <span>
                  This proposal carries bespoke weight overrides for this
                  client — the {effectiveRiskProfile} house model itself is
                  unchanged.
                </span>
                <button style={resetAllButton} onClick={resetAllClientOverrides}>
                  Reset all to model
                </button>
              </div>
            ) : null}
            <AssetClassComparisonChart rows={comparison.assetClassComparison} />
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Asset Class</th>
                    <th style={th}>Type</th>
                    <th style={th}>Client</th>
                    <th style={th}>Model</th>
                    <th style={th}>Difference</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.assetClassComparison.map((row) => (
                    <tr key={row.assetClass}>
                      <td style={td}>{row.assetClass}</td>
                      <td style={tdMuted}>{row.type}</td>
                      <td style={td}>{row.clientWeight}%</td>
                      <td style={td}>
                        <div style={weightEditCell}>
                          <input
                            type="number"
                            step={0.5}
                            style={
                              assetClassOverrides[row.assetClass] !== undefined
                                ? weightInputOverridden
                                : weightInput
                            }
                            value={row.modelWeight}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value)
                              if (!Number.isNaN(value)) setAssetClassWeight(row.assetClass, value)
                            }}
                          />
                          %
                          {assetClassOverrides[row.assetClass] !== undefined ? (
                            <button
                              style={resetWeightButton}
                              title="Reset to house model weight"
                              onClick={() => resetAssetClassWeight(row.assetClass)}
                            >
                              ↺
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td style={td}>
                        {row.difference > 0 ? '+' : ''}
                        {row.difference}pp
                      </td>
                      <td style={td}>
                        <StatusPill status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Target portfolio yield/income - post-rebalance, at this
              client's actual dollar value where known, reflecting any
              bespoke weight overrides above. */}
          {yieldSummary ? (
            <div style={subPanel}>
              <p style={subHeading}>Target Portfolio Forward Yield &amp; Income (FY26/27)</p>
              <p style={bodyText}>
                Estimated forward yield (FY26/27) and annual income if this client&apos;s
                portfolio is brought fully in line with the {effectiveRiskProfile}{' '}
                model as proposed above.
              </p>
              <div style={yieldOverviewRow}>
                <div style={yieldOverviewStat}>
                  <span style={yieldOverviewLabel}>Blended forward yield</span>
                  <span style={yieldOverviewValue}>
                    {yieldSummary.totalBlendedYieldPct !== null
                      ? `${yieldSummary.totalBlendedYieldPct}%`
                      : '—'}
                  </span>
                </div>
                <div style={yieldOverviewStat}>
                  <span style={yieldOverviewLabel}>Estimated annual income</span>
                  <span style={yieldOverviewValue}>
                    {yieldSummary.totalIncomeValue !== null
                      ? formatCurrency(yieldSummary.totalIncomeValue)
                      : effectiveTotalPortfolioValue
                        ? '—'
                        : 'Enter portfolio value above'}
                  </span>
                </div>
                <div style={yieldOverviewStat}>
                  <span style={yieldOverviewLabel}>Yield data coverage</span>
                  <span style={yieldOverviewValue}>{yieldSummary.totalYieldCoveragePct}%</span>
                </div>
              </div>
              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Asset Class</th>
                      <th style={th}>Weight</th>
                      <th style={th}>Fwd. Yield</th>
                      <th style={th}>Est. Annual Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yieldSummary.assetClasses
                      .filter((ac) => ac.weight > 0)
                      .map((ac) => (
                        <tr key={ac.assetClass}>
                          <td style={td}>{ac.assetClass}</td>
                          <td style={tdMuted}>{ac.weight}%</td>
                          <td style={td}>
                            {ac.blendedYieldPct !== null ? `${ac.blendedYieldPct}%` : '—'}
                          </td>
                          <td style={td}>
                            {ac.incomeValue !== null ? (
                              formatCurrency(ac.incomeValue)
                            ) : (
                              <span style={tdMutedInline}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {yieldSummary.totalYieldCoveragePct < 100 ? (
                <p style={tdMutedInline}>
                  {100 - yieldSummary.totalYieldCoveragePct}% of the target portfolio (by
                  weight) doesn&apos;t have a stated yield yet — add it on the Risk Profile
                  tab to complete this picture.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Holding-level recommendations, broken out by asset class to
              mirror the Model Portfolio / Risk Profile tabs' layout, so
              the workflow reads the same way across the app. Every
              holding is shown here now (not just ones flagged for
              change), and every target weight is editable - this is
              where bespoke amendments for this specific client/review
              happen. */}
          <div style={subPanel}>
            <p style={subHeading}>Recommended Changes</p>
            <HoldingAdjustmentChart recommendations={comparison.holdingRecommendations} />
            <div style={assetClassList}>
              {clientAdjustedModel.assetClasses.map((assetClass) => {
                const classRecs = comparison.holdingRecommendations.filter(
                  (rec) => rec.assetClass === assetClass.name,
                )
                if (classRecs.length === 0) return null

                return (
                  <div key={assetClass.name} style={assetClassCard}>
                    <div style={assetClassCardHeader}>
                      <h4 style={assetClassCardTitle}>{assetClass.name}</h4>
                      <span style={typeBadgeSmall}>{assetClass.type}</span>
                      <span style={countBadgeSmall}>{classRecs.length} holdings</span>
                    </div>

                    <ul style={holdingCardList}>
                      {classRecs.map((rec) => (
                        <li key={rec.code} style={holdingCardRow}>
                          <div style={holdingCardHeader}>
                            <span style={holdingCardCode}>{rec.code}</span>
                            <span style={holdingCardName}>{rec.name}</span>
                            <span style={holdingCardBadge}>
                              <ActionBadge action={rec.action} />
                            </span>
                          </div>

                          <div style={weightEditCell}>
                            <span style={holdingCardFieldLabel}>Current {rec.currentWeight}% → Target</span>
                            <input
                              type="number"
                              step={0.5}
                              style={
                                holdingOverrides[normaliseCode(rec.code)] !== undefined
                                  ? weightInputOverridden
                                  : weightInput
                              }
                              value={rec.targetWeight}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value)
                                if (!Number.isNaN(value)) setHoldingWeight(rec.code, value)
                              }}
                              aria-label={`${rec.name} target weight`}
                            />
                            %
                            <span style={holdingCardChange}>
                              ({rec.changeWeight > 0 ? '+' : ''}
                              {rec.changeWeight}pp)
                            </span>
                            {holdingOverrides[normaliseCode(rec.code)] !== undefined ? (
                              <button
                                style={resetWeightButton}
                                title="Reset to house model weight"
                                onClick={() => resetHoldingWeight(rec.code)}
                              >
                                ↺
                              </button>
                            ) : null}
                          </div>

                          <div style={holdingCardValueRow}>
                            <span>
                              Trade value:{' '}
                              {rec.changeValue !== null ? (
                                <strong>
                                  {rec.changeValue > 0 ? '+' : ''}
                                  {formatCurrency(rec.changeValue)}
                                </strong>
                              ) : (
                                <span style={tdMutedInline}>—</span>
                              )}
                            </span>
                            <span>
                              Units:{' '}
                              {rec.units !== null ? (
                                <strong>
                                  {rec.units > 0 ? '+' : ''}
                                  {rec.units.toLocaleString()}
                                </strong>
                              ) : (
                                <span style={tdMutedInline}>
                                  {rec.changeValue !== null ? 'no price' : '—'}
                                </span>
                              )}
                            </span>
                          </div>

                          <p style={holdingCardRationale}>{rec.rationale}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Unmapped holdings */}
          {comparison.unclassifiedHoldings.length > 0 ? (
            <div style={subPanel}>
              <p style={subHeading}>
                Needs Manual Review ({comparison.unclassifiedHoldings.length})
              </p>
              <p style={bodyText}>
                These holdings aren't in the security master or any model
                portfolio, so they can't be classified or compared
                automatically. Check them manually before relying on the
                growth/defensive split above.
              </p>
              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Code</th>
                      <th style={th}>Name</th>
                      <th style={th}>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.unclassifiedHoldings.map((holding) => (
                      <tr key={holding.code}>
                        <td style={td}>{holding.code}</td>
                        <td style={td}>{holding.name ?? '—'}</td>
                        <td style={td}>{holding.weight}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  })
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={summaryCard}>
      <div style={summaryTitle}>{title}</div>
      <div style={summaryValue}>{value}</div>
    </div>
  )
}

function StatusPill({ status }: { status: 'in-line' | 'overweight' | 'underweight' }) {
  const styleMap = {
    'in-line': { bg: '#0f3d2e', fg: '#4ade80', label: 'In Line' },
    overweight: { bg: '#3f2b12', fg: '#facc15', label: 'Overweight' },
    underweight: { bg: '#0d2542', fg: '#60a5fa', label: 'Underweight' },
  } as const
  const s = styleMap[status]
  return (
    <span style={{ ...pill, background: s.bg, color: s.fg }}>{s.label}</span>
  )
}

function ActionBadge({ action }: { action: string }) {
  const s = ACTION_STYLE[action] ?? ACTION_STYLE.hold
  return (
    <span style={{ ...pill, background: s.bg, color: s.fg }}>
      {action.toUpperCase()}
    </span>
  )
}

const panel = {
  marginTop: '32px',
  padding: '24px',
  background: '#0f2744',
  borderRadius: '12px',
  border: '1px solid #2d4a6b',
}

const eyebrow = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#5eead4',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

const heading = {
  fontSize: '20px',
  fontWeight: 700,
  marginTop: 0,
  marginBottom: '8px',
  color: '#ffffff',
}

const description = {
  fontSize: '13px',
  color: '#94a3b8',
  lineHeight: 1.5,
  marginBottom: '20px',
  maxWidth: '680px',
}

const reviewBar = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap' as const,
  gap: '10px',
  marginBottom: '10px',
}

const reviewNameField = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flex: 1,
  minWidth: '260px',
}

const reviewNameInput = {
  flex: 1,
  padding: '9px 12px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
}

const reviewStatusSaving = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#facc15',
  whiteSpace: 'nowrap' as const,
}

const reviewStatusSaved = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#4ade80',
  whiteSpace: 'nowrap' as const,
}

const reviewStatusError = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#f87171',
  whiteSpace: 'nowrap' as const,
  cursor: 'help',
}

const reviewButtonGroup = {
  display: 'flex',
  gap: '8px',
}

const reviewBarButton = {
  padding: '9px 14px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  color: '#93c5fd',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
}

const loadPickerBox = {
  padding: '12px 14px',
  borderRadius: '10px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  marginBottom: '14px',
}

const loadPickerHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
}

const loadPickerTitle = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#93c5fd',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.03em',
}

const loadPickerClose = {
  border: 'none',
  background: 'transparent',
  color: '#64748b',
  fontSize: '11px',
  cursor: 'pointer',
}

const loadPickerList = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
}

const loadPickerRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 10px',
  borderRadius: '8px',
  background: '#04142b',
  cursor: 'pointer',
}

const loadPickerName = {
  flex: 1,
  fontSize: '13px',
  fontWeight: 600,
  color: '#e2e8f0',
}

const loadPickerDate = {
  fontSize: '11px',
  color: '#64748b',
}

const loadPickerDelete = {
  border: '1px solid #4a1e2a',
  background: 'transparent',
  color: '#f87171',
  fontSize: '11px',
  cursor: 'pointer',
  padding: '3px 8px',
  borderRadius: '6px',
}

const loadPickerEmpty = {
  margin: 0,
  fontSize: '12px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
}

const modeToggleRow = {
  display: 'flex',
  gap: '8px',
  marginBottom: '12px',
}

const modeButton = {
  padding: '8px 16px',
  background: '#0b1f38',
  border: '1px solid #2d4a6b',
  borderRadius: '8px',
  color: '#94a3b8',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
}

const modeButtonActive = {
  ...modeButton,
  background: '#1B7A7A',
  borderColor: '#1B7A7A',
  color: '#ffffff',
}

const exampleButton = {
  ...modeButton,
  marginLeft: 'auto',
  color: '#93c5fd',
  borderColor: '#2563eb',
}

const dropzone = {
  padding: '32px',
  border: '1.5px dashed #2d4a6b',
  borderRadius: '10px',
  textAlign: 'center' as const,
  cursor: 'pointer',
  marginBottom: '16px',
  background: '#0b1f38',
}

const dropzoneText = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#e2e8f0',
  marginBottom: '4px',
}

const dropzoneSubtext = {
  fontSize: '12px',
  color: '#64748b',
}

const textarea = {
  width: '100%',
  minHeight: '160px',
  padding: '12px',
  background: '#0b1f38',
  border: '1px solid #2d4a6b',
  color: '#ffffff',
  borderRadius: '8px',
  marginBottom: '16px',
  fontFamily: 'monospace',
  fontSize: '13px',
} as const

const summaryRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '16px',
  marginTop: '20px',
  marginBottom: '20px',
}

const summaryCard = {
  padding: '12px 16px',
  background: '#0b1f38',
  border: '1px solid #2d4a6b',
  borderRadius: '8px',
  minWidth: '140px',
  flex: '1 1 140px',
}

const summaryTitle = {
  fontSize: '11px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  marginBottom: '4px',
}

const summaryValue = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#ffffff',
}

const constitutionOverviewRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '20px',
  marginTop: '10px',
  alignItems: 'stretch',
}

const constitutionTableCol = {
  flex: '1 1 320px',
  minWidth: '280px',
}

const constitutionChartCol = {
  flex: '1 1 340px',
  minWidth: '300px',
}

const subPanel = {
  marginTop: '20px',
  padding: '16px',
  background: '#0b1f38',
  borderRadius: '10px',
  border: '1px solid #1e3a5f',
}

const subPanelHeaderRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center' as const,
  flexWrap: 'wrap' as const,
  gap: '10px',
  marginBottom: '10px',
}

const subHeading = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#ffffff',
  margin: 0,
}

const bodyText = {
  fontSize: '13px',
  color: '#cbd5e1',
  lineHeight: 1.6,
}

const selectLabel = {
  display: 'flex',
  alignItems: 'center' as const,
  gap: '8px',
  fontSize: '11px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}

const select = {
  background: '#04142b',
  border: '1px solid #2d4a6b',
  borderRadius: '6px',
  padding: '6px 10px',
  color: '#e2e8f0',
  fontSize: '12px',
}

const tableWrap = {
  overflowX: 'auto' as const,
}

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '13px',
}

const th = {
  textAlign: 'left' as const,
  padding: '8px 10px',
  borderBottom: '1px solid #334155',
  color: '#94a3b8',
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}

const td = {
  padding: '8px 10px',
  borderBottom: '1px solid #1e293b',
  verticalAlign: 'top' as const,
  color: '#e2e8f0',
}

const tdMuted = {
  ...td,
  color: '#94a3b8',
}

const tdWrap = {
  ...td,
  maxWidth: '280px',
  color: '#94a3b8',
  fontSize: '12px',
}

const titleCell = {
  display: 'block',
  fontWeight: 700,
}

const summaryCell = {
  display: 'block',
  fontSize: '11px',
  color: '#64748b',
}

const pill = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.02em',
}

const tdMutedInline = {
  color: '#64748b',
  fontSize: '12px',
}

const pricingStatusOk = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#4ade80',
}

const pricingStatusWarn = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#facc15',
}

const pricingStatusMuted = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#94a3b8',
}

const portfolioValueInput = {
  width: '220px',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
  marginTop: '4px',
}

const weightEditCell = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
}

const weightInput = {
  width: '58px',
  padding: '3px 6px',
  borderRadius: '6px',
  fontSize: '13px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
}

const weightInputOverridden = {
  ...weightInput,
  border: '1px solid #60a5fa',
  background: '#0b2447',
}

const resetWeightButton = {
  border: 'none',
  background: 'transparent',
  color: '#60a5fa',
  fontSize: '11px',
  cursor: 'pointer',
  padding: '2px 4px',
}

const bespokeBanner = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '8px 12px',
  borderRadius: '8px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  color: '#93c5fd',
  fontSize: '12px',
  marginBottom: '10px',
}

const resetAllButton = {
  border: '1px solid #2d4a6b',
  background: 'transparent',
  color: '#93c5fd',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '4px 10px',
  borderRadius: '6px',
}

const yieldOverviewRow = {
  display: 'flex',
  gap: '20px',
  flexWrap: 'wrap' as const,
  margin: '10px 0 14px',
}

const yieldOverviewStat = {
  display: 'flex',
  flexDirection: 'column' as const,
}

const yieldOverviewLabel = {
  fontSize: '11px',
  color: '#94a3b8',
}

const yieldOverviewValue = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#4ade80',
  marginTop: '2px',
}

const assetClassList = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
  marginTop: '10px',
}

const assetClassCard = {
  padding: '14px 16px',
  borderRadius: '12px',
  background: '#0d1f38',
  border: '1px solid #1e3a5f',
}

const assetClassCardHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap' as const,
  marginBottom: '10px',
}

const assetClassCardTitle = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 700,
  color: '#e2e8f0',
}

const typeBadgeSmall = {
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 700,
  background: '#12345b',
  color: '#93c5fd',
}

const countBadgeSmall = {
  marginLeft: 'auto',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: '#12203a',
  color: '#94a3b8',
}

const holdingCardList = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
}

const holdingCardRow = {
  padding: '10px 12px',
  background: '#0b2342',
  borderRadius: '8px',
  border: '1px solid #1e3a5f',
}

const holdingCardHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap' as const,
}

const holdingCardCode = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
}

const holdingCardName = {
  fontSize: '13px',
  color: '#cbd5e1',
}

const holdingCardBadge = {
  marginLeft: 'auto',
}

const holdingCardFieldLabel = {
  fontSize: '11px',
  color: '#94a3b8',
  marginRight: '2px',
}

const holdingCardChange = {
  fontSize: '11px',
  color: '#93c5fd',
  fontWeight: 600,
}

const holdingCardValueRow = {
  display: 'flex',
  gap: '18px',
  flexWrap: 'wrap' as const,
  marginTop: '6px',
  fontSize: '12px',
  color: '#94a3b8',
}

const holdingCardRationale = {
  margin: '6px 0 0',
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.4,
}
