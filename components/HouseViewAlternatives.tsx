'use client'

import { useState } from 'react'
import { formatRatingDate, type HouseViewEntry } from '../lib/engines/house-view'

// Collapsed by default: Ord Minnett Buy/Accumulate-rated securities that
// aren't in the model, best upside to target first. Loads only when opened.

const SHOW = 15

export default function HouseViewAlternatives() {
  const [ideas, setIdeas] = useState<HouseViewEntry[] | null>(null)
  const [pricesAvailable, setPricesAvailable] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  async function load() {
    if (ideas || error) return
    try {
      const res = await fetch('/api/research/house-view-alternatives', { cache: 'no-store' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Could not load ideas.')
      setIdeas(json.ideas)
      setPricesAvailable(json.pricesAvailable)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load ideas.')
    }
  }

  const visible = ideas ? (showAll ? ideas : ideas.slice(0, SHOW)) : []

  return (
    <details style={wrap} onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && load()}>
      <summary style={summary}>
        Ord Minnett Buy-rated ideas not in the model{ideas ? ` (${ideas.length})` : ''}
      </summary>
      <div style={{ marginTop: '12px' }}>
        {error ? <p style={note}>{error}</p> : null}
        {!ideas && !error ? <p style={note}>Loading…</p> : null}
        {ideas && ideas.length === 0 ? <p style={note}>Every Buy-rated security is already in the model, or no coverage universe has been uploaded.</p> : null}
        {ideas && ideas.length > 0 ? (
          <>
            <p style={{ ...note, marginTop: 0 }}>
              {pricesAvailable
                ? 'Ranked by upside to Ord Minnett’s price target. Raise any you want to consider through the Investment Committee.'
                : 'Upside to target appears once whole-market prices are available (EODHD paid plan); until then, most recently rated first.'}
            </p>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Company</th>
                    <th>Rating</th>
                    <th>Target</th>
                    <th>Upside</th>
                    <th>Risk</th>
                    <th>Rated</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((v) => (
                    <tr key={v.code}>
                      <td style={{ color: '#38bdf8', fontWeight: 700 }}>{v.code}</td>
                      <td>{v.name ?? '—'}</td>
                      <td>{v.rating}</td>
                      <td>{v.priceTarget !== null ? `$${v.priceTarget.toFixed(2)}` : '—'}</td>
                      <td style={{ color: v.upside === null ? undefined : v.upside >= 0 ? '#4ade80' : '#f87171' }}>
                        {v.upside === null ? '—' : `${v.upside >= 0 ? '+' : ''}${(v.upside * 100).toFixed(1)}%`}
                      </td>
                      <td>{v.risk ?? '—'}</td>
                      <td style={{ color: v.flags.some((f) => f.includes('12 months')) ? '#fbbf24' : undefined }}>
                        {formatRatingDate(v.ratingDate) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ideas.length > SHOW ? (
              <button type="button" className="ui-button ui-button-secondary" style={{ marginTop: '10px' }} onClick={() => setShowAll((s) => !s)}>
                {showAll ? 'Show top 15' : `Show all ${ideas.length}`}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </details>
  )
}

const wrap = { marginTop: '20px', padding: '14px 16px', borderRadius: '10px', border: '1px solid #1e3a5f', background: '#0d1f38' }
const summary = { cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#e2e8f0' }
const note = { margin: '8px 0', fontSize: '12px', color: '#94a3b8' }
