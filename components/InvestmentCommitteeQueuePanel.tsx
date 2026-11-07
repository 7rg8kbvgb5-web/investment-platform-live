'use client'

import { useEffect, useMemo, useState } from 'react'
import Panel from './ui/Panel'
import StatusBox from './dashboard/StatusBox'
import type {
  CommitteeDecision,
  DecisionStatus,
  DecisionSeverity,
  ProposalType,
} from '../lib/engines/investment-committee-decisions'
import type { SecurityImpact } from '../lib/engines/client-impact'
import { fetchCoreSecurities, ASSET_CLASSES, type CoreSecurity } from '../lib/engines/model-portfolio-core'

// Investment Committee decision queue + client impact.
//
// Every proposed swap (from Monitoring, Fund Reviews, or raised manually)
// gets a formal decision here - approve, defer or reject - with a written
// rationale, who decided and when. Each proposal shows which clients hold
// the security in question and the dollars involved, so a decision turns
// straight into a contact list. Approved swaps can be applied to the house
// model in one step.

type Filter = 'open' | 'approved' | 'rejected' | 'all'

const FILTER_LABELS: Record<Filter, string> = {
  open: 'Awaiting decision',
  approved: 'Approved',
  rejected: 'Rejected',
  all: 'All',
}

const SOURCE_LABELS: Record<CommitteeDecision['source'], string> = {
  monitoring: 'Monitoring scan',
  fund_review: 'Fund Review scan',
  manual: 'Raised by adviser',
  tactical: 'Tactical View',
  conviction: 'Conviction rating',
  sector_health: 'Sector Health',
}

const TYPE_LABELS: Record<ProposalType, string> = {
  swap: 'Security swap',
  allocation: 'Allocation change',
  review: 'Holding review',
}

// A review has nothing to apply - its outcomes are "act" or "retain".
const DECISION_LABELS: Record<ProposalType, { approved: string; rejected: string }> = {
  swap: { approved: 'Approve', rejected: 'Reject' },
  allocation: { approved: 'Approve', rejected: 'Reject' },
  review: { approved: 'Action required', rejected: 'Retain' },
}

const SEVERITY_STYLE: Record<DecisionSeverity, { bg: string; fg: string }> = {
  critical: { bg: '#3f1620', fg: '#f87171' },
  high: { bg: '#3f2b12', fg: '#fb923c' },
  medium: { bg: '#3f3a12', fg: '#facc15' },
  low: { bg: '#0d2542', fg: '#94a3b8' },
}

const STATUS_STYLE: Record<DecisionStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: '#0d2542', fg: '#60a5fa', label: 'Pending' },
  deferred: { bg: '#3f3a12', fg: '#facc15', label: 'Deferred' },
  approved: { bg: '#0f3d2e', fg: '#4ade80', label: 'Approved' },
  rejected: { bg: '#3f1620', fg: '#f87171', label: 'Rejected' },
}

const DECIDER_KEY = 'ic-decided-by'

export function InvestmentCommitteeQueuePanel() {
  const [decisions, setDecisions] = useState<CommitteeDecision[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [addedNote, setAddedNote] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('open')
  const [impact, setImpact] = useState<Record<string, SecurityImpact>>({})

  const [showManual, setShowManual] = useState(false)
  const [lookupCode, setLookupCode] = useState('')
  const [lookupResult, setLookupResult] = useState<SecurityImpact | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)

  useEffect(() => {
    load(true)
  }, [])

  async function load(sync: boolean) {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/investment-committee/decisions${sync ? '?sync=1' : ''}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Failed to load the queue.')
      setDecisions(data.decisions)
      if (sync) {
        const parts: string[] = []
        if (data.added > 0) parts.push(`${data.added} new item${data.added === 1 ? '' : 's'} pulled in from the latest scans.`)
        if (Array.isArray(data.warnings) && data.warnings.length > 0) parts.push(data.warnings.join(' '))
        setAddedNote(parts.length > 0 ? parts.join(' ') : null)
      }
      loadImpact(data.decisions)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load the queue.'
      setLoadError(
        message.includes('investment_committee_decisions')
          ? 'The decision queue table isn’t set up yet — run migration 0016 in Supabase, then reload.'
          : message,
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadImpact(list: CommitteeDecision[]) {
    const codes = Array.from(new Set(list.map((d) => d.currentCode).filter((c): c is string => !!c)))
    if (codes.length === 0) return
    try {
      const res = await fetch('/api/investment-committee/client-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes }),
      })
      const data = await res.json()
      if (data.ok) setImpact(data.impact)
    } catch {
      // Impact is supplementary - the queue still works without it.
    }
  }

  async function runLookup() {
    const code = lookupCode.trim()
    if (!code) return
    setLookupLoading(true)
    try {
      const res = await fetch('/api/investment-committee/client-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: [code] }),
      })
      const data = await res.json()
      if (data.ok) setLookupResult(data.impact[code.toUpperCase()] ?? null)
    } finally {
      setLookupLoading(false)
    }
  }

  function replaceDecision(updated: CommitteeDecision) {
    setDecisions((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  const counts = useMemo(
    () => ({
      open: decisions.filter((d) => d.status === 'pending' || d.status === 'deferred').length,
      approved: decisions.filter((d) => d.status === 'approved').length,
      rejected: decisions.filter((d) => d.status === 'rejected').length,
      all: decisions.length,
    }),
    [decisions],
  )

  const visible = decisions.filter((d) => {
    if (filter === 'open') return d.status === 'pending' || d.status === 'deferred'
    if (filter === 'all') return true
    return d.status === filter
  })

  return (
    <Panel
      eyebrow="Investment Committee"
      title="Decision Queue"
      actions={
        <div style={actionsRow}>
          <button type="button" style={secondaryButton} onClick={() => setShowManual((v) => !v)}>
            {showManual ? 'Close' : 'Raise a swap'}
          </button>
          <button type="button" style={secondaryButton} onClick={() => load(true)} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh from scans'}
          </button>
        </div>
      }
    >
      <p style={intro}>
        Everything that could change the house model comes here for a formal decision: named swaps
        from Monitoring and Fund Reviews, tactical overweight/underweight calls as allocation changes,
        and holdings whose conviction has turned negative or whose sector has deteriorated. Each
        decision is recorded with its rationale, who made it and when. Approved swaps and allocation
        changes are applied to the house model in one step, which publishes a new model version.
      </p>

      {showManual ? (
        <ManualProposalForm
          onCreated={(d) => {
            setDecisions((prev) => [d, ...prev])
            setShowManual(false)
            setFilter('open')
            loadImpact([d])
          }}
        />
      ) : null}

      {addedNote ? <StatusBox variant="neutral">{addedNote}</StatusBox> : null}
      {loadError ? <StatusBox variant="error">{loadError}</StatusBox> : null}

      <div style={filterRow}>
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            style={filter === f ? filterButtonActive : filterButton}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABELS[f]} <span style={filterCount}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {loading && decisions.length === 0 ? (
        <p style={emptyText}>Loading…</p>
      ) : visible.length === 0 ? (
        <p style={emptyText}>
          {filter === 'open'
            ? 'Nothing awaiting a decision. New proposals appear here when a scan flags a better alternative, or when one is raised manually.'
            : 'Nothing here yet.'}
        </p>
      ) : (
        <div style={cardList}>
          {visible.map((d) => (
            <DecisionCard
              key={d.id}
              decision={d}
              impact={d.currentCode ? impact[d.currentCode.toUpperCase()] : undefined}
              onUpdated={replaceDecision}
            />
          ))}
        </div>
      )}

      <div style={lookupBox}>
        <p style={sectionTitle}>Who holds…?</p>
        <p style={smallText}>
          Look up any security to see which clients hold it, based on their saved Construction reviews.
        </p>
        <div style={lookupRow}>
          <input
            type="text"
            placeholder="Ticker, e.g. CBA"
            value={lookupCode}
            onChange={(e) => setLookupCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runLookup()
            }}
            style={textInput}
          />
          <button type="button" style={primaryButton} onClick={runLookup} disabled={lookupLoading}>
            {lookupLoading ? 'Looking…' : 'Look up'}
          </button>
        </div>
        {lookupResult ? <ImpactList impact={lookupResult} /> : null}
      </div>
    </Panel>
  )
}

function DecisionCard({
  decision: d,
  impact,
  onUpdated,
}: {
  decision: CommitteeDecision
  impact: SecurityImpact | undefined
  onUpdated: (d: CommitteeDecision) => void
}) {
  const [rationale, setRationale] = useState('')
  const [decidedBy, setDecidedBy] = useState('')
  useEffect(() => {
    try {
      setDecidedBy(window.localStorage.getItem(DECIDER_KEY) ?? '')
    } catch {
      // No stored name - leave blank.
    }
  }, [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClients, setShowClients] = useState(false)
  const [tilt, setTilt] = useState<string>(d.tiltPp !== null ? String(d.tiltPp) : '')
  const [offset, setOffset] = useState<string>(d.offsetAssetClass ?? 'Cash')
  const labels = DECISION_LABELS[d.proposalType]

  const isOpen = d.status === 'pending' || d.status === 'deferred'
  const sev = SEVERITY_STYLE[d.severity]
  const st = STATUS_STYLE[d.status]

  async function decide(status: 'approved' | 'rejected' | 'deferred') {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/investment-committee/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: d.id,
          status,
          rationale,
          decidedBy,
          ...(d.proposalType === 'allocation' ? { tiltPp: parseFloat(tilt), offsetAssetClass: offset } : {}),
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Failed to record the decision.')
      try {
        window.localStorage.setItem(DECIDER_KEY, decidedBy)
      } catch {
        // Remembering the name is a convenience only.
      }
      setRationale('')
      onUpdated(data.decision)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record the decision.')
    } finally {
      setSaving(false)
    }
  }

  async function applyToModel() {
    const ok = window.confirm(
      d.proposalType === 'allocation'
        ? `Apply this allocation change to the house model?\n\n${d.assetClass} ${(d.tiltPp ?? 0) > 0 ? '+' : ''}${d.tiltPp}pp, funded via ${d.offsetAssetClass}, in ${d.riskProfiles?.join(', ') ?? 'every risk profile'}. A new model version is published.`
        : `Apply this swap to the house model?\n\n${d.currentCode} will be replaced by ${d.proposedCode} in ${d.assetClass ?? 'its asset class'} at the same weight, across every risk profile. A new model version is published, and every client review will show the swap in its recommended adjustments.`,
    )
    if (!ok) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/investment-committee/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Failed to apply the swap.')
      onUpdated(data.decision)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply the swap.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={card}>
      <div style={cardHeader}>
        <span style={{ ...pill, background: st.bg, color: st.fg }}>{st.label}</span>
        <span style={{ ...pill, background: sev.bg, color: sev.fg }}>{d.severity.toUpperCase()}</span>
        <span style={typeTag}>{TYPE_LABELS[d.proposalType]}</span>
        <span style={sourceTag}>{SOURCE_LABELS[d.source]}</span>
        <span style={dateTag}>{new Date(d.createdAt).toLocaleDateString('en-AU')}</span>
      </div>

      {d.proposalType === 'swap' ? (
        <div style={swapRow}>
          <div style={swapSide}>
            <span style={swapLabel}>Currently held</span>
            <span style={swapCode}>{d.currentCode}</span>
            <span style={swapName}>{d.currentName ?? ''}</span>
          </div>
          <span style={swapArrow}>→</span>
          <div style={swapSide}>
            <span style={swapLabel}>Proposed replacement</span>
            <span style={swapCode}>{d.proposedCode}</span>
            <span style={swapName}>{d.proposedName ?? ''}</span>
          </div>
          {d.assetClass ? <span style={assetClassTag}>{d.assetClass}</span> : null}
        </div>
      ) : d.proposalType === 'allocation' ? (
        <div style={swapRow}>
          <div style={swapSide}>
            <span style={swapLabel}>Asset class</span>
            <span style={swapCode}>{d.assetClass}</span>
          </div>
          <div style={swapSide}>
            <span style={swapLabel}>Tilt</span>
            <span style={swapCode}>
              {(d.tiltPp ?? 0) > 0 ? '+' : ''}
              {d.tiltPp}pp
            </span>
          </div>
          <div style={swapSide}>
            <span style={swapLabel}>Funded via</span>
            <span style={swapName}>{d.offsetAssetClass}</span>
          </div>
          <span style={assetClassTag}>{d.riskProfiles?.join(', ') ?? 'All risk profiles'}</span>
        </div>
      ) : (
        <div style={swapRow}>
          <div style={swapSide}>
            <span style={swapLabel}>Under review</span>
            <span style={swapCode}>{d.currentCode ?? d.assetClass ?? '—'}</span>
            <span style={swapName}>{d.currentName ?? ''}</span>
          </div>
          {d.assetClass ? <span style={assetClassTag}>{d.assetClass}</span> : null}
        </div>
      )}

      <h4 style={cardTitle}>{d.title}</h4>
      <p style={reasoning}>{d.reasoning}</p>

      {d.currentCode ? (
      <div style={impactRow}>
        {impact === undefined ? (
          <span style={smallText}>Checking client holdings…</span>
        ) : impact.clients.length === 0 ? (
          <span style={smallText}>No saved client reviews hold {d.currentCode}.</span>
        ) : (
          <>
            <span style={impactSummary}>
              Held by <strong>{impact.clients.length}</strong> client
              {impact.clients.length === 1 ? '' : 's'}
              {impact.totalValue > 0 ? (
                <>
                  {' '}
                  · <strong>{formatCurrency(impact.totalValue)}</strong>
                </>
              ) : null}
              {impact.unvaluedCount > 0 ? ` (${impact.unvaluedCount} without a portfolio value)` : ''}
            </span>
            <button type="button" style={linkButton} onClick={() => setShowClients((v) => !v)}>
              {showClients ? 'Hide clients' : 'Show clients'}
            </button>
          </>
        )}
      </div>
      ) : null}
      {showClients && impact ? <ImpactList impact={impact} /> : null}

      {isOpen ? (
        <div style={decisionBox}>
          <textarea
            placeholder="Committee rationale — why this is being approved, deferred or rejected"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            style={textarea}
          />
          {d.proposalType === 'allocation' ? (
            <div style={decisionRow}>
              <label style={inlineLabel}>
                Tilt (pp)
                <input
                  type="number"
                  step={0.5}
                  value={tilt}
                  onChange={(e) => setTilt(e.target.value)}
                  style={{ ...textInput, width: '90px' }}
                />
              </label>
              <label style={inlineLabel}>
                Funded via
                <select value={offset} onChange={(e) => setOffset(e.target.value)} style={{ ...textInput, width: 'auto' }}>
                  {ASSET_CLASSES.filter((ac) => ac.name !== d.assetClass).map((ac) => (
                    <option key={ac.name} value={ac.name}>
                      {ac.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          <div style={decisionRow}>
            <input
              type="text"
              placeholder="Decided by"
              value={decidedBy}
              onChange={(e) => setDecidedBy(e.target.value)}
              style={{ ...textInput, maxWidth: '220px' }}
            />
            <button type="button" style={approveButton} disabled={saving} onClick={() => decide('approved')}>
              {labels.approved}
            </button>
            <button type="button" style={deferButton} disabled={saving} onClick={() => decide('deferred')}>
              Defer
            </button>
            <button type="button" style={rejectButton} disabled={saving} onClick={() => decide('rejected')}>
              {labels.rejected}
            </button>
          </div>
          {d.status === 'deferred' && d.decisionRationale ? (
            <p style={priorNote}>
              Previously deferred by {d.decidedBy}
              {d.decidedAt ? ` on ${new Date(d.decidedAt).toLocaleDateString('en-AU')}` : ''}: {d.decisionRationale}
            </p>
          ) : null}
        </div>
      ) : (
        <div style={recordBox}>
          <p style={recordLine}>
            <strong>
              {d.status === 'approved'
                ? labels.approved === 'Approve'
                  ? 'Approved'
                  : labels.approved
                : d.status === 'rejected'
                  ? labels.rejected === 'Reject'
                    ? 'Rejected'
                    : 'Retained'
                  : STATUS_STYLE[d.status].label}
            </strong>{' '}
            by {d.decidedBy ?? '—'}
            {d.decidedAt ? ` on ${new Date(d.decidedAt).toLocaleDateString('en-AU')}` : ''}
          </p>
          {d.decisionRationale ? <p style={recordRationale}>{d.decisionRationale}</p> : null}
          {d.status === 'approved' && d.proposalType === 'review' ? (
            <p style={priorNote}>
              Next step: raise a swap for {d.currentCode ?? 'the affected holdings'} with a named replacement, or
              adjust its weight on the Model Portfolio tab.
            </p>
          ) : null}
          {d.status === 'approved' && d.proposalType !== 'review' ? (
            d.appliedToModel ? (
              <>
                <p style={appliedNote}>
                  Applied to the house model
                  {d.appliedAt ? ` on ${new Date(d.appliedAt).toLocaleDateString('en-AU')}` : ''}.
                </p>
                {d.proposalType === 'swap' ? (
                  <p style={priorNote}>
                    Check {d.proposedCode} on the Model Portfolio tab: set its forward yield and holding
                    type (listed/unlisted fund, direct equity, etc.) so income figures and Fund Reviews pick
                    it up correctly.
                  </p>
                ) : null}
              </>
            ) : (
              <button type="button" style={primaryButton} disabled={saving} onClick={applyToModel}>
                Apply to model portfolio
              </button>
            )
          ) : null}
        </div>
      )}

      {error ? <StatusBox variant="error">{error}</StatusBox> : null}
    </div>
  )
}

function ImpactList({ impact }: { impact: SecurityImpact }) {
  if (impact.clients.length === 0) {
    return <p style={smallText}>No saved client reviews hold {impact.code}.</p>
  }
  return (
    <table style={table}>
      <thead>
        <tr>
          <th style={th}>Client</th>
          <th style={th}>Weight</th>
          <th style={th}>Value</th>
          <th style={th}>Review updated</th>
        </tr>
      </thead>
      <tbody>
        {impact.clients.map((c) => (
          <tr key={c.reviewId}>
            <td style={td}>{c.clientName}</td>
            <td style={td}>{c.weight}%</td>
            <td style={td}>{c.value !== null ? formatCurrency(c.value) : '—'}</td>
            <td style={tdMuted}>{new Date(c.updatedAt).toLocaleDateString('en-AU')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ManualProposalForm({ onCreated }: { onCreated: (d: CommitteeDecision) => void }) {
  const [securities, setSecurities] = useState<CoreSecurity[]>([])
  const [currentCode, setCurrentCode] = useState('')
  const [proposedCode, setProposedCode] = useState('')
  const [proposedName, setProposedName] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [severity, setSeverity] = useState<DecisionSeverity>('medium')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCoreSecurities()
      .then(setSecurities)
      .catch(() => setSecurities([]))
  }, [])

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/investment-committee/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentCode, proposedCode, proposedName, reasoning, severity }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Failed to add the proposal.')
      onCreated(data.decision)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add the proposal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={manualBox}>
      <p style={sectionTitle}>Raise a swap for committee review</p>
      <div style={manualGrid}>
        <label style={fieldLabel}>
          Currently held
          <select style={textInput} value={currentCode} onChange={(e) => setCurrentCode(e.target.value)}>
            <option value="">Choose a model holding…</option>
            {securities.map((s) => (
              <option key={s.id} value={s.code}>
                {s.code} — {s.name} ({s.assetClass})
              </option>
            ))}
          </select>
        </label>
        <label style={fieldLabel}>
          Proposed replacement (ticker)
          <input style={textInput} value={proposedCode} onChange={(e) => setProposedCode(e.target.value)} />
        </label>
        <label style={fieldLabel}>
          Replacement name
          <input style={textInput} value={proposedName} onChange={(e) => setProposedName(e.target.value)} />
        </label>
        <label style={fieldLabel}>
          Priority
          <select
            style={textInput}
            value={severity}
            onChange={(e) => setSeverity(e.target.value as DecisionSeverity)}
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>
      <textarea
        placeholder="Reasoning — why the replacement offers a better risk-adjusted outcome"
        value={reasoning}
        onChange={(e) => setReasoning(e.target.value)}
        style={textarea}
      />
      <button type="button" style={primaryButton} onClick={submit} disabled={saving}>
        {saving ? 'Adding…' : 'Add to queue'}
      </button>
      {error ? <StatusBox variant="error">{error}</StatusBox> : null}
    </div>
  )
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

const intro = { fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 16px', maxWidth: '760px' }
const actionsRow = { display: 'flex', gap: '8px' }
const buttonBase = {
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid #2d4a6b',
}
const secondaryButton = { ...buttonBase, background: '#0d1f38', color: '#e2e8f0' }
const primaryButton = { ...buttonBase, background: '#0e7490', color: '#ffffff', border: '1px solid #0891b2' }
const approveButton = { ...buttonBase, background: '#0f3d2e', color: '#4ade80', border: '1px solid #22c55e' }
const deferButton = { ...buttonBase, background: '#3f3a12', color: '#facc15', border: '1px solid #ca8a04' }
const rejectButton = { ...buttonBase, background: '#3f1620', color: '#f87171', border: '1px solid #dc2626' }
const linkButton = {
  background: 'none',
  border: 'none',
  color: '#38bdf8',
  fontSize: '12px',
  cursor: 'pointer',
  padding: 0,
}
const filterRow = { display: 'flex', gap: '8px', flexWrap: 'wrap' as const, margin: '8px 0 16px' }
const filterButton = { ...buttonBase, background: '#0d1f38', color: '#94a3b8' }
const filterButtonActive = { ...buttonBase, background: '#0b2447', color: '#ffffff', border: '1px solid #38bdf8' }
const filterCount = { marginLeft: '6px', color: '#5eead4' }
const cardList = { display: 'flex', flexDirection: 'column' as const, gap: '14px' }
const card = { padding: '16px', borderRadius: '12px', background: '#0d1f38', border: '1px solid #1e3a5f' }
const cardHeader = { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const, marginBottom: '12px' }
const pill = {
  padding: '3px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.04em',
}
const sourceTag = { fontSize: '11px', color: '#94a3b8' }
const typeTag = { fontSize: '11px', fontWeight: 700, color: '#5eead4' }
const inlineLabel = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }
const dateTag = { marginLeft: 'auto', fontSize: '11px', color: '#64748b' }
const swapRow = { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' as const, marginBottom: '10px' }
const swapSide = { display: 'flex', flexDirection: 'column' as const, gap: '2px', minWidth: '160px' }
const swapLabel = { fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const swapCode = { fontSize: '18px', fontWeight: 700, color: '#38bdf8' }
const swapName = { fontSize: '12px', color: '#cbd5e1' }
const swapArrow = { fontSize: '20px', color: '#5eead4' }
const assetClassTag = {
  marginLeft: 'auto',
  fontSize: '11px',
  color: '#cbd5e1',
  padding: '3px 8px',
  borderRadius: '6px',
  background: '#0b2447',
}
const cardTitle = { margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }
const reasoning = { margin: '0 0 10px', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }
const impactRow = { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const, marginBottom: '8px' }
const impactSummary = { fontSize: '13px', color: '#e2e8f0' }
const decisionBox = { marginTop: '12px', display: 'flex', flexDirection: 'column' as const, gap: '8px' }
const decisionRow = { display: 'flex', gap: '8px', flexWrap: 'wrap' as const, alignItems: 'center' }
const textarea = {
  width: '100%',
  minHeight: '64px',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
  marginBottom: '8px',
}
const textInput = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
  boxSizing: 'border-box' as const,
}
const priorNote = { fontSize: '12px', color: '#facc15', margin: 0, lineHeight: 1.5 }
const recordBox = {
  marginTop: '12px',
  padding: '10px 12px',
  borderRadius: '8px',
  background: '#0b2447',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
  alignItems: 'flex-start',
}
const recordLine = { margin: 0, fontSize: '13px', color: '#e2e8f0' }
const recordRationale = { margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }
const appliedNote = { margin: 0, fontSize: '12px', color: '#4ade80' }
const lookupBox = { marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1e3a5f' }
const lookupRow = { display: 'flex', gap: '8px', maxWidth: '420px', margin: '8px 0 12px' }
const sectionTitle = { margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }
const smallText = { margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }
const emptyText = { margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' as const }
const manualBox = {
  padding: '14px',
  borderRadius: '10px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  marginBottom: '16px',
}
const manualGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '10px',
  margin: '10px 0',
}
const fieldLabel = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  fontSize: '11px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}
const table = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px', marginTop: '6px' }
const th = {
  textAlign: 'left' as const,
  padding: '6px 8px',
  color: '#94a3b8',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  borderBottom: '1px solid #2d4a6b',
}
const td = { padding: '6px 8px', color: '#e2e8f0', borderBottom: '1px solid #1e3a5f' }
const tdMuted = { ...td, color: '#94a3b8' }
