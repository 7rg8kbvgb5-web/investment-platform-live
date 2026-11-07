'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CommitteeDecision } from '../lib/engines/investment-committee-decisions'
import { normaliseCode } from '../lib/engines/security-universe'

// Shown at the top of a client's Construction review when they hold a
// security the Investment Committee has approved replacing - so the
// adviser sees the committee's decision and reasoning right where the
// client's portfolio is being worked on. Renders nothing otherwise.

export default function ApprovedSwapsBanner({ heldCodes }: { heldCodes: string[] }) {
  const [swaps, setSwaps] = useState<CommitteeDecision[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/investment-committee/approved-swaps')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.ok) setSwaps(data.swaps ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const held = useMemo(() => new Set(heldCodes.map(normaliseCode)), [heldCodes])
  const relevant = swaps.filter((s) => s.currentCode && held.has(normaliseCode(s.currentCode)))
  if (relevant.length === 0) return null

  return (
    <div style={box}>
      <p style={title}>Investment Committee decisions affecting this client</p>
      <ul style={list}>
        {relevant.map((s) => (
          <li key={s.id} style={item}>
            <span>
              Replace <span style={code}>{s.currentCode}</span> with{' '}
              <span style={code}>{s.proposedCode}</span>
              {s.proposedName ? ` (${s.proposedName})` : ''} — approved{' '}
              {s.decidedAt ? new Date(s.decidedAt).toLocaleDateString('en-AU') : ''}
              {s.appliedToModel ? ', already reflected in the model below.' : ', not yet applied to the model.'}
            </span>
            {s.decisionRationale ? <span style={rationale}>{s.decisionRationale}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

const box = {
  padding: '12px 16px',
  borderRadius: '10px',
  background: '#0f3d2e',
  border: '1px solid #22c55e',
  marginBottom: '16px',
}
const title = {
  margin: '0 0 6px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#4ade80',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}
const list = { margin: 0, paddingLeft: '18px' }
const item = { fontSize: '13px', color: '#dcfce7', lineHeight: 1.6, marginBottom: '4px' }
const code = { fontWeight: 700, color: '#38bdf8' }
const rationale = { display: 'block', fontSize: '12px', color: '#a7f3d0' }
