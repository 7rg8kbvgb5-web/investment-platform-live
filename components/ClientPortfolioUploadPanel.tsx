'use client'

import { useMemo, useState } from 'react'
import {
  parseClientPortfolioCsv,
  ParsedPortfolioUpload,
} from '../lib/engines/client-portfolio-upload'
import { mapClientHoldings } from '../lib/engines/client-holdings-mapping'

export default function ClientPortfolioUploadPanel() {
  const [csvText, setCsvText] = useState('')

  const result: ParsedPortfolioUpload = useMemo(() => {
    if (!csvText.trim()) {
      return {
        holdings: [],
        totalWeight: 0,
        unmappedRows: [],
        warnings: [],
      }
    }

    return parseClientPortfolioCsv(csvText)
  }, [csvText])

  const mappingResult = useMemo(() => {
    return mapClientHoldings(result.holdings)
  }, [result.holdings])

  return (
    <section style={panel}>
      <h2 style={heading}>Client Portfolio Upload</h2>

      <p style={description}>
        Paste a CSV export from a platform or a manually prepared holdings file.
      </p>

      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        placeholder={`Code,Weight
CBA,12
BHP,10
MQG,8
NST,5`}
        style={textarea}
      />

      <div style={summaryRow}>
        <SummaryCard title="Holdings" value={String(result.holdings.length)} />
        <SummaryCard title="Portfolio Weight" value={`${result.totalWeight}%`} />
        <SummaryCard
          title="Mapped Holdings"
          value={String(mappingResult.mappedCount)}
        />
        <SummaryCard
          title="Unmapped"
          value={String(mappingResult.unmappedCount)}
        />
      </div>

      {result.warnings.length > 0 && (
        <div style={warningBox}>
          <strong>Warnings</strong>
          <ul>
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {result.holdings.length > 0 && (
        <div style={mappingPanel}>
          <h3 style={subHeading}>Sector Exposure</h3>

          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Sector</th>
                <th style={th}>Exposure</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(mappingResult.sectorExposure).map(
                ([sector, exposure]) => (
                  <tr key={sector}>
                    <td style={td}>{sector}</td>
                    <td style={td}>{Math.round(exposure * 100) / 100}%</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {result.holdings.length > 0 && (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Code</th>
              <th style={th}>Weight</th>
              <th style={th}>Sector</th>
              <th style={th}>Asset Class</th>
              <th style={th}>Status</th>
            </tr>
          </thead>

          <tbody>
            {mappingResult.mappedHoldings.map((holding) => (
              <tr key={`${holding.code}-${holding.weight}`}>
                <td style={td}>{holding.code}</td>
                <td style={td}>{holding.weight}%</td>
                <td style={td}>{holding.sector}</td>
                <td style={td}>{holding.assetClass}</td>
                <td style={td}>{holding.mapped ? 'Mapped' : 'Unmapped'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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

const panel = {
  marginBottom: '24px',
  padding: '24px',
  background: '#04142b',
  borderRadius: '16px',
  border: '1px solid #1e3a5f',
} as const

const heading = {
  marginBottom: '8px',
  color: '#ffffff',
} as const

const description = {
  marginBottom: '16px',
  color: '#9db4d3',
} as const

const textarea = {
  width: '100%',
  minHeight: '220px',
  padding: '12px',
  background: '#02101f',
  border: '1px solid #1e3a5f',
  color: '#ffffff',
  borderRadius: '8px',
  marginBottom: '16px',
} as const

const summaryRow = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '16px',
  marginBottom: '16px',
} as const

const summaryCard = {
  padding: '12px',
  background: '#082040',
  borderRadius: '8px',
  minWidth: '140px',
} as const

const summaryTitle = {
  fontSize: '12px',
  color: '#9db4d3',
} as const

const summaryValue = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#ffffff',
} as const

const warningBox = {
  padding: '12px',
  background: '#3f2b00',
  borderRadius: '8px',
  marginBottom: '16px',
  color: '#ffd27d',
} as const

const mappingPanel = {
  marginBottom: '20px',
  padding: '16px',
  background: '#061a33',
  borderRadius: '12px',
  border: '1px solid #1e3a5f',
} as const

const subHeading = {
  marginBottom: '12px',
  color: '#ffffff',
} as const

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  marginBottom: '16px',
} as const

const th = {
  textAlign: 'left' as const,
  borderBottom: '1px solid #1e3a5f',
  padding: '10px',
  color: '#9db4d3',
} as const

const td = {
  padding: '10px',
  borderBottom: '1px solid #0f2746',
  color: '#ffffff',
} as const