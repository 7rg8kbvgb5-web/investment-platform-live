'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import Panel from './ui/Panel'
import Badge from './ui/Badge'
import type { ShortRow, TrackerResult } from '../lib/engines/small-cap-tracker'

const ACCENT = '#38bdf8'
const GRID = '#1e3a5f'
const AXIS = '#94a3b8'
const tooltipStyle = { background: '#0b2342', border: '1px solid #2d4a6b', fontSize: '12px' }

export default function SmallCapTrackerPanel() {
  const [data, setData] = useState<TrackerResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newLevel, setNewLevel] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [levelError, setLevelError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/market-tracker', { cache: 'no-store' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Could not load the tracker.')
      setData(json.tracker)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the tracker.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function addLevel() {
    setLevelError(null)
    const res = await fetch('/api/market-tracker/levels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: Number(newLevel.replace(/,/g, '')), label: newLabel }),
    })
    const json = await res.json()
    if (!json.ok) return setLevelError(json.error ?? 'Could not save the level.')
    setNewLevel('')
    setNewLabel('')
    load()
  }

  async function removeLevel(id: string) {
    await fetch(`/api/market-tracker/levels?id=${id}`, { method: 'DELETE' })
    load()
  }

  const refresh = (
    <button type="button" className="ui-button ui-button-secondary" onClick={load} disabled={loading}>
      {loading ? 'Loading…' : 'Refresh'}
    </button>
  )

  if (!data) {
    return (
      <Panel title="Small & mid-cap tracker" actions={refresh}>
        <p className="ui-empty-state">{error ?? 'Loading market data…'}</p>
      </Panel>
    )
  }

  const { indices, relativeStrength, performance, signal, levels, breadth, shorts } = data
  const lastRs = relativeStrength.at(-1)
  const nearestSupport = levels.filter((l) => l.kind === 'support').sort((a, b) => b.level - a.level)[0]
  const chartData = relativeStrength.map((p) => ({ ...p, label: shortDate(p.date) }))
  const breadthData = breadth.history.map((d, i, arr) => ({
    label: shortDate(d.tradeDate),
    pct: round1(d.pctAdvancing * 100),
    avg10: i >= 9 ? round1((arr.slice(i - 9, i + 1).reduce((s, x) => s + x.pctAdvancing, 0) / 10) * 100) : null,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {data.errors.length > 0 ? (
        <div className="ui-item-card" style={{ borderColor: '#f59e0b' }}>
          {data.errors.map((e) => (
            <p key={e} style={{ margin: 0, color: '#fbbf24', fontSize: '13px' }}>
              {e}
            </p>
          ))}
        </div>
      ) : null}

      <Panel
        eyebrow={indices.lastDate ? `Close of ${longDate(indices.lastDate)}` : undefined}
        title="Small & mid-cap snapshot"
        actions={refresh}
      >
        <div className="ui-stat-grid">
          <Stat label={indices.smallLabel} value={num(indices.smallLast)} />
          <Stat label={indices.largeLabel} value={num(indices.largeLast)} />
          <Stat
            label="Relative strength vs 50-day avg"
            value={lastRs && lastRs.ratioMa50 !== null ? signedPct(lastRs.ratio / lastRs.ratioMa50 - 1) : '–'}
            tone={lastRs && lastRs.ratioMa50 !== null ? (lastRs.ratio >= lastRs.ratioMa50 ? 'up' : 'down') : undefined}
          />
          <Stat
            label="Breadth (% advancing)"
            value={breadth.today ? `${round1(breadth.today.pctAdvancing * 100)}%` : '–'}
            tone={breadth.today ? (breadth.today.pctAdvancing >= 0.5 ? 'up' : 'down') : undefined}
          />
          <Stat
            label="Nearest support"
            value={nearestSupport ? `${num(nearestSupport.level)} (${signedPct(nearestSupport.distancePct)})` : '–'}
          />
          <Stat label="Median short interest" value={shorts.medianPct !== null ? `${shorts.medianPct.toFixed(2)}%` : '–'} />
        </div>
        {signal ? (
          <p style={{ margin: '14px 0 0', fontSize: '14px', color: '#e2e8f0' }}>
            <Badge variant={signal.tone === 'leading' ? 'success' : signal.tone === 'lagging' ? 'danger' : 'warning'}>
              {signal.tone === 'leading' ? 'Small caps leading' : signal.tone === 'lagging' ? 'Small caps lagging' : 'Mixed'}
            </Badge>{' '}
            {signal.text}
          </p>
        ) : null}
      </Panel>

      <Panel title="Small Ords vs ASX 200 relative strength" eyebrow="Ratio rebased to 100 a year ago - rising means small caps are outperforming">
        {chartData.length === 0 ? (
          <p className="ui-empty-state">No index data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke={GRID} />
              <XAxis dataKey="label" stroke={AXIS} minTickGap={40} fontSize={11} />
              <YAxis stroke={AXIS} domain={['auto', 'auto']} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '12px' }} />
              <ReferenceLine y={100} stroke="#475569" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="ratio" name="Small Ords / ASX 200" stroke={ACCENT} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="ratioMa50" name="50-day average" stroke="#fbbf24" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {performance.length > 0 ? (
          <div className="ui-table-wrap" style={{ marginTop: '12px' }}>
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Small Ords</th>
                  <th>ASX 200</th>
                  <th>Small caps vs ASX 200</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((p) => (
                  <tr key={p.label}>
                    <td>{p.label}</td>
                    <td>{p.small === null ? '–' : signedPct(p.small)}</td>
                    <td>{p.large === null ? '–' : signedPct(p.large)}</td>
                    <td style={{ color: tone(p.spread), fontWeight: 600 }}>{p.spread === null ? '–' : signedPct(p.spread)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p style={note}>Price returns only, excluding dividends.</p>
      </Panel>

      <Panel title="Key levels - Small Ordinaries" eyebrow="Swing lows/highs from the last 12 months, the 52-week range, and levels you've asked to watch">
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Type</th>
                <th>What it is</th>
                <th>From current</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {levels.map((l) => (
                <tr key={`${l.source}-${l.label}-${l.level}`}>
                  <td style={{ fontWeight: 700, color: ACCENT }}>{num(l.level)}</td>
                  <td>
                    <Badge variant={l.kind === 'support' ? 'success' : 'warning'}>{l.kind === 'support' ? 'Support' : 'Resistance'}</Badge>
                  </td>
                  <td>
                    {l.label}
                    {l.source === 'adviser' ? <span style={{ color: AXIS }}> · watched</span> : null}
                  </td>
                  <td style={{ color: tone(l.distancePct) }}>{signedPct(l.distancePct)}</td>
                  <td>
                    {l.id ? (
                      <button type="button" className="ui-button ui-button-secondary" style={{ padding: '4px 10px' }} onClick={() => removeLevel(l.id as string)}>
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ width: '140px' }}>
            <label className="ui-field-label" htmlFor="level">Watch a level</label>
            <input id="level" className="ui-input" placeholder="e.g. 3046" value={newLevel} onChange={(e) => setNewLevel(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="ui-field-label" htmlFor="level-label">Note</label>
            <input id="level-label" className="ui-input" placeholder="e.g. 26 Oct 2026 low" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          </div>
          <button type="button" className="ui-button" onClick={addLevel} disabled={!newLevel.trim()}>
            Add
          </button>
        </div>
        {levelError ? <p style={{ ...note, color: '#f87171' }}>{levelError}</p> : null}
        {indices.usingProxies ? <p style={note}>Index data is coming from ETF proxies, so watched index levels are hidden until the index feed is available.</p> : null}
      </Panel>

      <Panel title="Market breadth" eyebrow="% of ASX ordinary shares that rose each day (advancers ÷ advancers + decliners)">
        {breadth.message ? <p style={{ ...note, color: '#fbbf24', marginTop: 0 }}>{breadth.message}</p> : null}
        {breadth.today ? (
          <div className="ui-stat-grid" style={{ marginBottom: '14px' }}>
            <Stat label="Advancers" value={breadth.today.advancers.toLocaleString('en-AU')} tone="up" />
            <Stat label="Decliners" value={breadth.today.decliners.toLocaleString('en-AU')} tone="down" />
            <Stat label="Unchanged" value={breadth.today.unchanged.toLocaleString('en-AU')} />
            <Stat
              label="% above 50-day EMA"
              value={breadth.today.pctAboveEma50 === null ? '–' : `${round1(breadth.today.pctAboveEma50 * 100)}%`}
            />
          </div>
        ) : null}
        {breadthData.length > 1 ? (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={breadthData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke={GRID} />
              <XAxis dataKey="label" stroke={AXIS} minTickGap={30} fontSize={11} />
              <YAxis stroke={AXIS} domain={[0, 100]} unit="%" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '12px' }} />
              <ReferenceLine y={50} stroke="#475569" strokeDasharray="4 4" />
              <Bar dataKey="pct" name="% advancing" fill="#1d4ed8" />
              <Line type="monotone" dataKey="avg10" name="10-day average" stroke={ACCENT} dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p style={note}>The breadth history builds one trading day at a time, each time the tracker is opened.</p>
        )}
      </Panel>

      <Panel
        title="Short interest (ASIC)"
        eyebrow={
          shorts.reportDate
            ? `ASIC report for ${longDate(shorts.reportDate)}${shorts.comparisonDate ? `, compared with ${longDate(shorts.comparisonDate)}` : ''}`
            : 'ASIC daily aggregated short positions'
        }
      >
        {shorts.status !== 'ok' ? (
          <p className="ui-empty-state">{shorts.message ?? 'Short interest data unavailable.'}</p>
        ) : (
          <>
            <p style={{ ...note, marginTop: 0 }}>
              Median short position across shorted ASX securities: <strong>{shorts.medianPct?.toFixed(2)}%</strong>
              {shorts.medianPctMonthAgo !== null ? ` (a month earlier: ${shorts.medianPctMonthAgo.toFixed(2)}%)` : ''}. ASIC publishes
              positions about four business days after the trade date.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
              <ShortTable title="Model portfolio holdings" rows={shorts.modelHoldings} empty="No model holdings appear in the ASIC report." />
              <ShortTable title="Biggest one-month increases (≥1% short)" rows={shorts.biggestIncreases} empty="No material increases." />
              <ShortTable title="Most shorted" rows={shorts.mostShorted} empty="No data." />
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}

function ShortTable({ title, rows, empty }: { title: string; rows: ShortRow[]; empty: string }) {
  return (
    <div className="ui-item-card">
      <p className="ui-field-label">{title}</p>
      {rows.length === 0 ? (
        <p style={note}>{empty}</p>
      ) : (
        <table className="ui-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Short %</th>
              <th>1m change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} title={r.name}>
                <td style={{ color: ACCENT, fontWeight: 700 }}>{r.code}</td>
                <td>{r.pct.toFixed(2)}%</td>
                <td style={{ color: r.change === null ? AXIS : r.change > 0 ? '#f87171' : '#4ade80' }}>
                  {r.change === null ? '–' : `${r.change > 0 ? '+' : ''}${r.change.toFixed(2)} pts`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Stat({ label, value, tone: t }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="ui-stat-card">
      <p className="ui-stat-label">{label}</p>
      <p className="ui-stat-value" style={{ color: t === 'up' ? '#4ade80' : t === 'down' ? '#f87171' : undefined }}>
        {value}
      </p>
    </div>
  )
}

const note = { margin: '10px 0 0', fontSize: '12px', color: AXIS }

function tone(v: number | null): string | undefined {
  if (v === null) return undefined
  return v > 0 ? '#4ade80' : v < 0 ? '#f87171' : undefined
}

function num(v: number | null): string {
  return v === null ? '–' : v.toLocaleString('en-AU', { maximumFractionDigits: 1 })
}

function signedPct(v: number): string {
  return `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

function shortDate(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function longDate(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
