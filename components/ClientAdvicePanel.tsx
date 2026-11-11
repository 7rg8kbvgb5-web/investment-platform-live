'use client'
import { resolveModelId } from '../lib/model-context'
import { ObjectivesEditor, IncomeComparison, ProposalHistory } from './ClientAdviceExtras'

import { useCallback, useEffect, useState } from 'react'
import Panel from './ui/Panel'
import StatusBox from './dashboard/StatusBox'
import {
  listClientReviews,
  updateClientAdvice,
  type ClientPortfolioReview,
  type ClientStatus,
} from '../lib/engines/client-portfolio-reviews'
import type { AdviceApproach, ClientAdvice } from '../lib/engines/client-advice'
import { loadAdviceForReview } from '../lib/engines/client-advice-loader'
import { cgtForReview } from '../lib/tax/cgt-for-review'
import { getTaxReference } from '../lib/tax/tax-reference'
import type { CgtResult } from '../lib/tax/cgt'

// Client Advice: the end of the chain. Takes a client's saved review from
// the Construction tab and turns it into the proposal - recommended trades
// (a full rebalance, or new cash invested without selling), the resulting
// allocation against the model, projected income, any Investment Committee
// decisions affecting their holdings, the model version it's built on, and
// the adviser's own notes. Produces the branded PDF from exactly the same
// calculation, and tracks the client through proposed -> implemented.

const STATUS_LABEL: Record<ClientStatus, string> = {
  in_progress: 'In progress',
  proposed: 'Proposed',
  implemented: 'Implemented',
}

const ACTION_STYLE: Record<string, { bg: string; fg: string }> = {
  buy: { bg: '#0f3d2e', fg: '#4ade80' },
  increase: { bg: '#0f3d2e', fg: '#4ade80' },
  reduce: { bg: '#3f2b12', fg: '#facc15' },
  sell: { bg: '#3f1620', fg: '#f87171' },
}

export default function ClientAdvicePanel() {
  const [clients, setClients] = useState<{ id: string; clientName: string; updatedAt: string }[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [review, setReview] = useState<ClientPortfolioReview | null>(null)
  const [advice, setAdvice] = useState<ClientAdvice | null>(null)
  const [approach, setApproach] = useState<AdviceApproach | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedNote, setSavedNote] = useState<string | null>(null)
  // Printed on the PDF only - sent with the download, never saved.
  const [pdfClientName, setPdfClientName] = useState('')
  const [pdfCount, setPdfCount] = useState(0)
  const [cgt, setCgt] = useState<CgtResult | null>(null)

  useEffect(() => {
    listClientReviews()
      .then((all) => {
        // Your own model's clients first.
        const selected = resolveModelId()
        const list = [...all.filter((c) => c.modelId === selected), ...all.filter((c) => c.modelId !== selected)]
        setClients(list)
        const fromUrl = new URLSearchParams(window.location.search).get('review')
        const initial = fromUrl && list.some((c) => c.id === fromUrl) ? fromUrl : list[0]?.id ?? ''
        setSelectedId(initial)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load clients.'))
  }, [])

  const compute = useCallback(async (id: string, approachChoice: AdviceApproach | null) => {
    setLoading(true)
    setError(null)
    try {
      const { review: r, advice: full } = await loadAdviceForReview(id, approachChoice)
      setReview(r)
      setAdvice(full)
      if (full.approach === 'rebalance') {
        const reference = await getTaxReference()
        const { result } = cgtForReview(r, full, reference)
        setCgt(result.lines.length > 0 ? result : null)
      } else {
        setCgt(null)
      }
      setApproach(full.approach)
      setNotes(r.adviserNotes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build the advice.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) {
      setSavedNote(null)
      setPdfClientName('')
      compute(selectedId, null)
    }
  }, [selectedId, compute])

  async function changeApproach(next: AdviceApproach) {
    if (!review) return
    setApproach(next)
    await compute(review.id, next)
    try {
      await updateClientAdvice(review.id, { adviceApproach: next })
    } catch {
      // Before migration 0021 the choice just isn't remembered.
    }
  }

  async function saveNotes() {
    if (!review) return
    setSaving(true)
    try {
      await updateClientAdvice(review.id, { adviserNotes: notes })
      setSavedNote('Notes saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notes.')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(status: ClientStatus) {
    if (!review || !advice) return
    const message =
      status === 'proposed'
        ? 'Mark this advice as proposed to the client? The proposal as it stands now is recorded so it can be referred back to.'
        : 'Mark this advice as implemented? The client then appears in drift monitoring as an implemented portfolio.'
    if (!window.confirm(message)) return
    setSaving(true)
    try {
      await updateClientAdvice(review.id, {
        status,
        adviserNotes: notes,
        ...(status === 'proposed' ? { proposalSnapshot: { ...advice, adviserNotes: notes, recordedAt: new Date().toISOString() } } : {}),
      })
      setReview({ ...review, status })
      setSavedNote(`Marked as ${STATUS_LABEL[status].toLowerCase()}.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update.'
      setError(msg.includes('status') ? 'Run migration 0021 in Supabase to track proposal status.' : msg)
    } finally {
      setSaving(false)
    }
  }


  const buys = advice?.trades.filter((t) => t.action === 'buy' || t.action === 'increase') ?? []
  const sells = advice?.trades.filter((t) => t.action === 'sell' || t.action === 'reduce') ?? []
  const totalBuys = buys.reduce((s, t) => s + (t.value ?? 0), 0)
  const totalSells = sells.reduce((s, t) => s + Math.abs(t.value ?? 0), 0)

  return (
    <Panel eyebrow="Client Advice" title="Proposal">
      <div style={topRow}>
        <label style={fieldLabel}>
          Client
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={select}>
            {clients.length === 0 ? <option value="">No saved clients yet</option> : null}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName}
              </option>
            ))}
          </select>
        </label>
        {review ? <span style={statusPill}>{STATUS_LABEL[review.status]}</span> : null}
        {advice ? (
          <div style={actions}>
            <form
              method="POST"
              action="/api/proposals/pdf"
              target="_blank"
              style={pdfForm}
              onSubmit={(e) => {
                if (
                  advice.unmappedHoldings.length > 0 &&
                  !window.confirm(
                    `${advice.unclassifiedWeightPct}% of this portfolio (${advice.unmappedHoldings.length} holdings) is still unclassified and won't appear in the proposal. Generate it anyway?`,
                  )
                ) {
                  e.preventDefault()
                  return
                }
                // The record is written while the PDF renders; refresh the list shortly after.
                setTimeout(() => setPdfCount((n) => n + 1), 8000)
              }}
            >
              <input type="hidden" name="review" value={review?.id ?? ''} />
              <input type="hidden" name="approach" value={approach ?? ''} />
              <input
                name="clientName"
                value={pdfClientName}
                onChange={(e) => setPdfClientName(e.target.value)}
                placeholder="Client name for the PDF (not saved)"
                autoComplete="off"
                style={nameInput}
                title="Printed on this proposal only. Never stored on the platform."
              />
              <button type="submit" style={primaryButton}>
                Download proposal (PDF)
              </button>
            </form>
            {review?.status === 'in_progress' ? (
              <button type="button" style={secondaryButton} onClick={() => setStatus('proposed')} disabled={saving}>
                Mark as proposed
              </button>
            ) : null}
            {review?.status !== 'implemented' ? (
              <button type="button" style={secondaryButton} onClick={() => setStatus('implemented')} disabled={saving}>
                Mark as implemented
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {clients.length === 0 && !error ? (
        <StatusBox variant="neutral">
          Name a client on the Construction tab (upload their statement, or start a new-money review) and they appear
          here to build the proposal.
        </StatusBox>
      ) : null}
      {error ? <StatusBox variant="error">{error}</StatusBox> : null}
      {savedNote ? <StatusBox variant="success">{savedNote}</StatusBox> : null}
      {loading ? <StatusBox variant="neutral">Building the advice from the current model…</StatusBox> : null}

      {advice && !loading ? (
        <>
          {advice.warnings.length > 0 ? (
            <StatusBox variant="warning">
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {advice.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </StatusBox>
          ) : null}

          <div style={statRow}>
            <Stat label="Risk profile" value={`${advice.riskProfile}${advice.riskProfileSource === 'estimated' ? ' (est.)' : ''}`} />
            <Stat label="House model" value={advice.currentModelVersion !== null ? `v${advice.currentModelVersion}` : '—'} />
            {!advice.isNewMoney ? (
              <Stat label="Current value" value={advice.existingValue !== null ? fmt(advice.existingValue) : '—'} />
            ) : null}
            {advice.newCash > 0 ? <Stat label={advice.isNewMoney ? 'Lump sum' : 'New cash'} value={fmt(advice.newCash)} /> : null}
            <Stat
              label="Projected income"
              value={advice.projectedIncome !== null ? `${fmt(advice.projectedIncome)} p.a.` : '—'}
              sub={advice.projectedYieldPct !== null ? `${advice.projectedYieldPct}% on ${advice.yieldCoveragePct}% with stated yields` : undefined}
            />
            <Stat
              label="Franking credits"
              value={advice.projectedFrankingCredits !== null ? `${fmt(advice.projectedFrankingCredits)} p.a.` : '—'}
              sub={
                advice.projectedGrossedUpYieldPct !== null
                  ? `${advice.projectedGrossedUpYieldPct}% grossed-up yield`
                  : undefined
              }
            />
            {!advice.isNewMoney ? (
              <Stat label="Drift vs model" value={`${advice.maxDriftPp}pp`} sub={advice.driftStatus.replace('-', ' ')} />
            ) : null}
          </div>

          {!advice.isNewMoney && advice.newCash > 0 ? (
            <div style={approachRow}>
              <span style={fieldLabelText}>Approach</span>
              <button
                type="button"
                style={approach === 'new-cash' ? toggleActive : toggle}
                onClick={() => changeApproach('new-cash')}
              >
                Invest new cash only — no sells
              </button>
              <button
                type="button"
                style={approach === 'rebalance' ? toggleActive : toggle}
                onClick={() => changeApproach('rebalance')}
              >
                Full rebalance
              </button>
            </div>
          ) : null}

          {cgt ? (
            <div style={cgtLine}>
              <span>
                <strong>Capital gains estimate:</strong>{' '}
                {cgt.notCalculated
                  ? 'not calculated (foreign resident)'
                  : `${fmt(cgt.estimatedTax)} estimated tax on ${fmt(cgt.netCapitalGain)} net capital gain`}
                {cgt.missingCostBase.length > 0 ? ` · ${cgt.missingCostBase.length} sale(s) missing a cost base` : ''}
              </span>
              <span style={muted}>
                {review?.cgtSettings?.includeInProposal ? 'Included in the proposal' : 'Not included in the proposal'} ·{' '}
                <a href={`/portfolios?tab=capitalGains&review=${review?.id}`} style={{ color: '#38bdf8' }}>
                  Capital Gains / Losses tab
                </a>
              </span>
            </div>
          ) : null}

          {advice.relevantDecisions.length > 0 ? (
            <div style={icBox}>
              <p style={icTitle}>Investment Committee decisions affecting this client</p>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {advice.relevantDecisions.map((d) => (
                  <li key={d.id} style={icItem}>
                    Replace <strong style={codeStyle}>{d.currentCode}</strong> with{' '}
                    <strong style={codeStyle}>{d.proposedCode}</strong>
                    {d.decisionRationale ? ` — ${d.decisionRationale}` : ''}
                    {d.appliedToModel ? '' : ' (not yet applied to the model, so not in the trades below)'}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {review ? (
            <>
              <h3 style={sectionTitle}>
                Client objectives <span style={sectionSub}>Opens the proposal - goals, income need, timeframe</span>
              </h3>
              <ObjectivesEditor
                reviewId={review.id}
                initial={review.objectives}
                onSaved={(objectives) => setReview({ ...review, objectives })}
              />
            </>
          ) : null}

          {!advice.isNewMoney ? (
            <>
              <h3 style={sectionTitle}>
                Income today vs recommended <span style={sectionSub}>Shown in the proposal&apos;s income section</span>
              </h3>
              <IncomeComparison advice={advice} onLookedUp={() => review && compute(review.id, approach)} />
            </>
          ) : null}

          <h3 style={sectionTitle}>Asset allocation</h3>
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Asset class</th>
                  {!advice.isNewMoney ? <th>Current</th> : null}
                  <th>Model target</th>
                  <th>After advice</th>
                </tr>
              </thead>
              <tbody>
                {advice.assetClasses
                  .filter((r) => r.modelWeight > 0 || r.clientWeight > 0)
                  .map((r) => {
                    const after = advice.cashDeployment
                      ? advice.cashDeployment.assetClasses.find((a) => a.assetClass === r.assetClass)?.afterWeight ?? 0
                      : r.modelWeight
                    return (
                      <tr key={r.assetClass}>
                        <td>{r.assetClass}</td>
                        {!advice.isNewMoney ? <td>{r.clientWeight}%</td> : null}
                        <td>{r.modelWeight}%</td>
                        <td>{after}%</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          <h3 style={sectionTitle}>
            Recommended trades
            <span style={sectionSub}>
              {buys.length} buy{buys.length === 1 ? '' : 's'} {totalBuys > 0 ? `(${fmt(totalBuys)})` : ''}
              {sells.length > 0 ? ` · ${sells.length} sell${sells.length === 1 ? '' : 's'} (${fmt(totalSells)})` : ''}
            </span>
          </h3>
          {advice.trades.length === 0 ? (
            <p style={muted}>No changes needed — the portfolio is in line with the model.</p>
          ) : (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Code</th>
                    <th>Security</th>
                    <th>Asset class</th>
                    <th>Value</th>
                    <th>Units</th>
                    <th>Weight now → target</th>
                  </tr>
                </thead>
                <tbody>
                  {advice.trades.map((t) => {
                    const st = ACTION_STYLE[t.action]
                    return (
                      <tr key={`${t.code}-${t.action}`}>
                        <td>
                          <span style={{ ...pill, background: st.bg, color: st.fg }}>{t.action.toUpperCase()}</span>
                        </td>
                        <td style={codeStyle}>{t.code}</td>
                        <td>
                          {t.name}
                          {t.treatment === 'staged_exit' ? (
                            <span style={{ ...muted, marginLeft: 6, fontSize: 11, color: '#fbbf24' }}>staged exit</span>
                          ) : null}
                        </td>
                        <td style={muted}>{t.assetClass}</td>
                        <td>{t.value !== null ? fmt(Math.abs(t.value)) : '—'}</td>
                        <td>{t.units !== null ? Math.abs(t.units).toLocaleString() : <span style={muted}>by $</span>}</td>
                        <td style={muted}>
                          {t.currentWeight}% → {t.targetWeight}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {advice.retainedHoldings.length > 0 ? (
            <>
              <h3 style={sectionTitle}>Retained outside the model</h3>
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Security</th>
                      <th>Asset class</th>
                      <th>Value</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advice.retainedHoldings.map((h) => (
                      <tr key={h.code}>
                        <td style={codeStyle}>{h.code}</td>
                        <td>{h.name}</td>
                        <td style={muted}>{h.assetClass}</td>
                        <td>{h.currentValue !== null ? fmt(h.currentValue) : `${h.currentWeight}%`}</td>
                        <td style={h.reason ? undefined : { color: '#f87171' }}>{h.reason ?? 'No reason recorded'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {advice.unmappedHoldings.length > 0 ? (
            <p style={{ ...muted, color: '#fbbf24' }}>
              Not yet in this proposal ({advice.unclassifiedWeightPct}% of the portfolio, unclassified):{' '}
              {advice.unmappedHoldings.map((h) => h.code).join(', ')}. Classify them on the Construction tab before
              presenting.
            </p>
          ) : null}

          <h3 style={sectionTitle}>Adviser notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Your commentary for this client — context, objectives, why this approach. Appears in the proposal."
            style={textarea}
          />
          <button type="button" style={secondaryButton} onClick={saveNotes} disabled={saving}>
            {saving ? 'Saving…' : 'Save notes'}
          </button>

          {review ? (
            <>
              <h3 style={sectionTitle}>
                Proposals issued <span style={sectionSub}>Every PDF downloaded, kept under the review reference</span>
              </h3>
              <ProposalHistory reviewId={review.id} refreshKey={pdfCount} />
            </>
          ) : null}
        </>
      ) : null}
    </Panel>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={stat}>
      <span style={statLabel}>{label}</span>
      <span style={statValue}>{value}</span>
      {sub ? <span style={muted}>{sub}</span> : null}
    </div>
  )
}

function fmt(value: number): string {
  return value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

const topRow = { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' as const, marginBottom: '16px' }
const fieldLabel = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }
const fieldLabelText = { fontSize: '12px', color: '#94a3b8' }
const select = { padding: '8px 10px', borderRadius: '8px', fontSize: '13px', background: '#04142b', border: '1px solid #2d4a6b', color: '#e2e8f0', minWidth: '220px' }
const statusPill = { padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: '#0d2542', color: '#60a5fa' }
const actions = { display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' as const }
const buttonBase = { padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }
const pdfForm = { display: 'flex', gap: '8px', alignItems: 'center', margin: 0 }
const nameInput = { padding: '8px 10px', borderRadius: '8px', fontSize: '12px', background: '#04142b', border: '1px solid #2d4a6b', color: '#e2e8f0', width: '230px' }
const primaryButton = { ...buttonBase, background: '#0e7490', color: '#ffffff', border: '1px solid #0891b2' }
const secondaryButton = { ...buttonBase, background: '#0d1f38', color: '#e2e8f0', border: '1px solid #2d4a6b' }
const statRow = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', margin: '12px 0 16px' }
const stat = { display: 'flex', flexDirection: 'column' as const, gap: '3px', padding: '10px 12px', borderRadius: '10px', background: '#0d1f38', border: '1px solid #1e3a5f' }
const statLabel = { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const statValue = { fontSize: '17px', fontWeight: 700, color: '#ffffff' }
const approachRow = { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const, marginBottom: '16px' }
const toggle = { ...buttonBase, background: '#0d1f38', color: '#94a3b8', border: '1px solid #2d4a6b' }
const toggleActive = { ...buttonBase, background: '#0b2447', color: '#ffffff', border: '1px solid #38bdf8' }
const cgtLine = { display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' as const, padding: '10px 14px', borderRadius: '10px', background: '#0d1f38', border: '1px solid #1e3a5f', marginBottom: '16px', fontSize: '13px', color: '#e2e8f0' }
const icBox = { padding: '12px 16px', borderRadius: '10px', background: '#0f3d2e', border: '1px solid #22c55e', marginBottom: '16px' }
const icTitle = { margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const icItem = { fontSize: '13px', color: '#dcfce7', lineHeight: 1.6 }
const codeStyle = { fontWeight: 700, color: '#38bdf8' }
const sectionTitle = { fontSize: '15px', fontWeight: 700, color: '#e2e8f0', margin: '22px 0 10px', display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' as const }
const sectionSub = { fontSize: '12px', fontWeight: 400, color: '#94a3b8' }
const pill = { padding: '3px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700 }
const muted = { fontSize: '12px', color: '#94a3b8' }
const textarea = { width: '100%', minHeight: '100px', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', background: '#04142b', border: '1px solid #2d4a6b', color: '#e2e8f0', fontFamily: 'inherit', boxSizing: 'border-box' as const, marginBottom: '8px' }
