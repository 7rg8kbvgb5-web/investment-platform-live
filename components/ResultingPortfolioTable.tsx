'use client'

import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import type { HoldingRecommendation } from '../lib/engines/portfolio-review-comparison'
import { normaliseCode } from '../lib/engines/codes'
import DraftNumberInput from './ui/DraftNumberInput'

// Construction tab: the client's portfolio today and the recommended trades
// in one compact table - one row per security, grouped by asset class.
// Groups open and close; filters narrow to trades or adviser adjustments.
// Target weight and units (or $ where unpriced) stay editable inline.

type Filter = 'all' | 'trades' | 'adjusted'

export default function ResultingPortfolioTable({
  assetClasses,
  recommendations,
  holdingOverrides,
  costBaseByCode,
  headerAction,
  onTargetWeight,
  onResetWeight,
  onUnits,
  onValue,
  onResetTrade,
}: {
  assetClasses: { name: string; type: string }[]
  recommendations: HoldingRecommendation[]
  holdingOverrides: Record<string, number>
  costBaseByCode: Map<string, number>
  headerAction?: React.ReactNode
  onTargetWeight: (code: string, value: number) => void
  onResetWeight: (code: string) => void
  onUnits: (code: string, units: number) => void
  onValue: (code: string, value: number) => void
  onResetTrade: (code: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const isAdjusted = (r: HoldingRecommendation) => r.adjusted || holdingOverrides[normaliseCode(r.code)] !== undefined
  const isTrade = (r: HoldingRecommendation) => r.action !== 'hold'

  const groups = useMemo(() => {
    const known = new Set(assetClasses.map((a) => a.name))
    const list = assetClasses.map((ac) => ({ ...ac, rows: recommendations.filter((r) => r.assetClass === ac.name) }))
    const other = recommendations.filter((r) => !known.has(r.assetClass))
    if (other.length > 0) list.push({ name: 'Other', type: '', rows: other })
    return list.filter((g) => g.rows.length > 0)
  }, [assetClasses, recommendations])

  // Start collapsed, but open any class holding a trade the adviser has adjusted.
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.filter((g) => g.rows.some(isAdjusted)).map((g) => g.name)))
  const adjustedKey = groups
    .filter((g) => g.rows.some(isAdjusted))
    .map((g) => g.name)
    .join('|')
  useEffect(() => {
    if (!adjustedKey) return
    setOpen((prev) => new Set([...Array.from(prev), ...adjustedKey.split('|')]))
  }, [adjustedKey])

  const counts = {
    all: recommendations.length,
    trades: recommendations.filter(isTrade).length,
    adjusted: recommendations.filter(isAdjusted).length,
  }
  const visible = (r: HoldingRecommendation) => filter === 'all' || (filter === 'trades' ? isTrade(r) : isAdjusted(r))
  const allOpen = groups.every((g) => open.has(g.name))

  function toggle(name: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div>
      <div style={toolbar}>
        {(['all', 'trades', 'adjusted'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f)
              // A narrowed list is only useful with every class open.
              if (f !== 'all') setOpen(new Set(groups.map((g) => g.name)))
            }}
            style={filter === f ? chipOn : chip}
          >
            {f === 'all' ? 'All' : f === 'trades' ? 'Trades only' : 'Adjusted'} <span style={{ opacity: 0.75 }}>{counts[f]}</span>
          </button>
        ))}
        <button type="button" onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.name)))} style={linkButton}>
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
        <span style={{ flex: 1 }} />
        {headerAction}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={table}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Code</th>
              <th style={{ ...th, textAlign: 'left' }}>Security</th>
              <th style={th}>Today</th>
              <th style={th}>Value today</th>
              <th style={th}>Target</th>
              <th style={th}>Trade</th>
              <th style={th}>Units</th>
              <th style={th}>Change</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const rows = g.rows.filter(visible)
              if (rows.length === 0) return null
              const isOpen = open.has(g.name)
              const today = sum(g.rows.map((r) => r.currentWeight))
              const target = sum(g.rows.map((r) => r.targetWeight))
              const trade = sum(g.rows.map((r) => r.changeValue ?? 0))
              const value = sum(g.rows.map((r) => r.currentValue ?? 0))
              const adjustedHere = g.rows.filter(isAdjusted).length
              return (
                <GroupRows key={g.name}>
                  <tr onClick={() => toggle(g.name)} style={groupRow} title={isOpen ? 'Collapse' : 'Expand'}>
                    <td style={{ ...groupCell, textAlign: 'left' }} colSpan={2}>
                      <span style={{ display: 'inline-block', width: '14px', color: '#7dd3fc' }}>{isOpen ? '▾' : '▸'}</span>
                      {g.name}
                      <span style={groupMeta}>
                        {g.type ? `${g.type} · ` : ''}
                        {g.rows.length} holding{g.rows.length === 1 ? '' : 's'}
                        {adjustedHere > 0 ? ` · ${adjustedHere} adjusted` : ''}
                      </span>
                    </td>
                    <td style={groupCell}>{pct(today)}</td>
                    <td style={groupCell}>{value > 0 ? money(value) : '—'}</td>
                    <td style={groupCell}>{pct(target)}</td>
                    <td style={{ ...groupCell, color: trade > 0 ? '#4ade80' : trade < 0 ? '#f87171' : '#94a3b8' }}>
                      {Math.abs(trade) >= 1 ? signedMoney(trade) : '—'}
                    </td>
                    <td style={groupCell} />
                    <td style={groupCell}>{signedPp(target - today)}</td>
                    <td style={groupCell} />
                  </tr>
                  {isOpen
                    ? rows.map((r) => {
                        const key = normaliseCode(r.code)
                        const weightOverridden = holdingOverrides[key] !== undefined
                        const costBase = costBaseByCode.get(key)
                        const tip = [r.rationale, costBase !== undefined ? `Cost base ${money(costBase)}` : null]
                          .filter(Boolean)
                          .join('\n')
                        return (
                          <tr key={r.code} style={row} title={tip}>
                            <td style={{ ...td, textAlign: 'left', color: '#38bdf8', fontWeight: 700 }} title={r.code}>{r.code}</td>
                            <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal' }}>
                              <span style={{ color: '#e2e8f0' }}>{r.name}</span>
                              {r.treatment === 'staged_exit' || r.treatment === 'retain' ? (
                                <span style={tag}>{r.treatment === 'staged_exit' ? 'Staged exit' : 'Retained'}</span>
                              ) : null}
                            </td>
                            <td style={td}>{r.currentWeight > 0 ? pct(r.currentWeight) : '—'}</td>
                            <td style={tdMuted}>{r.currentValue ? money(r.currentValue) : '—'}</td>
                            <td style={td}>
                              <span style={cellInline}>
                                <input
                                  type="number"
                                  step={0.5}
                                  value={r.targetWeight}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value)
                                    if (!Number.isNaN(v)) onTargetWeight(r.code, v)
                                  }}
                                  aria-label={`${r.name} target weight`}
                                  style={weightOverridden ? inputOverridden : input}
                                />
                                %
                                {weightOverridden ? (
                                  <button type="button" style={reset} title="Reset to house model weight" onClick={() => onResetWeight(r.code)}>
                                    ↺
                                  </button>
                                ) : null}
                              </span>
                            </td>
                            <td style={{ ...td, color: (r.changeValue ?? 0) > 0 ? '#4ade80' : (r.changeValue ?? 0) < 0 ? '#f87171' : '#94a3b8' }}>
                              {r.changeValue === null ? (
                                '—'
                              ) : r.price ? (
                                Math.abs(r.changeValue) >= 1 ? signedMoney(r.changeValue) : '—'
                              ) : (
                                <span style={cellInline}>
                                  <DraftNumberInput
                                    value={Math.round(r.changeValue)}
                                    step={1000}
                                    onCommit={(v) => onValue(r.code, v)}
                                    ariaLabel={`${r.name} trade value`}
                                    style={r.adjusted ? { ...inputOverridden, width: '84px' } : { ...input, width: '84px' }}
                                  />
                                  {r.adjusted ? (
                                    <button type="button" style={reset} title="Reset to the model-derived trade" onClick={() => onResetTrade(r.code)}>
                                      ↺
                                    </button>
                                  ) : null}
                                </span>
                              )}
                            </td>
                            <td style={td}>
                              {r.units !== null && r.price ? (
                                <span style={cellInline}>
                                  <DraftNumberInput
                                    value={r.units}
                                    step={1}
                                    integer
                                    onCommit={(v) => onUnits(r.code, v)}
                                    ariaLabel={`${r.name} units to trade (negative to sell)`}
                                    style={r.adjusted ? { ...inputOverridden, width: '76px' } : { ...input, width: '76px' }}
                                  />
                                  {r.adjusted ? (
                                    <button type="button" style={reset} title="Reset to the model-derived trade" onClick={() => onResetTrade(r.code)}>
                                      ↺
                                    </button>
                                  ) : null}
                                </span>
                              ) : r.units !== null ? (
                                <span style={{ color: '#94a3b8' }}>{(r.units > 0 ? '+' : '') + r.units.toLocaleString('en-AU')}</span>
                              ) : (
                                <span style={{ color: '#64748b' }}>{r.changeValue ? 'by $' : '—'}</span>
                              )}
                            </td>
                            <td style={tdMuted}>{signedPp(r.changeWeight)}</td>
                            <td style={td}>
                              <ActionPill action={r.action} />
                            </td>
                          </tr>
                        )
                      })
                    : null}
                </GroupRows>
              )
            })}
          </tbody>
        </table>
      </div>
      <p style={foot}>
        Hover a row for its rationale and cost base. Edit a target weight, or a trade&apos;s units ($ where there&apos;s no live
        price) - press Enter or leave the field to apply. Amber marks a change from the model; ↺ resets it.
      </p>
    </div>
  )
}

function GroupRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

const ACTION: Record<string, { label: string; bg: string; fg: string }> = {
  buy: { label: 'Buy', bg: '#0f3d2e', fg: '#4ade80' },
  increase: { label: 'Add', bg: '#0f3d2e', fg: '#4ade80' },
  reduce: { label: 'Trim', bg: '#3f2b12', fg: '#facc15' },
  sell: { label: 'Sell', bg: '#3f1620', fg: '#f87171' },
  hold: { label: 'Hold', bg: '#0d2542', fg: '#94a3b8' },
}

function ActionPill({ action }: { action: string }) {
  const a = ACTION[action] ?? ACTION.hold
  return <span style={{ ...pill, background: a.bg, color: a.fg }}>{a.label}</span>
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}
function pct(v: number): string {
  return `${(Math.round(v * 10) / 10).toFixed(1)}%`
}
function signedPp(v: number): string {
  const r = Math.round(v * 10) / 10
  if (Math.abs(r) < 0.05) return '0.0pp'
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(1)}pp`
}
function money(v: number): string {
  return v.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}
function signedMoney(v: number): string {
  return `${v > 0 ? '+' : '−'}${money(Math.abs(v))}`
}

const toolbar = { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const, marginBottom: '10px' }
const chip = {
  padding: '5px 12px',
  borderRadius: '999px',
  border: '1px solid #2d4a6b',
  background: 'transparent',
  color: '#cbd5e1',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
}
const chipOn = { ...chip, background: '#1e3a5f', borderColor: '#38bdf8', color: '#e0f2fe' }
const linkButton = { border: 'none', background: 'transparent', color: '#7dd3fc', fontSize: '12px', cursor: 'pointer', padding: '4px 6px' }
const table = { width: '100%', minWidth: '860px', borderCollapse: 'collapse' as const, tableLayout: 'fixed' as const, fontSize: '13px' }
const th = {
  textAlign: 'right' as const,
  padding: '6px 8px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  borderBottom: '1px solid #2d4a6b',
}
const groupRow = { cursor: 'pointer', background: '#0b2447' }
const groupCell = {
  padding: '8px',
  textAlign: 'right' as const,
  fontWeight: 700,
  color: '#e2e8f0',
  borderBottom: '1px solid #1e3a5f',
  whiteSpace: 'nowrap' as const,
}
const groupMeta = { marginLeft: '10px', fontSize: '11px', fontWeight: 400, color: '#94a3b8' }
const row = { borderBottom: '1px solid #13294a' }
const td = {
  padding: '5px 8px',
  textAlign: 'right' as const,
  color: '#e2e8f0',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
const tdMuted = { ...td, color: '#94a3b8' }
const cellInline = { display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }
const input = {
  width: '56px',
  padding: '3px 6px',
  borderRadius: '6px',
  border: '1px solid #2d4a6b',
  background: '#04142b',
  color: '#e2e8f0',
  fontSize: '13px',
  fontWeight: 600,
  textAlign: 'right' as const,
}
const inputOverridden = { ...input, border: '1px solid #f59e0b', color: '#fbbf24' }
const reset = {
  border: '1px solid #f59e0b',
  background: 'rgba(245, 158, 11, 0.14)',
  color: '#fbbf24',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '1px 6px',
  borderRadius: '6px',
}
const tag = {
  display: 'inline-block',
  marginLeft: '6px',
  whiteSpace: 'nowrap' as const,
  fontSize: '10px',
  padding: '1px 6px',
  borderRadius: '999px',
  border: '1px solid #78350f',
  color: '#fbbf24',
}
const pill = { fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }
const foot = { margin: '8px 0 0', fontSize: '12px', color: '#94a3b8' }
