'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ClientAdvice } from '../lib/engines/client-advice'
import {
  COMMENTARY_LABELS,
  commentaryItemsFor,
  commentaryKey,
  type CommentaryItem,
} from '../lib/engines/security-commentary'

// Client Advice tab: the short explanations printed in the proposal for
// outright buys and sells, and one line on each ETF / fund held. Saved per
// security, so each is written (or approved) once and reused for every client.

export default function ProposalCommentaryEditor({ advice }: { advice: ClientAdvice }) {
  const items = useMemo(() => commentaryItemsFor(advice), [advice])
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [text, setText] = useState<Record<string, string>>({})
  const [drafting, setDrafting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const codes = items.map((i) => i.code).join(',')
  useEffect(() => {
    if (!codes) return
    let cancelled = false
    fetch(`/api/proposals/commentary?codes=${encodeURIComponent(codes)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json.ok) return
        setSaved(json.commentary)
        setText(json.commentary)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [codes])

  if (items.length === 0) return null

  const key = (i: CommentaryItem) => commentaryKey(i.code, i.kind)
  const missing = items.filter((i) => !text[key(i)]?.trim())
  const unsaved = items.filter((i) => (text[key(i)] ?? '').trim() !== (saved[key(i)] ?? '').trim())

  async function draftMissing() {
    setDrafting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/proposals/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft', items: missing }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Drafting failed.')
      setText((prev) => ({ ...prev, ...json.drafts }))
      setMessage({ tone: 'ok', text: 'Drafts added - review and edit, then save. Nothing appears in a proposal until saved.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Drafting failed.' })
    } finally {
      setDrafting(false)
    }
  }

  async function saveAll() {
    setSaving(true)
    setMessage(null)
    try {
      const entries = unsaved
        .map((i) => ({ code: i.code, kind: i.kind, text: text[key(i)] ?? '' }))
        .filter((e) => e.text.trim())
      const res = await fetch('/api/proposals/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', entries }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Save failed.')
      setSaved((prev) => ({ ...prev, ...Object.fromEntries(entries.map((e) => [commentaryKey(e.code, e.kind), e.text.trim()])) }))
      setMessage({ tone: 'ok', text: 'Saved - used in this and every future proposal that includes these securities.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 style={title}>
        Proposal commentary{' '}
        <span style={sub}>
          {items.length - missing.length} of {items.length} written · saved per security and reused for every client
        </span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map((i) => {
          const k = key(i)
          const isUnsaved = (text[k] ?? '').trim() !== (saved[k] ?? '').trim()
          return (
            <div key={k} style={row}>
              <div style={rowHead}>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>{i.code}</span>
                <span style={{ color: '#e2e8f0' }}>{i.name}</span>
                <span style={tag}>{i.kind === 'exposure' ? i.fundType : COMMENTARY_LABELS[i.kind]}</span>
                {isUnsaved ? <span style={{ ...tag, color: '#fbbf24', borderColor: '#78350f' }}>unsaved</span> : null}
              </div>
              <textarea
                value={text[k] ?? ''}
                onChange={(e) => setText((prev) => ({ ...prev, [k]: e.target.value }))}
                placeholder={i.kind === 'exposure' ? 'One line on the exposure this fund gives the portfolio.' : 'One or two sentences on why.'}
                rows={2}
                style={input}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {missing.length > 0 ? (
          <button type="button" style={secondary} onClick={draftMissing} disabled={drafting}>
            {drafting ? 'Drafting…' : `Draft ${missing.length} with AI`}
          </button>
        ) : null}
        <button type="button" style={primary} onClick={saveAll} disabled={saving || unsaved.length === 0}>
          {saving ? 'Saving…' : unsaved.length > 0 ? `Save ${unsaved.length}` : 'All saved'}
        </button>
        {message ? <span style={{ fontSize: '12px', color: message.tone === 'ok' ? '#86efac' : '#f87171' }}>{message.text}</span> : null}
      </div>
    </div>
  )
}

const title = { fontSize: '15px', fontWeight: 700, color: '#e2e8f0', margin: '22px 0 10px', display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' as const }
const sub = { fontSize: '12px', fontWeight: 400, color: '#94a3b8' }
const row = { padding: '10px 12px', borderRadius: '10px', background: '#0d1f38', border: '1px solid #1e3a5f' }
const rowHead = { display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' as const, fontSize: '13px', marginBottom: '6px' }
const tag = { fontSize: '10px', padding: '2px 8px', borderRadius: '999px', border: '1px solid #2d4a6b', color: '#94a3b8' }
const input = { width: '100%', padding: '8px 10px', borderRadius: '8px', fontSize: '13px', background: '#04142b', border: '1px solid #2d4a6b', color: '#e2e8f0', fontFamily: 'inherit', boxSizing: 'border-box' as const, resize: 'vertical' as const }
const primary = { padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
const secondary = { padding: '8px 16px', borderRadius: '8px', border: '1px solid #2d4a6b', background: 'transparent', color: '#e2e8f0', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }
