'use client'

import { useEffect, useState } from 'react'
import { ASSET_CLASSES } from '../lib/engines/model-portfolio-core'
import type { MappedHolding } from '../lib/engines/client-holdings-mapping'
import type { HoldingRecommendation } from '../lib/engines/portfolio-review-comparison'
import { suggestAssetClass, TREATMENT_LABELS, type HoldingTreatment } from '../lib/engines/holding-triage'
import { fetchHouseViews, type HouseViewEntry } from '../lib/engines/house-view'

/**
 * Construction triage: makes sure every holding on the statement ends up in
 * the proposal. Two steps -
 *   1. Classify: holdings the platform couldn't recognise get an asset class
 *      (suggested where the code/name makes it obvious - bonds, cash trusts).
 *   2. Decide: every holding outside the model gets a treatment - sell now,
 *      staged exit, or retain as a documented exception - plus a reason.
 * Choices are saved on the review's holdings, so they persist with autosave
 * and flow through to Client Advice and the proposal PDF.
 */
export function HoldingTriagePanel({
  unclassified,
  outsideModel,
  onClassify,
  onTreatment,
  classifyError,
}: {
  unclassified: MappedHolding[]
  outsideModel: HoldingRecommendation[]
  onClassify: (changes: { code: string; assetClass: string }[]) => void
  onTreatment: (code: string, treatment: HoldingTreatment, reason: string) => void
  classifyError?: string | null
}) {
  // Ord Minnett's view on holdings outside the model - informs sell vs retain.
  const [views, setViews] = useState<Map<string, HouseViewEntry>>(new Map())
  const outsideCodes = outsideModel.map((r) => r.code).join(',')
  useEffect(() => {
    if (!outsideCodes) return
    let cancelled = false
    fetchHouseViews(outsideCodes.split(','))
      .then((v) => {
        if (!cancelled) setViews(v)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [outsideCodes])

  const unclassifiedWeight = round2(unclassified.reduce((sum, h) => sum + h.weight, 0))
  const suggestions = unclassified
    .map((h) => ({ code: h.code, assetClass: suggestAssetClass(h.code, h.name) }))
    .filter((s): s is { code: string; assetClass: string } => s.assetClass !== null)

  if (unclassified.length === 0 && outsideModel.length === 0) return null

  return (
    <div id="holding-triage" style={subPanel}>
      <p style={subHeading}>Holdings Outside the Model</p>
      <p style={bodyText}>
        Every holding on the statement needs to be in the proposal. Classify anything the platform didn&apos;t
        recognise, then decide how each holding outside the model is treated. Listed securities default to a sale;
        bonds, unlisted funds and alternatives default to a staged exit; cash defaults to retained. Classifications
        are remembered, so the same securities are recognised automatically on every future statement.
      </p>
      {classifyError ? <p style={errorText}>{classifyError}</p> : null}

      {unclassified.length > 0 ? (
        <>
          <div style={stepHeader}>
            <span style={stepLabel}>1 · Classify ({unclassified.length} holdings, {unclassifiedWeight}% of the portfolio)</span>
            {suggestions.length > 0 ? (
              <button type="button" style={primaryButton} onClick={() => onClassify(suggestions)}>
                Apply {suggestions.length} suggested classification{suggestions.length === 1 ? '' : 's'}
              </button>
            ) : null}
          </div>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Code</th>
                  <th style={th}>Name</th>
                  <th style={{ ...th, textAlign: 'right' }}>Weight</th>
                  <th style={th}>Asset class</th>
                </tr>
              </thead>
              <tbody>
                {unclassified.map((h) => {
                  const suggested = suggestAssetClass(h.code, h.name)
                  return (
                    <tr key={h.code}>
                      <td style={{ ...td, color: '#38bdf8', fontWeight: 600 }}>{h.code}</td>
                      <td style={td}>{h.name ?? '—'}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{h.weight}%</td>
                      <td style={td}>
                        <select
                          style={select}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) onClassify([{ code: h.code, assetClass: e.target.value }])
                          }}
                          aria-label={`Asset class for ${h.code}`}
                        >
                          <option value="" disabled>
                            {suggested ? `Choose… (suggested: ${suggested})` : 'Choose asset class…'}
                          </option>
                          {ASSET_CLASSES.map((ac) => (
                            <option key={ac.name} value={ac.name}>
                              {ac.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p style={okText}>✓ Every holding on the statement is classified - 100% of the portfolio is in the proposal.</p>
      )}

      {outsideModel.length > 0 ? (
        <>
          <div style={stepHeader}>
            <span style={stepLabel}>
              {unclassified.length > 0 ? '2 · ' : ''}Decide ({outsideModel.length} holdings not in the model)
            </span>
          </div>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Code</th>
                  <th style={th}>Name</th>
                  <th style={th}>Asset class</th>
                  <th style={{ ...th, textAlign: 'right' }}>Weight</th>
                  <th style={th}>Treatment</th>
                  <th style={th}>Reason (shown in the proposal)</th>
                </tr>
              </thead>
              <tbody>
                {outsideModel.map((rec) => (
                  <TreatmentRow key={rec.code} rec={rec} view={views.get(rec.code.trim().toUpperCase())} onTreatment={onTreatment} onClassify={onClassify} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}

function TreatmentRow({
  rec,
  view,
  onTreatment,
  onClassify,
}: {
  rec: HoldingRecommendation
  view?: HouseViewEntry
  onTreatment: (code: string, treatment: HoldingTreatment, reason: string) => void
  onClassify: (changes: { code: string; assetClass: string }[]) => void
}) {
  const treatment = rec.treatment ?? 'sell'
  const [reason, setReason] = useState(rec.treatmentReason ?? '')
  useEffect(() => setReason(rec.treatmentReason ?? ''), [rec.treatmentReason])
  const code = rec.statementCode ?? rec.code
  const needsReason = treatment === 'retain' && !reason.trim()

  return (
    <tr>
      <td style={{ ...td, color: '#38bdf8', fontWeight: 600 }}>{rec.code}</td>
      <td style={td}>
        {rec.name}
        {view ? (
          <div
            style={{ fontSize: '11px', marginTop: '3px', color: view.lean === 'bearish' ? '#f87171' : view.lean === 'bullish' ? '#4ade80' : '#94a3b8' }}
            title={view.flags.join(' · ') || undefined}
          >
            Ord Minnett: {view.rating}
            {view.upside !== null ? ` (${view.upside >= 0 ? '+' : ''}${(view.upside * 100).toFixed(0)}% to target)` : ''}
          </div>
        ) : null}
      </td>
      <td style={tdMuted}>
        {rec.classifiedByAdviser ? (
          <select
            style={select}
            value={rec.assetClass}
            onChange={(e) => onClassify([{ code, assetClass: e.target.value }])}
            aria-label={`Asset class for ${rec.code}`}
            title="Classified by an adviser - changing it updates it for all future statements"
          >
            {ASSET_CLASSES.map((ac) => (
              <option key={ac.name} value={ac.name}>
                {ac.name}
              </option>
            ))}
          </select>
        ) : (
          rec.assetClass
        )}
      </td>
      <td style={{ ...td, textAlign: 'right' }}>{rec.currentWeight}%</td>
      <td style={td}>
        <select
          style={select}
          value={treatment}
          onChange={(e) => onTreatment(code, e.target.value as HoldingTreatment, reason)}
          aria-label={`Treatment for ${rec.code}`}
        >
          {(Object.keys(TREATMENT_LABELS) as HoldingTreatment[]).map((t) => (
            <option key={t} value={t}>
              {TREATMENT_LABELS[t]}
            </option>
          ))}
        </select>
        {rec.treatmentIsDefault ? <div style={defaultNote}>default</div> : null}
      </td>
      <td style={td}>
        <input
          type="text"
          style={{ ...textInput, borderColor: needsReason ? '#f87171' : '#2d4a6b' }}
          value={reason}
          placeholder={
            treatment === 'retain'
              ? 'Required - e.g. client preference, legacy holding, tax position'
              : treatment === 'staged_exit'
                ? 'e.g. quarterly redemption window; sell on maturity'
                : 'Optional'
          }
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => {
            if (reason !== (rec.treatmentReason ?? '')) onTreatment(code, treatment, reason)
          }}
          aria-label={`Reason for ${rec.code}`}
        />
      </td>
    </tr>
  )
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

const subPanel = {
  marginTop: '20px',
  padding: '16px',
  background: '#0b1f38',
  borderRadius: '10px',
  border: '1px solid #1e3a5f',
}
const subHeading = { fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }
const bodyText = { fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }
const okText = { fontSize: '13px', color: '#4ade80', margin: '8px 0' }
const stepHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center' as const,
  flexWrap: 'wrap' as const,
  gap: '10px',
  margin: '16px 0 8px',
}
const stepLabel = { fontSize: '12px', fontWeight: 700, color: '#5eead4', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const primaryButton = {
  padding: '7px 12px',
  borderRadius: '8px',
  border: '1px solid #2563eb',
  background: '#1d4ed8',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
}
const tableWrap = { overflowX: 'auto' as const }
const table = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' }
const th = {
  textAlign: 'left' as const,
  padding: '8px 10px',
  borderBottom: '1px solid #334155',
  color: '#94a3b8',
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}
const td = { padding: '8px 10px', borderBottom: '1px solid #1e293b', verticalAlign: 'top' as const, color: '#e2e8f0' }
const tdMuted = { ...td, color: '#94a3b8' }
const select = {
  padding: '6px 8px',
  borderRadius: '6px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
  fontSize: '12px',
  minWidth: '170px',
}
const textInput = {
  width: '100%',
  minWidth: '220px',
  padding: '6px 8px',
  borderRadius: '6px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
  fontSize: '12px',
}
const defaultNote = { fontSize: '10px', color: '#64748b', marginTop: '2px' }
const errorText = { fontSize: '12px', color: '#f87171', margin: '6px 0' }
