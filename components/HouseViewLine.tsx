'use client'

import { formatRatingDate, type HouseViewEntry } from '../lib/engines/house-view'

// One quiet line under a holding: the broker's rating, target, upside, risk
// and rating date. An amber note appears only when a check fails.

const LEAN_COLOUR = { bullish: '#4ade80', neutral: '#e2e8f0', bearish: '#f87171' } as const

export default function HouseViewLine({ view }: { view: HouseViewEntry | undefined }) {
  if (!view) return null
  const rated = formatRatingDate(view.ratingDate)
  return (
    <p style={line}>
      <span style={muted}>{view.source}: </span>
      <strong style={{ color: LEAN_COLOUR[view.lean] }}>{view.rating}</strong>
      {view.priceTarget !== null ? <span style={muted}> · target ${view.priceTarget.toFixed(2)}</span> : null}
      {view.upside !== null ? (
        <span style={{ color: view.upside >= 0 ? '#4ade80' : '#f87171' }}>
          {' '}
          ({view.upside >= 0 ? '+' : ''}
          {(view.upside * 100).toFixed(1)}%)
        </span>
      ) : null}
      {view.risk ? <span style={muted}> · {view.risk} risk</span> : null}
      {rated ? <span style={muted}> · rated {rated}</span> : null}
      {view.flags.length > 0 ? <span style={flag}> ⚠ {view.flags.join(' · ')}</span> : null}
    </p>
  )
}

const line = { margin: '8px 0 0', fontSize: '12px', lineHeight: 1.5 }
const muted = { color: '#94a3b8' }
const flag = { color: '#fbbf24', marginLeft: '6px' }
