'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClientAdvice } from '../lib/engines/client-advice'
import type { ClientPortfolioReview } from '../lib/engines/client-portfolio-reviews'
import { saveCommentarySelection } from '../lib/engines/client-portfolio-reviews'
import {
  ACTION_LABELS,
  commentaryItemsFor,
  commentaryKey,
  defaultCommentarySelection,
  type CommentaryItem,
} from '../lib/engines/security-commentary'

// Client Advice tab: pick which securities get a short brief in this client's
// proposal. Ticked = included, unticked = left out. The tick list is saved per
// client; the brief text is saved per security and reused for every client.

const keyOf = (i: CommentaryItem) => commentaryKey(i.code, i.kind)

export default function ProposalCommentaryEditor({
  advice,
  review,
  onMissingChange,
}: {
  advice: ClientAdvice
  review: ClientPortfolioReview | null
  /** Reports how many ticked securities have no saved brief yet (so the download can warn). */
  onMissingChange?: (missing: number) => void
}) {
  const items = useMemo(() => commentaryItemsFor(advice), [advice])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [text, setText] = useState<Record<string, string>>({})
  const [drafting, setDrafting] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  // Selection: what the adviser chose for this client, else sensible defaults.
  const reviewId = review?.id ?? null
  const chosen = review?.commentarySelection ?? null
  // Latest ticks this session, so recomputing the advice never reverts them.
  const latest = useRef<{ reviewId: string | null; keys: string[] } | null>(null)
  useEffect(() => {
    const valid = new Set(items.map(keyOf))
    const keys = latest.current?.reviewId === reviewId ? latest.current.keys : chosen ?? defaultCommentarySelection(items)
    setSelected(new Set(keys.filter((k) => valid.has(k))))
    // Re-seed only when the client or the proposal's securities change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, items])

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

  const ticked = items.filter((i) => selected.has(keyOf(i)))
  const missingSaved = ticked.filter((i) => !saved[keyOf(i)]?.trim()).length
  useEffect(() => {
    onMissingChange?.(missingSaved)
  }, [missingSaved, onMissingChange])

  if (items.length === 0) return null

  const unsaved = ticked.filter((i) => (text[keyOf(i)] ?? '').trim() !== (saved[keyOf(i)] ?? '').trim())
  const emptyTicked = ticked.filter((i) => !text[keyOf(i)]?.trim())

  async function toggle(i: CommentaryItem) {
    const k = keyOf(i)
    const next = new Set(selected)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    setSelected(next)
    latest.current = { reviewId, keys: Array.from(next) }
    if (!reviewId) return
    try {
      await saveCommentarySelection(reviewId, Array.from(next))
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not save the selection.' })
    }
  }

  async function draft(list: CommentaryItem[]) {
    if (list.length === 0) return
    setDrafting((prev) => new Set([...Array.from(prev), ...list.map(keyOf)]))
    setMessage(null)
    try {
      const res = await fetch('/api/proposals/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft', items: list }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Drafting failed.')
      setText((prev) => ({ ...prev, ...json.drafts }))
      setMessage({ tone: 'ok', text: 'Draft ready - review and edit, then save. Nothing appears in a proposal until saved.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Drafting failed.' })
    } finally {
      setDrafting((prev) => {
        const next = new Set(prev)
        for (const i of list) next.delete(keyOf(i))
        return next
      })
    }
  }

  async function saveAll() {
    setSaving(true)
    setMessage(null)
    try {
      const entries = unsaved
        .map((i) => ({ code: i.code, kind: i.kind, text: text[keyOf(i)] ?? '' }))
        .filter((e) => e.text.trim())
      const res = await fetch('/api/proposals/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', entries }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Save failed.')
      setSaved((prev) => ({ ...prev, ...Object.fromEntries(entries.map((e) => [commentaryKey(e.code, e.kind), e.text.trim()])) }))
      setMessage({ tone: 'ok', text: 'Saved - reused for any future client holding these securities.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  const groups: { title: string; rows: CommentaryItem[] }[] = [
    { title: 'Changes', rows: items.filter((i) => i.action !== 'hold') },
    { title: 'Holdings kept', rows: items.filter((i) => i.action === 'hold') },
  ].filter((g) => g.rows.length > 0)

  return (
    <div id="proposal-commentary">
      <h3 style={title}>
        Proposal commentary{' '}
        <span style={sub}>
          Tick a security to include a short brief on it in this proposal · {ticked.length} ticked
          {missingSaved > 0 ? ` · ${missingSaved} still to write` : ''}
        </span>
      </h3>

      <div style={toolbar}>
        <button type="button" style={secondary} onClick={() => draft(emptyTicked)} disabled={emptyTicked.length === 0 || drafting.size > 0}>
          {drafting.size > 0 ? 'Drafting…' : `Draft with AI (${emptyTicked.length} ticked without a brief)`}
        </button>
        <button type="button" style={primary} onClick={saveAll} disabled={saving || unsaved.length === 0}>
          {saving ? 'Saving…' : unsaved.length > 0 ? `Save ${unsaved.length}` : 'All saved'}
        </button>
        {message ? <span style={{ fontSize: '12px', color: message.tone === 'ok' ? '#86efac' : '#f87171' }}>{message.text}</span> : null}
      </div>

      {groups.map((g) => (
        <div key={g.title} style={{ marginTop: '12px' }}>
          <p style={groupTitle}>{g.title}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {g.rows.map((i) => {
              const k = keyOf(i)
              const on = selected.has(k)
              const isUnsaved = on && (text[k] ?? '').trim() !== (saved[k] ?? '').trim()
              return (
                <div key={k} style={{ ...row, opacity: on ? 1 : 0.65 }}>
                  <label style={rowHead}>
                    <input type="checkbox" checked={on} onChange={() => toggle(i)} aria-label={`Include a brief on ${i.code}`} />
                    <span style={{ color: '#38bdf8', fontWeight: 700, minWidth: '56px' }}>{i.code}</span>
                    <span style={{ color: '#e2e8f0', flex: 1 }}>{i.name}</span>
                    <span style={tag}>{ACTION_LABELS[i.action]}</span>
                    {i.fundType ? <span style={tag}>{i.fundType}</span> : null}
                    {on && saved[k] && !isUnsaved ? <span style={{ ...tag, color: '#86efac', borderColor: '#14532d' }}>saved</span> : null}
                    {isUnsaved ? <span style={{ ...tag, color: '#fbbf24', borderColor: '#78350f' }}>unsaved</span> : null}
                  </label>
                  {on ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '6px' }}>
                      <textarea
                        value={text[k] ?? ''}
                        onChange={(e) => setText((prev) => ({ ...prev, [k]: e.target.value }))}
                        placeholder={i.kind === 'exposure' ? 'One line on what it adds to the portfolio.' : 'One or two sentences on why.'}
                        rows={2}
                        style={input}
                      />
                      <button type="button" style={smallButton} onClick={() => draft([i])} disabled={drafting.has(k)}>
                        {drafting.has(k) ? '…' : text[k]?.trim() ? 'Redraft' : 'Draft'}
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const title = { fontSize: '15px', fontWeight: 700, color: '#e2e8f0', margin: '22px 0 10px', display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' as const }
const sub = { fontSize: '12px', fontWeight: 400, color: '#94a3b8' }
const toolbar = { display: 'flex', gap: '10px', flexWrap: 'wrap' as const, alignItems: 'center' }
const groupTitle = { fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#8fb7e8', margin: '0 0 6px' }
const row = { padding: '8px 12px', borderRadius: '10px', background: '#0d1f38', border: '1px solid #1e3a5f' }
const rowHead = { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' as const, fontSize: '13px', cursor: 'pointer' }
const tag = { fontSize: '10px', padding: '2px 8px', borderRadius: '999px', border: '1px solid #2d4a6b', color: '#94a3b8' }
const input = { flex: 1, padding: '8px 10px', borderRadius: '8px', fontSize: '13px', background: '#04142b', border: '1px solid #2d4a6b', color: '#e2e8f0', fontFamily: 'inherit', boxSizing: 'border-box' as const, resize: 'vertical' as const }
const primary = { padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
const secondary = { padding: '8px 16px', borderRadius: '8px', border: '1px solid #2d4a6b', background: 'transparent', color: '#e2e8f0', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }
const smallButton = { padding: '6px 12px', borderRadius: '8px', border: '1px solid #2d4a6b', background: 'transparent', color: '#e2e8f0', fontWeight: 600, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' as const }
