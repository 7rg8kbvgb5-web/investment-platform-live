'use client'

import { useState } from 'react'
import type { ClientAdvice } from '../lib/engines/client-advice'
import { saveClientObjectives, type ClientObjectives } from '../lib/engines/client-portfolio-reviews'
import { exclusionStatus, type ExclusionCheck } from '../lib/engines/exclusions-check'
import { runStressTest, STRESS_SCENARIOS } from '../lib/engines/stress-test'
import { afterAdviceWeights, currentWeights } from '../lib/pdf/proposal/insights'

// Client Advice checks shown before the proposal goes out:
// - Exclusions check: recommended holdings vs the client's stated exclusions.
// - Stress test: the same historical shocks the proposal shows, current vs recommended.

export function ExclusionsCheckPanel({
  reviewId,
  advice,
  objectives,
  onSaved,
}: {
  reviewId: string
  advice: ClientAdvice
  objectives: ClientObjectives | null
  onSaved: (o: ClientObjectives) => void
}) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const holdings = advice.resultingHoldings
  const status = exclusionStatus(objectives?.constraints, objectives?.exclusionCheck, holdings.map((h) => h.code))

  async function run() {
    if (!objectives) return
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/proposals/exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          constraints: objectives.constraints,
          holdings: holdings.map((h) => ({ code: h.code, name: h.name, assetClass: h.assetClass, holdingType: h.holdingType ?? null })),
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Check failed.')
      const next: ClientObjectives = { ...objectives, exclusionCheck: json.check as ExclusionCheck }
      await saveClientObjectives(reviewId, next)
      onSaved(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed.')
    } finally {
      setRunning(false)
    }
  }

  const check = 'check' in status ? status.check : null
  return (
    <div style={box}>
      {status.state === 'no-constraints' ? (
        <p style={muted}>
          No constraints recorded. Add any exclusions (e.g. &ldquo;no fossil fuels or gambling&rdquo;) under Client objectives,
          save, and the recommended holdings can be checked against them.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ ...pill, ...PILL[status.state] }}>{PILL_LABEL[status.state]}</span>
              {check ? (
                <span style={{ ...muted, marginLeft: '10px' }}>
                  Checked {new Date(check.checkedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                  {check.exclusions.length ? ` · exclusions read: ${check.exclusions.join(', ')}` : ''}
                </span>
              ) : null}
            </div>
            <button type="button" style={button} onClick={run} disabled={running}>
              {running ? 'Checking…' : check ? 'Re-run check' : 'Run exclusions check'}
            </button>
          </div>
          {status.state === 'stale' ? <p style={{ ...muted, marginTop: '8px' }}>Out of date: {status.reason}.</p> : null}
          {status.state === 'no-exclusions' ? (
            <p style={{ ...muted, marginTop: '8px' }}>The constraints don&apos;t state any exclusions, so there&apos;s nothing to check.</p>
          ) : null}
          {status.state === 'clear' ? (
            <p style={{ ...muted, marginTop: '8px' }}>
              None of the {status.check.codes.length} recommended holdings conflict. The proposal notes that the portfolio has
              been checked against the client&apos;s exclusions.
            </p>
          ) : null}
          {status.state === 'conflicts' ? (
            <ul style={{ margin: '10px 0 0', paddingLeft: '18px', fontSize: '13px', color: '#e2e8f0' }}>
              {status.check.conflicts.map((c) => (
                <li key={c.code} style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#38bdf8' }}>{c.code}</strong> {c.name} —{' '}
                  <span style={{ color: c.severity === 'conflict' ? '#f87171' : '#facc15' }}>
                    {c.severity === 'conflict' ? 'conflicts with' : 'possible exposure to'} {c.exclusion}
                  </span>
                  {c.reason ? <span style={muted}> · {c.reason}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {status.state === 'conflicts' ? (
            <p style={{ ...muted, marginTop: '8px' }}>
              Swap or exclude these on the Construction tab, or record why they stay in the adviser notes, then re-run.
            </p>
          ) : null}
        </>
      )}
      {error ? <p style={{ ...muted, color: '#f87171', marginTop: '8px' }}>{error}</p> : null}
    </div>
  )
}

export function StressTestTable({ advice }: { advice: ClientAdvice }) {
  const after = runStressTest(afterAdviceWeights(advice), advice.totalAfter)
  const nowWeights = currentWeights(advice)
  const showNow = !advice.isNewMoney && Object.keys(nowWeights).length > 0
  const now = showNow ? runStressTest(nowWeights, advice.existingValue) : null
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            <th>Event</th>
            {showNow ? <th>Current portfolio</th> : null}
            <th>Recommended</th>
            <th>On {advice.totalAfter ? fmt(advice.totalAfter) : 'the portfolio'}</th>
          </tr>
        </thead>
        <tbody>
          {after.map((r, i) => (
            <tr key={r.key}>
              <td>
                {r.name} <span style={muted}>{STRESS_SCENARIOS[i].period}</span>
              </td>
              {showNow && now ? <td style={{ color: tone(now[i].returnPct) }}>{signed(now[i].returnPct)}</td> : null}
              <td style={{ color: tone(r.returnPct), fontWeight: 700 }}>{signed(r.returnPct)}</td>
              <td style={{ color: tone(r.returnPct) }}>{r.change !== null ? `${r.change < 0 ? '-' : '+'}${fmt(Math.abs(r.change))}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const PILL: Record<string, { background: string; color: string }> = {
  'not-run': { background: '#3f2b12', color: '#facc15' },
  stale: { background: '#3f2b12', color: '#facc15' },
  'no-exclusions': { background: '#1e293b', color: '#cbd5e1' },
  clear: { background: '#0f3d2e', color: '#4ade80' },
  conflicts: { background: '#3f1620', color: '#f87171' },
}
const PILL_LABEL: Record<string, string> = {
  'not-run': 'Not checked',
  stale: 'Needs re-running',
  'no-exclusions': 'No exclusions stated',
  clear: 'No conflicts',
  conflicts: 'Conflicts found',
}

function signed(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}
function tone(v: number): string {
  return v < 0 ? '#f87171' : '#4ade80'
}
function fmt(v: number): string {
  return v.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

const box = { padding: '14px 16px', borderRadius: '10px', background: '#0d1f38', border: '1px solid #1e3a5f' }
const pill = { display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }
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
