'use client'

import { useEffect, useState } from 'react'
import type { ClientAdvice } from '../lib/engines/client-advice'
import {
  EMPTY_OBJECTIVES,
  saveClientObjectives,
  type ClientObjectives,
} from '../lib/engines/client-portfolio-reviews'

// Client Advice additions: the client's objectives (open the proposal),
// income today vs recommended, and the record of proposals issued.

const GOALS: { value: NonNullable<ClientObjectives['primaryGoal']>; label: string }[] = [
  { value: 'growth', label: 'Long-term growth' },
  { value: 'balanced', label: 'Growth and income' },
  { value: 'income', label: 'Reliable income' },
  { value: 'preservation', label: 'Capital preservation' },
]

export function ObjectivesEditor({
  reviewId,
  initial,
  onSaved,
}: {
  reviewId: string
  initial: ClientObjectives | null
  onSaved: (o: ClientObjectives) => void
}) {
  const [o, setO] = useState<ClientObjectives>(initial ?? EMPTY_OBJECTIVES)
  const [incomeText, setIncomeText] = useState(initial?.incomeNeed ? String(initial.incomeNeed) : '')
  const [yearsText, setYearsText] = useState(initial?.timeframeYears ? String(initial.timeframeYears) : '')
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setO(initial ?? EMPTY_OBJECTIVES)
    setIncomeText(initial?.incomeNeed ? String(initial.incomeNeed) : '')
    setYearsText(initial?.timeframeYears ? String(initial.timeframeYears) : '')
    setStatus(null)
  }, [reviewId, initial])

  async function save() {
    const next: ClientObjectives = {
      ...o,
      incomeNeed: parseNum(incomeText),
      timeframeYears: parseNum(yearsText),
      constraints: o.constraints.trim(),
    }
    setSaving(true)
    setStatus(null)
    try {
      await saveClientObjectives(reviewId, next)
      setO(next)
      onSaved(next)
      setStatus('Saved - these open the proposal.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={box}>
      <div style={grid}>
        <label style={field}>
          <span style={label}>Primary goal</span>
          <select
            value={o.primaryGoal ?? ''}
            onChange={(e) => setO({ ...o, primaryGoal: (e.target.value || null) as ClientObjectives['primaryGoal'] })}
            style={input}
          >
            <option value="">Not set</option>
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label style={field}>
          <span style={label}>Income needed from the portfolio ($ p.a.)</span>
          <input value={incomeText} onChange={(e) => setIncomeText(e.target.value)} placeholder="e.g. 60000, or leave blank" style={input} />
        </label>
        <label style={field}>
          <span style={label}>Investment timeframe (years)</span>
          <input value={yearsText} onChange={(e) => setYearsText(e.target.value)} placeholder="e.g. 10" style={input} />
        </label>
      </div>
      <label style={{ ...field, marginTop: '10px' }}>
        <span style={label}>Preferences and constraints (no personal details)</span>
        <textarea
          value={o.constraints}
          onChange={(e) => setO({ ...o, constraints: e.target.value })}
          placeholder="e.g. Keep $50k accessible in cash; prefers fully franked income; no thermal coal exposure."
          style={{ ...input, minHeight: '60px', fontFamily: 'inherit' }}
        />
      </label>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
        <button type="button" onClick={save} disabled={saving} style={button}>
          {saving ? 'Saving…' : 'Save objectives'}
        </button>
        {status ? <span style={muted}>{status}</span> : null}
      </div>
    </div>
  )
}

export function IncomeComparison({ advice, onLookedUp }: { advice: ClientAdvice; onLookedUp: () => void }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  if (advice.isNewMoney) return null

  async function lookUp() {
    setBusy(true)
    setMessage(`Looking up income for ${advice.incomeLookupNeeded.length} holding(s) - this can take a minute or two…`)
    try {
      const res = await fetch('/api/securities/income-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: advice.incomeLookupNeeded }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Lookup failed.')
      const failed = Object.entries(data.results as Record<string, { ok: boolean }>).filter(([, r]) => !r.ok).map(([c]) => c)
      setMessage(
        `Looked up ${data.looked} holding(s)${failed.length ? `; couldn't find income for ${failed.join(', ')}` : ''}. Remembered for every future client.`,
      )
      onLookedUp()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Lookup failed.')
    } finally {
      setBusy(false)
    }
  }

  const change =
    advice.currentIncome !== null && advice.projectedIncome !== null ? advice.projectedIncome - advice.currentIncome : null

  return (
    <div style={box}>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'baseline' }}>
        <Figure label="Income today" value={advice.currentIncome !== null ? fmt(advice.currentIncome) : '—'} sub={advice.currentYieldPct !== null ? `${advice.currentYieldPct}% yield · ${advice.currentIncomeCoveragePct}% of holdings with known yields` : `${advice.currentIncomeCoveragePct}% of holdings with known yields`} />
        <Figure label="Recommended" value={advice.projectedIncome !== null ? fmt(advice.projectedIncome) : '—'} sub={advice.projectedYieldPct !== null ? `${advice.projectedYieldPct}% yield` : undefined} />
        {change !== null ? (
          <Figure label="Change" value={`${change >= 0 ? '+' : '-'}${fmt(Math.abs(change))}`} sub="per year" tone={change >= 0 ? '#4ade80' : '#f87171'} />
        ) : null}
      </div>
      {advice.incomeLookupNeeded.length > 0 ? (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
          <button type="button" onClick={lookUp} disabled={busy} style={button}>
            {busy ? 'Looking up…' : `Look up income for ${advice.incomeLookupNeeded.length} holding${advice.incomeLookupNeeded.length === 1 ? '' : 's'}`}
          </button>
          <span style={muted}>{advice.incomeLookupNeeded.map((h) => h.code).join(', ')}</span>
        </div>
      ) : null}
      {message ? <p style={{ ...muted, marginTop: '8px' }}>{message}</p> : null}
      {advice.currentIncomeCoveragePct < 80 && advice.currentIncome !== null ? (
        <p style={{ ...muted, marginTop: '6px' }}>
          The proposal shows the income comparison once at least 80% of today&apos;s holdings have a known yield.
        </p>
      ) : null}
    </div>
  )
}

type ProposalRow = {
  id: string
  generatedAt: string
  generatedBy: string | null
  riskProfile: string | null
  modelVersion: number | null
  totalValue: number | null
  hasPdf: boolean
}

export function ProposalHistory({ reviewId, refreshKey }: { reviewId: string; refreshKey: number }) {
  const [rows, setRows] = useState<ProposalRow[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/proposals/records?review=${encodeURIComponent(reviewId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setRows(d.ok ? d.records : [])
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [reviewId, refreshKey])

  if (rows === null) return <p style={muted}>Loading…</p>
  if (rows.length === 0)
    return <p style={muted}>No proposals issued yet. Each PDF you download is kept here, under the review reference.</p>
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            <th>Issued</th>
            <th>By</th>
            <th>Profile</th>
            <th>Model</th>
            <th>Value</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                {new Date(r.generatedAt).toLocaleString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: 'Australia/Sydney',
                })}
              </td>
              <td style={muted}>{r.generatedBy ?? '—'}</td>
              <td>{r.riskProfile ?? '—'}</td>
              <td>{r.modelVersion !== null ? `v${r.modelVersion}` : '—'}</td>
              <td>{r.totalValue !== null ? fmt(r.totalValue) : '—'}</td>
              <td>
                {r.hasPdf ? (
                  <a href={`/api/proposals/records/download?id=${r.id}`} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>
                    Open PDF
                  </a>
                ) : (
                  <span style={muted}>snapshot only</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Figure({ label: l, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={label}>{l}</span>
      <span style={{ fontSize: '20px', fontWeight: 700, color: tone ?? '#ffffff' }}>{value}</span>
      {sub ? <span style={muted}>{sub}</span> : null}
    </div>
  )
}

function parseNum(v: string): number | null {
  const n = Number(v.replace(/[$,\s]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function fmt(v: number): string {
  return v.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

const box = { padding: '14px 16px', borderRadius: '10px', background: '#0d1f38', border: '1px solid #1e3a5f' }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }
const field = { display: 'flex', flexDirection: 'column' as const, gap: '4px' }
const label = { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const input = {
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
  boxSizing: 'border-box' as const,
  width: '100%',
}
const button = {
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  background: '#0e7490',
  color: '#ffffff',
  border: '1px solid #0891b2',
}
const muted = { fontSize: '12px', color: '#94a3b8' }
