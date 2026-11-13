'use client'

import { useEffect, useState } from 'react'
import Panel from './ui/Panel'
import StatusBox from './dashboard/StatusBox'
import { listCurrentTopIdeas, type SourceTopIdeas } from '../lib/engines/research-library'
import { fetchCoreSecurities, type CoreSecurity } from '../lib/engines/model-portfolio-core'
import { listApprovedSecurities, type ApprovedSecurity } from '../lib/engines/approved-list'

// Each house's current Top Ideas against the model: which are held (and
// where), which are on the Approved List but not held, and which aren't on
// the list at all. Ideas the model doesn't hold are raised automatically
// in the Investment Committee queue for a decision.

export default function TopIdeasVsModelPanel() {
  const [lists, setLists] = useState<SourceTopIdeas[]>([])
  const [model, setModel] = useState<Map<string, CoreSecurity>>(new Map())
  const [approved, setApproved] = useState<Map<string, ApprovedSecurity>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listCurrentTopIdeas(), fetchCoreSecurities(), listApprovedSecurities().catch((): ApprovedSecurity[] => [])])
      .then(([ideas, securities, approvedList]) => {
        setLists(ideas)
        setModel(new Map(securities.map((s) => [s.code.toUpperCase(), s])))
        setApproved(new Map(approvedList.map((a): [string, ApprovedSecurity] => [a.code.toUpperCase(), a])))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load Top Ideas.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Panel eyebrow="House views vs the model" title="Top Ideas vs Model Portfolio">
      <p style={intro}>
        Each source&apos;s current Top Ideas list, checked against what the model actually holds. Ideas the
        model doesn&apos;t hold go to the Investment Committee queue for a decision.
      </p>
      {error ? <StatusBox variant="error">{error}</StatusBox> : null}
      {loading ? <p style={muted}>Loading…</p> : null}
      {!loading && lists.length === 0 && !error ? (
        <StatusBox variant="neutral">
          No Top Ideas lists yet. Upload an Ord Minnett or Barrenjoey Top Ideas PDF in the Research Library above
          and it&apos;s read and compared here automatically.
        </StatusBox>
      ) : null}
      <div style={grid}>
        {lists.map((list) => {
          const held = list.ideas.filter((i) => model.has(i.code))
          return (
            <div key={list.documentId} style={card}>
              <div style={cardHeader}>
                <span style={sourceName}>{list.source}</span>
                <span style={muted}>
                  {held.length} of {list.ideas.length} held
                </span>
              </div>
              <p style={muted}>
                {list.title}
                {list.publishedAt ? ` · ${list.publishedAt}` : ''}
              </p>
              <table style={table}>
                <tbody>
                  {list.ideas.map((idea) => {
                    const inModel = model.get(idea.code)
                    const onList = approved.get(idea.code)
                    return (
                      <tr key={idea.code}>
                        <td style={{ ...td, fontWeight: 700, color: '#38bdf8' }}>{idea.code}</td>
                        <td style={td}>{idea.name ?? inModel?.name ?? onList?.name ?? ''}</td>
                        <td style={tdMuted}>{idea.rating ?? ''}</td>
                        <td style={td}>
                          {inModel ? (
                            <span style={{ ...pill, background: '#0f3d2e', color: '#4ade80' }}>
                              Held · {inModel.assetClass}
                            </span>
                          ) : onList && onList.status === 'approved' ? (
                            <span style={{ ...pill, background: '#3f3a12', color: '#facc15' }}>Approved, not held</span>
                          ) : (
                            <span style={{ ...pill, background: '#3f1620', color: '#f87171' }}>Not on Approved List</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

const intro = { fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 14px' }
const muted = { fontSize: '12px', color: '#94a3b8', margin: '0 0 8px' }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }
const card = { padding: '14px', borderRadius: '10px', background: '#0d1f38', border: '1px solid #1e3a5f' }
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }
const sourceName = { fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }
const table = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' }
const td = { padding: '6px 6px', color: '#e2e8f0', borderBottom: '1px solid #1e3a5f' }
const tdMuted = { ...td, color: '#94a3b8' }
const pill = { padding: '3px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap' as const }
