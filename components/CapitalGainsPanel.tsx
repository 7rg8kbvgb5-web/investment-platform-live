'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Panel from './ui/Panel'
import StatusBox from './dashboard/StatusBox'
import { listClientReviews, saveCgtSettings, type ClientPortfolioReview } from '../lib/engines/client-portfolio-reviews'
import type { ClientAdvice } from '../lib/engines/client-advice'
import { loadAdviceForReview } from '../lib/engines/client-advice-loader'
import {
  calculateCgt,
  CGT_DISCLAIMERS,
  ENTITY_LABELS,
  type CgtSettings,
  type CgtSaleInput,
  type EntityType,
} from '../lib/tax/cgt'
import { salesFromAdvice, settingsWithStatementDefaults } from '../lib/tax/cgt-for-review'
import { getTaxReference, saveTaxReference, type TaxReference } from '../lib/tax/tax-reference'
import { currentUserEmail } from '../lib/engines/model-versioning'

// Capital Gains/Losses: an estimate of the tax consequences of the sales in
// a review's recommended trades, by the entity the investments are held in,
// using ATO-published rates. Can be included in or left out of the proposal.

const INDIVIDUAL_TYPES: EntityType[] = ['individual', 'joint', 'trust']

export default function CapitalGainsPanel() {
  const [reviews, setReviews] = useState<{ id: string; clientName: string }[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [review, setReview] = useState<ClientPortfolioReview | null>(null)
  const [advice, setAdvice] = useState<ClientAdvice | null>(null)
  const [sales, setSales] = useState<CgtSaleInput[]>([])
  const [settings, setSettings] = useState<CgtSettings | null>(null)
  const [reference, setReference] = useState<TaxReference | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const [checking, setChecking] = useState(false)
  const [proposedRef, setProposedRef] = useState<TaxReference | null>(null)

  useEffect(() => {
    getTaxReference().then(setReference)
    listClientReviews()
      .then((list) => {
        setReviews(list)
        const fromUrl = new URLSearchParams(window.location.search).get('review')
        setSelectedId(fromUrl && list.some((r) => r.id === fromUrl) ? fromUrl : list[0]?.id ?? '')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load reviews.'))
  }, [])

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const { review: r, advice: a } = await loadAdviceForReview(id, null)
      const s = salesFromAdvice(a)
      setReview(r)
      setAdvice(a)
      setSales(s)
      setSettings(settingsWithStatementDefaults(r, s))
      setSaveState('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the review.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) load(selectedId)
  }, [selectedId, load])

  // Autosave settings shortly after each change.
  useEffect(() => {
    if (!review || !settings || saveState !== 'saving') return
    const t = setTimeout(async () => {
      try {
        await saveCgtSettings(review.id, settings)
        setSaveState('saved')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save.')
        setSaveState('idle')
      }
    }, 800)
    return () => clearTimeout(t)
  }, [settings, review, saveState])

  function update(patch: Partial<CgtSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev))
    setSaveState('saving')
  }

  function updateHolding(code: string, patch: Partial<{ costBase: number | null; over12Months: boolean }>) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            holdings: {
              ...prev.holdings,
              [code]: { costBase: null, over12Months: true, ...prev.holdings[code], ...patch },
            },
          }
        : prev,
    )
    setSaveState('saving')
  }

  const result = useMemo(
    () => (settings && reference ? calculateCgt(sales, settings, reference) : null),
    [sales, settings, reference],
  )

  async function checkAto() {
    setChecking(true)
    setError(null)
    try {
      const res = await fetch('/api/tax/reference/check', { method: 'POST' })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'ATO check failed.')
      setProposedRef(data.proposed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ATO check failed.')
    } finally {
      setChecking(false)
    }
  }

  async function approveRates() {
    if (!proposedRef) return
    try {
      const by = await currentUserEmail()
      await saveTaxReference({ ...proposedRef, verifiedBy: by ?? 'Adviser' }, by)
      setReference({ ...proposedRef, verifiedBy: by ?? 'Adviser' })
      setProposedRef(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rates.')
    }
  }

  const isIndividualLike = settings ? INDIVIDUAL_TYPES.includes(settings.entityType) : false

  return (
    <Panel eyebrow="Tax" title="Capital Gains / Losses">
      <p style={intro}>
        An estimate of the capital gains tax on the sales in a review&apos;s recommended trades, based on the entity
        the investments are held in and the ATO&apos;s published rates. Choose whether to include it in the proposal.
      </p>

      <div style={row}>
        <label style={field}>
          Review
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={select}>
            {reviews.length === 0 ? <option value="">No saved reviews yet</option> : null}
            {reviews.map((r) => (
              <option key={r.id} value={r.id}>
                {r.clientName}
              </option>
            ))}
          </select>
        </label>
        {settings ? (
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.includeInProposal}
              onChange={(e) => update({ includeInProposal: e.target.checked })}
            />
            Include in the proposal
          </label>
        ) : null}
        {saveState === 'saving' ? <span style={muted}>Saving…</span> : saveState === 'saved' ? <span style={savedText}>Saved</span> : null}
      </div>

      {error ? <StatusBox variant="error">{error}</StatusBox> : null}
      {loading ? <StatusBox variant="neutral">Loading the review&apos;s recommended trades…</StatusBox> : null}

      {settings && reference && result && !loading ? (
        <>
          <div style={settingsGrid}>
            <label style={field}>
              Investments held in
              <select
                value={settings.entityType}
                onChange={(e) => update({ entityType: e.target.value as EntityType })}
                style={select}
              >
                {(Object.keys(ENTITY_LABELS) as EntityType[]).map((t) => (
                  <option key={t} value={t}>
                    {ENTITY_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>

            {isIndividualLike ? (
              <>
                <label style={field}>
                  {settings.entityType === 'trust' ? "Beneficiary's marginal rate" : 'Marginal tax rate'}
                  <select
                    value={settings.marginalRate}
                    onChange={(e) => update({ marginalRate: parseFloat(e.target.value) })}
                    style={select}
                  >
                    {reference.residentBrackets.map((b) => (
                      <option key={b.from} value={b.rate}>
                        {Math.round(b.rate * 100)}% — {fmt(b.from)}
                        {b.to ? ` to ${fmt(b.to)}` : ' and over'}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settings.includeMedicare}
                    onChange={(e) => update({ includeMedicare: e.target.checked })}
                  />
                  Add {Math.round(reference.medicareLevy * 100)}% Medicare levy
                </label>
              </>
            ) : null}

            {settings.entityType === 'company' ? (
              <label style={checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.baseRateEntity}
                  onChange={(e) => update({ baseRateEntity: e.target.checked })}
                />
                Base rate entity ({Math.round(reference.baseRateEntityRate * 100)}%) — investment companies with mostly
                passive income usually aren&apos;t
              </label>
            ) : null}

            <label style={field}>
              Carried-forward capital losses
              <input
                type="number"
                step={1000}
                min={0}
                value={settings.carryForwardLosses || ''}
                placeholder="0"
                onChange={(e) => update({ carryForwardLosses: parseFloat(e.target.value) || 0 })}
                style={select}
              />
            </label>
          </div>

          {advice && advice.approach === 'new-cash' ? (
            <StatusBox variant="neutral">
              This review invests new cash without selling, so there are no capital gains to estimate. Switch it to a
              full rebalance in the cash bar on the Construction tab to see the tax on the sales.
            </StatusBox>
          ) : sales.length === 0 ? (
            <StatusBox variant="neutral">The recommended trades for this review don&apos;t include any sales.</StatusBox>
          ) : (
            <>
              <h3 style={sectionTitle}>Sales in the recommended trades</h3>
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Security</th>
                      <th>Sale proceeds</th>
                      <th>Cost base (whole holding)</th>
                      <th>Held 12+ months</th>
                      <th>Cost base of sale</th>
                      <th>Gain / (loss)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.lines.map((line) => {
                      const h = settings.holdings[line.code]
                      return (
                        <tr key={line.code}>
                          <td style={codeStyle}>{line.code}</td>
                          <td>{line.name}</td>
                          <td>
                            {fmt(line.proceeds)}
                            {line.proceeds < line.holdingValue - 1 ? <span style={muted}> (part sale)</span> : null}
                          </td>
                          <td>
                            <input
                              type="number"
                              step={100}
                              min={0}
                              value={h?.costBase ?? ''}
                              placeholder="Enter"
                              onChange={(e) =>
                                updateHolding(line.code, {
                                  costBase: e.target.value === '' ? null : parseFloat(e.target.value),
                                })
                              }
                              style={{ ...select, width: '130px', minWidth: 0 }}
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={h?.over12Months ?? true}
                              onChange={(e) => updateHolding(line.code, { over12Months: e.target.checked })}
                            />
                          </td>
                          <td>{line.costBaseApplied !== null ? fmt(line.costBaseApplied) : '—'}</td>
                          <td style={{ color: line.gain === null ? '#94a3b8' : line.gain >= 0 ? '#e2e8f0' : '#4ade80' }}>
                            {line.gain === null ? '—' : line.gain >= 0 ? fmt(line.gain) : `(${fmt(-line.gain)})`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {result.missingCostBase.length > 0 ? (
                <p style={warnText}>
                  No cost base yet for {result.missingCostBase.join(', ')} — excluded from the estimate until one is
                  entered.
                </p>
              ) : null}

              <h3 style={sectionTitle}>Estimate</h3>
              {result.notCalculated ? (
                <StatusBox variant="warning">
                  Not calculated for a foreign resident. Australian CGT generally applies only to taxable Australian
                  property, and portfolio holdings in listed shares usually aren&apos;t. The investor may be taxed on these
                  gains in their country of residence at its own rates — they should get advice there.
                </StatusBox>
              ) : (
                <div style={statGrid}>
                  <Stat label="Capital gains" value={fmt(result.grossGains)} />
                  <Stat label="Capital losses (this year)" value={result.currentYearLosses ? `(${fmt(result.currentYearLosses)})` : '—'} />
                  <Stat label="Carried-forward losses used" value={result.carryForwardUsed ? `(${fmt(result.carryForwardUsed)})` : '—'} />
                  <Stat label="CGT discount" value={result.discountApplied ? `(${fmt(result.discountApplied)})` : '—'} />
                  <Stat label="Net capital gain" value={fmt(result.netCapitalGain)} />
                  <Stat label="Estimated tax" value={fmt(result.estimatedTax)} highlight sub={result.rateDescription} />
                  {result.lossesCarriedForward > 0 ? (
                    <Stat label="Losses to carry forward" value={fmt(result.lossesCarriedForward)} />
                  ) : null}
                </div>
              )}
            </>
          )}

          <StatusBox variant="warning">
            <strong>2027 change:</strong> {reference.reformNote}
          </StatusBox>

          <div style={disclaimerBox}>
            <p style={disclaimerTitle}>Important</p>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              {CGT_DISCLAIMERS.map((d) => (
                <li key={d} style={disclaimerItem}>
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div style={refBox}>
            <div style={row}>
              <span style={muted}>
                Rates: ATO, {reference.financialYear} · verified {reference.verifiedAt} ({reference.verifiedBy})
              </span>
              <button type="button" style={linkButton} onClick={checkAto} disabled={checking}>
                {checking ? 'Checking the ATO…' : 'Check the ATO for updates'}
              </button>
            </div>
            <p style={muted}>
              Sources:{' '}
              {reference.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 ? ' · ' : ''}
                  <a href={s.url} target="_blank" rel="noreferrer" style={link}>
                    {s.label}
                  </a>
                </span>
              ))}
            </p>
            {proposedRef ? (
              <div style={proposedBox}>
                <p style={disclaimerTitle}>Rates found on the ATO site ({proposedRef.financialYear}) — check before approving</p>
                <p style={muted}>
                  Brackets:{' '}
                  {proposedRef.residentBrackets.map((b) => `${Math.round(b.rate * 100)}% from ${fmt(b.from)}`).join(' · ')}
                  {' · '}Medicare {pctText(proposedRef.medicareLevy)} · Company {pctText(proposedRef.companyRate)} / base
                  rate {pctText(proposedRef.baseRateEntityRate)} · SMSF {pctText(proposedRef.smsfAccumulationRate)} ·
                  Discounts: individual {pctText(proposedRef.cgtDiscount.individual)}, trust{' '}
                  {pctText(proposedRef.cgtDiscount.trust)}, SMSF {pctText(proposedRef.cgtDiscount.smsf)}, company{' '}
                  {pctText(proposedRef.cgtDiscount.company)}
                </p>
                <p style={muted}>{proposedRef.reformNote}</p>
                <div style={row}>
                  <button type="button" style={primaryButton} onClick={approveRates}>
                    Approve and use these rates
                  </button>
                  <button type="button" style={linkButton} onClick={() => setProposedRef(null)}>
                    Discard
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </Panel>
  )
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{ ...stat, ...(highlight ? { borderColor: '#38bdf8' } : {}) }}>
      <span style={statLabel}>{label}</span>
      <span style={statValue}>{value}</span>
      {sub ? <span style={muted}>{sub}</span> : null}
    </div>
  )
}

function fmt(v: number): string {
  return v.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

function pctText(r: number): string {
  return `${Math.round(r * 1000) / 10}%`
}

const intro = { fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 14px', maxWidth: '760px' }
const row = { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' as const }
const field = { display: 'flex', flexDirection: 'column' as const, gap: '5px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const select = { padding: '8px 10px', borderRadius: '8px', fontSize: '13px', background: '#04142b', border: '1px solid #2d4a6b', color: '#e2e8f0', minWidth: '220px', textTransform: 'none' as const, letterSpacing: 'normal' }
const checkboxLabel = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#e2e8f0' }
const settingsGrid = { display: 'flex', gap: '16px', flexWrap: 'wrap' as const, alignItems: 'flex-end', margin: '18px 0' }
const sectionTitle = { fontSize: '15px', fontWeight: 700, color: '#e2e8f0', margin: '20px 0 10px' }
const codeStyle = { fontWeight: 700, color: '#38bdf8' }
const muted = { fontSize: '12px', color: '#94a3b8', margin: 0 }
const savedText = { fontSize: '12px', color: '#4ade80' }
const warnText = { fontSize: '12px', color: '#facc15', margin: '8px 0 0' }
const statGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '16px' }
const stat = { display: 'flex', flexDirection: 'column' as const, gap: '3px', padding: '10px 12px', borderRadius: '10px', background: '#0d1f38', border: '1px solid #1e3a5f' }
const statLabel = { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const statValue = { fontSize: '17px', fontWeight: 700, color: '#ffffff' }
const disclaimerBox = { padding: '12px 16px', borderRadius: '10px', background: '#0b2447', border: '1px solid #2d4a6b', margin: '14px 0' }
const disclaimerTitle = { margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: '#5eead4', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const disclaimerItem = { fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '4px' }
const refBox = { paddingTop: '12px', borderTop: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column' as const, gap: '6px' }
const proposedBox = { padding: '12px', borderRadius: '10px', background: '#0d1f38', border: '1px solid #38bdf8', display: 'flex', flexDirection: 'column' as const, gap: '6px' }
const link = { color: '#38bdf8' }
const linkButton = { background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer', padding: 0 }
const primaryButton = { padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: '#0e7490', color: '#ffffff', border: '1px solid #0891b2' }
