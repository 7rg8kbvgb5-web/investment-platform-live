'use client'

import { useMemo, useRef, useState } from 'react'
import {
  parseClientPortfolioCsv,
  type ParsedPortfolioUpload,
  type UploadedHolding,
} from '../lib/engines/client-portfolio-upload'
import { mapClientHoldings } from '../lib/engines/client-holdings-mapping'
import { classifyPortfolioRiskProfile } from '../lib/engines/portfolio-risk-classification'
import {
  getModelPortfolioByRiskProfile,
  modelPortfolios,
  type RiskProfile,
} from '../lib/engines/model-portfolios'
import { compareClientPortfolioToModel } from '../lib/engines/portfolio-review-comparison'
import StatusBox from './dashboard/StatusBox'

type ExtractionMeta = {
  clientName: string | null
  asAtDate: string | null
  totalPortfolioValue: number | null
}

const RISK_PROFILES: RiskProfile[] = modelPortfolios.map((p) => p.riskProfile)

const ACTION_STYLE: Record<string, { bg: string; fg: string }> = {
  buy: { bg: '#0f3d2e', fg: '#4ade80' },
  increase: { bg: '#0f3d2e', fg: '#4ade80' },
  reduce: { bg: '#3f2b12', fg: '#facc15' },
  sell: { bg: '#3f1620', fg: '#f87171' },
  hold: { bg: '#0d2542', fg: '#94a3b8' },
}

export default function ClientPortfolioUploadPanel() {
  const [mode, setMode] = useState<'pdf' | 'csv'>('pdf')
  const [csvText, setCsvText] = useState('')
  const [holdings, setHoldings] = useState<UploadedHolding[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [meta, setMeta] = useState<ExtractionMeta>({
    clientName: null,
    asAtDate: null,
    totalPortfolioValue: null,
  })
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [riskOverride, setRiskOverride] = useState<RiskProfile | 'auto'>('auto')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handlePdfUpload(file: File) {
    setParsing(true)
    setParseError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/portfolios/parse-pdf', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!data.ok) {
        throw new Error(data.error ?? 'Failed to parse the PDF.')
      }

      setHoldings(data.holdings ?? [])
      setWarnings(data.warnings ?? [])
      setMeta({
        clientName: data.clientName,
        asAtDate: data.asAtDate,
        totalPortfolioValue: data.totalPortfolioValue,
      })
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse the PDF.')
    } finally {
      setParsing(false)
    }
  }

  function handleCsvChange(value: string) {
    setCsvText(value)
    setMeta({ clientName: null, asAtDate: null, totalPortfolioValue: null })

    if (!value.trim()) {
      setHoldings([])
      setWarnings([])
      return
    }

    const result: ParsedPortfolioUpload = parseClientPortfolioCsv(value)
    setHoldings(result.holdings)
    setWarnings(result.warnings)
  }

  const mappingResult = useMemo(() => mapClientHoldings(holdings), [holdings])

  const riskClassification = useMemo(
    () =>
      classifyPortfolioRiskProfile(
        mappingResult.growthWeight,
        mappingResult.defensiveWeight,
      ),
    [mappingResult.growthWeight, mappingResult.defensiveWeight],
  )

  const effectiveRiskProfile: RiskProfile =
    riskOverride === 'auto' ? riskClassification.nearestRiskProfile : riskOverride

  const model = useMemo(
    () => getModelPortfolioByRiskProfile(effectiveRiskProfile),
    [effectiveRiskProfile],
  )

  const comparison = useMemo(
    () => compareClientPortfolioToModel(mappingResult.mappedHoldings, model),
    [mappingResult.mappedHoldings, model],
  )

  const hasHoldings = holdings.length > 0

  return (
    <section style={panel}>
      <p style={eyebrow}>Client Portfolio Review</p>
      <h2 style={heading}>Upload &amp; Review Against Model Portfolio</h2>
      <p style={description}>
        Upload a client portfolio statement (PDF) to break it down by asset
        class and security, classify its risk profile, and see exactly
        which positions need to change to align with the house model.
      </p>

      <div style={modeToggleRow}>
        <button
          type="button"
          onClick={() => setMode('pdf')}
          style={mode === 'pdf' ? modeButtonActive : modeButton}
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => setMode('csv')}
          style={mode === 'csv' ? modeButtonActive : modeButton}
        >
          Paste CSV instead
        </button>
      </div>

      {mode === 'pdf' ? (
        <div
          style={dropzone}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file) handlePdfUpload(file)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handlePdfUpload(file)
            }}
          />
          <p style={dropzoneText}>
            {parsing
              ? 'Reading portfolio statement…'
              : 'Click to choose a PDF, or drag one here'}
          </p>
          <p style={dropzoneSubtext}>
            Custodian or platform statement, wrap account report, or any
            portfolio PDF with a holdings list.
          </p>
        </div>
      ) : (
        <textarea
          value={csvText}
          onChange={(e) => handleCsvChange(e.target.value)}
          placeholder={'Code,Weight\nCBA,12\nBHP,10\nMQG,8\nNST,5'}
          style={textarea}
        />
      )}

      {parseError ? <StatusBox variant="error">{parseError}</StatusBox> : null}

      {warnings.length > 0 ? (
        <StatusBox variant="warning">
          <strong>Review before relying on this:</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </StatusBox>
      ) : null}

      {hasHoldings ? (
        <>
          {/* Summary bar */}
          <div style={summaryRow}>
            <SummaryCard
              title="Client"
              value={meta.clientName ?? '—'}
            />
            <SummaryCard title="As At" value={meta.asAtDate ?? '—'} />
            <SummaryCard
              title="Holdings"
              value={String(holdings.length)}
            />
            <SummaryCard
              title="Mapped"
              value={`${mappingResult.mappedCount} / ${holdings.length}`}
            />
            <SummaryCard
              title="Growth / Defensive"
              value={`${mappingResult.growthWeight}% / ${mappingResult.defensiveWeight}%`}
            />
          </div>

          {/* Risk classification */}
          <div style={subPanel}>
            <div style={subPanelHeaderRow}>
              <p style={subHeading}>Risk Profile Classification</p>

              <label style={selectLabel}>
                Compare against
                <select
                  style={select}
                  value={riskOverride}
                  onChange={(e) =>
                    setRiskOverride(e.target.value as RiskProfile | 'auto')
                  }
                >
                  <option value="auto">
                    Auto (nearest: {riskClassification.nearestRiskProfile})
                  </option>
                  {RISK_PROFILES.map((profile) => (
                    <option key={profile} value={profile}>
                      {profile}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p style={bodyText}>
              Based on mapped holdings, this portfolio sits at{' '}
              <strong>{riskClassification.clientGrowthWeight}% growth</strong> /{' '}
              {riskClassification.clientDefensiveWeight}% defensive. The
              nearest house model is{' '}
              <strong>{riskClassification.nearestRiskProfile}</strong>{' '}
              ({riskClassification.nearestModelGrowthWeight}% growth target,{' '}
              {riskClassification.growthWeightGap > 0 ? '+' : ''}
              {riskClassification.growthWeightGap}pp difference).
              {riskOverride !== 'auto' && riskOverride !== riskClassification.nearestRiskProfile
                ? ` You're currently comparing against ${riskOverride} instead — the adviser's own read of the client's risk tolerance always takes precedence over this automatic estimate.`
                : ''}
            </p>
          </div>

          {/* Asset class comparison */}
          <div style={subPanel}>
            <p style={subHeading}>
              Asset Class Allocation vs {effectiveRiskProfile} Model
            </p>
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Asset Class</th>
                    <th style={th}>Type</th>
                    <th style={th}>Client</th>
                    <th style={th}>Model</th>
                    <th style={th}>Difference</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.assetClassComparison.map((row) => (
                    <tr key={row.assetClass}>
                      <td style={td}>{row.assetClass}</td>
                      <td style={tdMuted}>{row.type}</td>
                      <td style={td}>{row.clientWeight}%</td>
                      <td style={td}>{row.modelWeight}%</td>
                      <td style={td}>
                        {row.difference > 0 ? '+' : ''}
                        {row.difference}pp
                      </td>
                      <td style={td}>
                        <StatusPill status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Holding-level recommendations */}
          <div style={subPanel}>
            <p style={subHeading}>Recommended Changes</p>
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Security</th>
                    <th style={th}>Asset Class</th>
                    <th style={th}>Current</th>
                    <th style={th}>Target</th>
                    <th style={th}>Change</th>
                    <th style={th}>Action</th>
                    <th style={th}>Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.holdingRecommendations
                    .filter((rec) => rec.action !== 'hold')
                    .map((rec) => (
                      <tr key={rec.code}>
                        <td style={td}>
                          <span style={titleCell}>{rec.code}</span>
                          <span style={summaryCell}>{rec.name}</span>
                        </td>
                        <td style={tdMuted}>{rec.assetClass}</td>
                        <td style={td}>{rec.currentWeight}%</td>
                        <td style={td}>{rec.targetWeight}%</td>
                        <td style={td}>
                          {rec.changeWeight > 0 ? '+' : ''}
                          {rec.changeWeight}pp
                        </td>
                        <td style={td}>
                          <ActionBadge action={rec.action} />
                        </td>
                        <td style={tdWrap}>{rec.rationale}</td>
                      </tr>
                    ))}
                  {comparison.holdingRecommendations.every(
                    (rec) => rec.action === 'hold',
                  ) ? (
                    <tr>
                      <td style={td} colSpan={7}>
                        No changes required — all mapped holdings are in
                        line with the {effectiveRiskProfile} model.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unmapped holdings */}
          {comparison.unclassifiedHoldings.length > 0 ? (
            <div style={subPanel}>
              <p style={subHeading}>
                Needs Manual Review ({comparison.unclassifiedHoldings.length})
              </p>
              <p style={bodyText}>
                These holdings aren't in the security master or any model
                portfolio, so they can't be classified or compared
                automatically. Check them manually before relying on the
                growth/defensive split above.
              </p>
              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Code</th>
                      <th style={th}>Name</th>
                      <th style={th}>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.unclassifiedHoldings.map((holding) => (
                      <tr key={holding.code}>
                        <td style={td}>{holding.code}</td>
                        <td style={td}>{holding.name ?? '—'}</td>
                        <td style={td}>{holding.weight}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={summaryCard}>
      <div style={summaryTitle}>{title}</div>
      <div style={summaryValue}>{value}</div>
    </div>
  )
}

function StatusPill({ status }: { status: 'in-line' | 'overweight' | 'underweight' }) {
  const styleMap = {
    'in-line': { bg: '#0f3d2e', fg: '#4ade80', label: 'In Line' },
    overweight: { bg: '#3f2b12', fg: '#facc15', label: 'Overweight' },
    underweight: { bg: '#0d2542', fg: '#60a5fa', label: 'Underweight' },
  } as const
  const s = styleMap[status]
  return (
    <span style={{ ...pill, background: s.bg, color: s.fg }}>{s.label}</span>
  )
}

function ActionBadge({ action }: { action: string }) {
  const s = ACTION_STYLE[action] ?? ACTION_STYLE.hold
  return (
    <span style={{ ...pill, background: s.bg, color: s.fg }}>
      {action.toUpperCase()}
    </span>
  )
}

const panel = {
  marginTop: '32px',
  padding: '24px',
  background: '#0f2744',
  borderRadius: '12px',
  border: '1px solid #2d4a6b',
}

const eyebrow = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#5eead4',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

const heading = {
  fontSize: '20px',
  fontWeight: 700,
  marginTop: 0,
  marginBottom: '8px',
  color: '#ffffff',
}

const description = {
  fontSize: '13px',
  color: '#94a3b8',
  lineHeight: 1.5,
  marginBottom: '20px',
  maxWidth: '680px',
}

const modeToggleRow = {
  display: 'flex',
  gap: '8px',
  marginBottom: '12px',
}

const modeButton = {
  padding: '8px 16px',
  background: '#0b1f38',
  border: '1px solid #2d4a6b',
  borderRadius: '8px',
  color: '#94a3b8',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
}

const modeButtonActive = {
  ...modeButton,
  background: '#1B7A7A',
  borderColor: '#1B7A7A',
  color: '#ffffff',
}

const dropzone = {
  padding: '32px',
  border: '1.5px dashed #2d4a6b',
  borderRadius: '10px',
  textAlign: 'center' as const,
  cursor: 'pointer',
  marginBottom: '16px',
  background: '#0b1f38',
}

const dropzoneText = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#e2e8f0',
  marginBottom: '4px',
}

const dropzoneSubtext = {
  fontSize: '12px',
  color: '#64748b',
}

const textarea = {
  width: '100%',
  minHeight: '160px',
  padding: '12px',
  background: '#0b1f38',
  border: '1px solid #2d4a6b',
  color: '#ffffff',
  borderRadius: '8px',
  marginBottom: '16px',
  fontFamily: 'monospace',
  fontSize: '13px',
} as const

const summaryRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '16px',
  marginTop: '20px',
  marginBottom: '20px',
}

const summaryCard = {
  padding: '12px 16px',
  background: '#0b1f38',
  border: '1px solid #2d4a6b',
  borderRadius: '8px',
  minWidth: '140px',
  flex: '1 1 140px',
}

const summaryTitle = {
  fontSize: '11px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  marginBottom: '4px',
}

const summaryValue = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#ffffff',
}

const subPanel = {
  marginTop: '20px',
  padding: '16px',
  background: '#0b1f38',
  borderRadius: '10px',
  border: '1px solid #1e3a5f',
}

const subPanelHeaderRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center' as const,
  flexWrap: 'wrap' as const,
  gap: '10px',
  marginBottom: '10px',
}

const subHeading = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#ffffff',
  margin: 0,
}

const bodyText = {
  fontSize: '13px',
  color: '#cbd5e1',
  lineHeight: 1.6,
}

const selectLabel = {
  display: 'flex',
  alignItems: 'center' as const,
  gap: '8px',
  fontSize: '11px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}

const select = {
  background: '#04142b',
  border: '1px solid #2d4a6b',
  borderRadius: '6px',
  padding: '6px 10px',
  color: '#e2e8f0',
  fontSize: '12px',
}

const tableWrap = {
  overflowX: 'auto' as const,
}

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '13px',
}

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

const td = {
  padding: '8px 10px',
  borderBottom: '1px solid #1e293b',
  verticalAlign: 'top' as const,
  color: '#e2e8f0',
}

const tdMuted = {
  ...td,
  color: '#94a3b8',
}

const tdWrap = {
  ...td,
  maxWidth: '280px',
  color: '#94a3b8',
  fontSize: '12px',
}

const titleCell = {
  display: 'block',
  fontWeight: 700,
}

const summaryCell = {
  display: 'block',
  fontSize: '11px',
  color: '#64748b',
}

const pill = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.02em',
}
