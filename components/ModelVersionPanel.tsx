'use client'

import { useEffect, useState } from 'react'
import {
  getLatestModelVersion,
  listModelChanges,
  listModelVersions,
  listUnpublishedChanges,
  publishModelVersion,
  type ModelChange,
  type ModelVersion,
} from '../lib/engines/model-versioning'

// Sits at the top of the Model Portfolio tab: which version of the house
// model is current, what's been changed since it was published, and a
// button to publish those changes as the next version. Client reviews
// record the version they were built against, so publishing is what tells
// the platform which clients' advice now needs refreshing.

export default function ModelVersionPanel() {
  const [latest, setLatest] = useState<ModelVersion | null>(null)
  const [unpublished, setUnpublished] = useState<ModelChange[]>([])
  const [versions, setVersions] = useState<ModelVersion[]>([])
  const [log, setLog] = useState<ModelChange[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPublish, setShowPublish] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [summary, setSummary] = useState('')
  const [publishing, setPublishing] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [v, u, all, recent] = await Promise.all([
        getLatestModelVersion(),
        listUnpublishedChanges(),
        listModelVersions(),
        listModelChanges(60),
      ])
      setLatest(v)
      setUnpublished(u)
      setVersions(all)
      setLog(recent)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load model versions.'
      setError(
        message.includes('model_versions') || message.includes('model_change_log')
          ? 'Model versioning isn’t set up yet — run migration 0019 in Supabase.'
          : message,
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Edits on this tab log changes; refresh the unpublished count when
    // the adviser comes back to the window or tab.
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  async function publish() {
    setPublishing(true)
    setError(null)
    try {
      await publishModelVersion({ summary })
      setSummary('')
      setShowPublish(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish.')
    } finally {
      setPublishing(false)
    }
  }

  if (error) return <div style={{ ...bar, borderColor: '#7f1d1d' }}><span style={errorText}>{error}</span></div>
  if (loading && !latest) return <div style={bar}><span style={muted}>Loading model version…</span></div>

  return (
    <div style={bar}>
      <div style={row}>
        <div style={versionBlock}>
          <span style={label}>House model</span>
          <span style={versionText}>Version {latest?.version ?? '—'}</span>
          {latest ? (
            <span style={muted}>
              Published {new Date(latest.publishedAt).toLocaleDateString('en-AU')}
              {latest.publishedBy ? ` by ${latest.publishedBy}` : ''} — {latest.summary}
            </span>
          ) : null}
        </div>
        <div style={actions}>
          {unpublished.length > 0 ? (
            <span style={pendingPill}>
              {unpublished.length} unpublished change{unpublished.length === 1 ? '' : 's'}
            </span>
          ) : (
            <span style={cleanPill}>Up to date</span>
          )}
          <button type="button" style={button} onClick={() => setShowPublish((v) => !v)} disabled={unpublished.length === 0}>
            Publish version {(latest?.version ?? 0) + 1}
          </button>
          <button type="button" style={linkButton} onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Hide history' : 'History'}
          </button>
        </div>
      </div>

      {showPublish && unpublished.length > 0 ? (
        <div style={publishBox}>
          <p style={sectionTitle}>Changes going into version {(latest?.version ?? 0) + 1}</p>
          <ul style={list}>
            {unpublished.map((c) => (
              <li key={c.id} style={listItem}>
                {c.description}
                <span style={muted}>
                  {' '}
                  — {c.changedBy ?? 'unknown'}, {new Date(c.createdAt).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </li>
            ))}
          </ul>
          <textarea
            placeholder="Summary of this version — e.g. 'Quarterly rebalance: trimmed Australian Equities, added CSL'"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            style={textarea}
          />
          <button type="button" style={button} onClick={publish} disabled={publishing || !summary.trim()}>
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
          <p style={muted}>
            Client reviews built on an earlier version will show as needing a refresh against this one.
          </p>
        </div>
      ) : null}

      {showHistory ? (
        <div style={historyGrid}>
          <div>
            <p style={sectionTitle}>Versions</p>
            <ul style={list}>
              {versions.map((v) => (
                <li key={v.version} style={listItem}>
                  <strong>v{v.version}</strong> · {new Date(v.publishedAt).toLocaleDateString('en-AU')}
                  {v.publishedBy ? ` · ${v.publishedBy}` : ''}
                  <span style={{ ...muted, display: 'block' }}>{v.summary}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p style={sectionTitle}>Change log</p>
            {log.length === 0 ? (
              <p style={muted}>No changes recorded yet.</p>
            ) : (
              <ul style={list}>
                {log.map((c) => (
                  <li key={c.id} style={listItem}>
                    {c.description}
                    <span style={{ ...muted, display: 'block' }}>
                      {c.changedBy ?? 'unknown'} · {new Date(c.createdAt).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                      {c.icDecisionId ? ' · Investment Committee decision' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

const bar = {
  padding: '14px 16px',
  borderRadius: '12px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  marginBottom: '18px',
}
const row = { display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' as const, alignItems: 'center' }
const versionBlock = { display: 'flex', flexDirection: 'column' as const, gap: '2px' }
const label = { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const versionText = { fontSize: '18px', fontWeight: 700, color: '#ffffff' }
const muted = { fontSize: '12px', color: '#94a3b8' }
const errorText = { fontSize: '13px', color: '#fca5a5' }
const actions = { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }
const pillBase = { padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }
const pendingPill = { ...pillBase, background: '#3f3a12', color: '#facc15' }
const cleanPill = { ...pillBase, background: '#0f3d2e', color: '#4ade80' }
const button = {
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  background: '#0e7490',
  color: '#ffffff',
  border: '1px solid #0891b2',
}
const linkButton = { background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer' }
const publishBox = { marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column' as const, gap: '10px', alignItems: 'flex-start' }
const sectionTitle = { margin: 0, fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }
const list = { margin: 0, paddingLeft: '18px', maxHeight: '260px', overflowY: 'auto' as const }
const listItem = { fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '4px' }
const textarea = {
  width: '100%',
  minHeight: '56px',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
}
const historyGrid = {
  marginTop: '14px',
  paddingTop: '14px',
  borderTop: '1px solid #1e3a5f',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px',
}
