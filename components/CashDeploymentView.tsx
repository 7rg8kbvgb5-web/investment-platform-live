'use client'

import type { CashDeploymentResult } from '../lib/engines/cash-deployment'
import { HoldingMetricGrid, HoldingMetricCell } from './ui/HoldingMetricGrid'
import DraftNumberInput from './ui/DraftNumberInput'

// Presentational view of a cash deployment - shared by the "New money"
// lump-sum flow and the "add cash to an existing portfolio" flow on the
// Construction tab. All the arithmetic lives in lib/engines/cash-deployment.ts.

export default function CashDeploymentView({
  result,
  riskProfile,
  onUnitsChange,
  onValueChange,
  onReset,
}: {
  result: CashDeploymentResult
  riskProfile: string
  /** When provided, units (or $ where there's no price) can be adjusted per line. */
  onUnitsChange?: (code: string, units: number) => void
  onValueChange?: (code: string, value: number) => void
  onReset?: (code: string) => void
}) {
  const editable = !!onUnitsChange
  // Adjusted lines stay listed even at zero, so they can be put back.
  const buys = result.lines.filter((l) => l.investValue > 0 || l.adjusted)
  const isTopUp = result.mode === 'top-up'

  return (
    <div>
      <p style={bodyText}>
        {isTopUp ? (
          <>
            {`The new cash goes first to the asset classes below their ${riskProfile} target, measured against the portfolio's size once the cash is in, then to the securities within each class by the model's weights. Asset classes already over target receive nothing. `}
            <strong>Nothing is sold</strong>, so there&apos;s no capital gains tax and no unnecessary turnover.{' '}
            {result.underweightsRemain
              ? `The cash isn't enough to bring every asset class up to target - it's shared across the underweight classes in proportion to their gaps. Closing every gap without selling would take ${formatCurrency(result.totalShortfall)}.`
              : 'Every underweight asset class is brought up to target, and the remainder is spread across the model at its target weights.'}
          </>
        ) : (
          <>
            The lump sum is invested straight into the {riskProfile} model at its target weights. Unit
            counts are rounded down to whole units, so the buy list never needs more cash than is
            available.
          </>
        )}
      </p>

      <div style={statRow}>
        {isTopUp ? (
          <Stat label="Existing portfolio" value={formatCurrency(result.existingValue)} />
        ) : null}
        <Stat label={isTopUp ? 'New cash' : 'Lump sum'} value={formatCurrency(result.cashAmount)} />
        <Stat label="Invested" value={formatCurrency(result.totalInvested)} />
        <Stat
          label="Residual cash"
          value={formatCurrency(result.residualCash)}
          tone={result.residualCash < 0 ? 'warn' : 'ok'}
        />
        <Stat label="Portfolio after" value={formatCurrency(result.totalAfter)} />
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Asset Class</th>
              <th style={th}>Target</th>
              {isTopUp ? <th style={th}>Before</th> : null}
              <th style={th}>After</th>
              <th style={th}>New cash</th>
            </tr>
          </thead>
          <tbody>
            {result.assetClasses
              .filter((ac) => ac.targetWeight > 0 || ac.beforeWeight > 0)
              .map((ac) => {
                const gapAfter = Math.round((ac.afterWeight - ac.targetWeight) * 100) / 100
                return (
                  <tr key={ac.assetClass}>
                    <td style={td}>{ac.assetClass}</td>
                    <td style={tdMuted}>{ac.targetWeight}%</td>
                    {isTopUp ? <td style={td}>{ac.beforeWeight}%</td> : null}
                    <td style={td}>
                      {ac.afterWeight}%
                      {Math.abs(gapAfter) > 1 ? (
                        <span style={gapNote}>
                          {' '}
                          ({gapAfter > 0 ? '+' : ''}
                          {gapAfter}pp)
                        </span>
                      ) : null}
                    </td>
                    <td style={td}>{ac.investValue > 0 ? formatCurrency(ac.investValue) : '—'}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      <p style={listTitle}>Buy list ({buys.length})</p>
      {editable ? (
        <p style={footnote}>
          Change any line&apos;s units (or the dollar amount where there&apos;s no live price) to depart from the
          model. Residual cash updates to match; ↺ Reset returns a line to its calculated size.
        </p>
      ) : null}
      {result.residualCash < -1 ? (
        <p style={{ ...footnote, color: '#fca5a5' }}>
          The adjusted buy list needs {formatCurrency(-result.residualCash)} more than the cash available — reduce a
          line or add more cash.
        </p>
      ) : null}
      {buys.length === 0 ? (
        <p style={emptyText}>Nothing to buy at this amount.</p>
      ) : (
        <ul style={buyList}>
          {buys.map((line) => (
            <li key={line.code} style={buyRow}>
              <div style={buyHeader}>
                <span style={code}>{line.code}</span>
                <span style={name}>{line.name}</span>
                <span style={assetClassTag}>{line.assetClass}</span>
              </div>
              <HoldingMetricGrid>
                {isTopUp ? (
                  <HoldingMetricCell label="Held now">{formatCurrency(line.currentValue)}</HoldingMetricCell>
                ) : null}
                <HoldingMetricCell label="Invest" tone="accent">
                  {editable && !line.price && onValueChange ? (
                    <>
                      <DraftNumberInput
                        value={Math.round(line.investValue)}
                        step={1000}
                        onCommit={(v) => onValueChange(line.code, v)}
                        ariaLabel={`${line.name} amount to invest`}
                      />
                      {line.adjusted && onReset ? <ResetButton onClick={() => onReset(line.code)} /> : null}
                    </>
                  ) : (
                    formatCurrency(line.investValue)
                  )}
                </HoldingMetricCell>
                <HoldingMetricCell label="Units" tone={line.adjusted ? 'accent' : 'default'}>
                  {editable && line.price && line.units !== null ? (
                    <>
                      <DraftNumberInput
                        value={line.units}
                        step={1}
                        integer
                        onCommit={(v) => onUnitsChange!(line.code, v)}
                        ariaLabel={`${line.name} units to buy`}
                      />
                      {line.adjusted && onReset ? <ResetButton onClick={() => onReset(line.code)} /> : null}
                    </>
                  ) : line.units !== null ? (
                    line.units.toLocaleString()
                  ) : (
                    <span style={muted}>by $ amount</span>
                  )}
                </HoldingMetricCell>
                <HoldingMetricCell label="Weight after">
                  {line.resultingWeight}%<span style={muted}> / {line.targetWeight}%</span>
                </HoldingMetricCell>
              </HoldingMetricGrid>
            </li>
          ))}
        </ul>
      )}
      {buys.some((l) => l.units === null) ? (
        <p style={footnote}>
          Holdings marked &quot;by $ amount&quot; have no live price (typically unlisted funds) — invest the
          dollar figure shown. Where no prices are connected at all, every line is sized in dollars.
        </p>
      ) : null}
    </div>
  )
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Reset to the calculated amount"
      style={{
        border: '1px solid #f59e0b',
        background: 'rgba(245, 158, 11, 0.14)',
        color: '#fbbf24',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: '6px',
        marginLeft: '6px',
        whiteSpace: 'nowrap',
      }}
    >
      ↺ Reset
    </button>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div style={stat}>
      <span style={statLabel}>{label}</span>
      <span style={{ ...statValue, color: tone === 'warn' ? '#fca5a5' : tone === 'ok' ? '#4ade80' : '#ffffff' }}>
        {value}
      </span>
    </div>
  )
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

const bodyText = { fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 14px' }
const statRow = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '10px',
  marginBottom: '16px',
}
const stat = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '10px 12px',
  borderRadius: '10px',
  background: '#0d1f38',
  border: '1px solid #1e3a5f',
}
const statLabel = { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const statValue = { fontSize: '18px', fontWeight: 700 }
const tableWrap = { overflowX: 'auto' as const, marginBottom: '16px' }
const table = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' }
const th = {
  textAlign: 'left' as const,
  padding: '8px 10px',
  color: '#94a3b8',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  borderBottom: '1px solid #2d4a6b',
}
const td = { padding: '8px 10px', color: '#e2e8f0', borderBottom: '1px solid #1e3a5f' }
const tdMuted = { ...td, color: '#94a3b8' }
const gapNote = { fontSize: '11px', color: '#facc15' }
const listTitle = { fontSize: '13px', fontWeight: 700, color: '#e2e8f0', margin: '4px 0 10px' }
const emptyText = { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' as const, margin: 0 }
const buyList = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' as const, gap: '10px' }
const buyRow = { padding: '12px 14px', borderRadius: '10px', background: '#0d1f38', border: '1px solid #1e3a5f' }
const buyHeader = { display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' as const, marginBottom: '8px' }
const code = { fontSize: '14px', fontWeight: 700, color: '#38bdf8' }
const name = { fontSize: '13px', color: '#e2e8f0' }
const assetClassTag = { marginLeft: 'auto', fontSize: '11px', color: '#94a3b8' }
const muted = { fontSize: '12px', color: '#94a3b8' }
const footnote = { fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, marginTop: '10px' }
