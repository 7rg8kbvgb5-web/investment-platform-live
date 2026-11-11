import { supabase } from '../supabase'
import { normaliseCode } from './codes'
import type { ClientAdvice } from './client-advice'

// Client-facing commentary for the proposal (migration 0031), kept per
// security: why we buy it, why we sell it, or - for ETFs and funds - the
// exposure it gives the portfolio. Written or approved once by an adviser,
// reused in every later proposal.

export type CommentaryKind = 'buy' | 'sell' | 'exposure'

export const COMMENTARY_LABELS: Record<CommentaryKind, string> = {
  buy: 'Why we recommend buying',
  sell: 'Why we recommend selling',
  exposure: 'What it adds to the portfolio',
}

/** Something the proposal should explain, with the facts a draft can draw on. */
export type CommentaryItem = {
  code: string
  name: string
  kind: CommentaryKind
  assetClass: string
  /** Facts for drafting: the platform's own reasoning for the trade, house view, holding type. */
  context: string
  /** 'ETF / listed fund' or 'Unlisted fund' for exposure lines. */
  fundType?: string
}

export function commentaryKey(code: string, kind: CommentaryKind): string {
  return `${normaliseCode(code)}:${kind}`
}

/** Outright buys and sells, and the funds in the recommended portfolio. */
export function commentaryItemsFor(advice: Pick<ClientAdvice, 'trades' | 'resultingHoldings'>): CommentaryItem[] {
  const items = new Map<string, CommentaryItem>()
  for (const t of advice.trades) {
    if (t.action !== 'buy' && t.action !== 'sell') continue
    const kind: CommentaryKind = t.action
    items.set(commentaryKey(t.code, kind), {
      code: normaliseCode(t.code),
      name: t.name,
      kind,
      assetClass: t.assetClass,
      context: [
        t.rationale,
        t.action === 'sell' && t.treatment === 'staged_exit' ? 'To be sold as a staged exit over time.' : '',
      ]
        .filter(Boolean)
        .join(' '),
    })
  }
  for (const h of advice.resultingHoldings) {
    if (h.holdingType !== 'listed_fund' && h.holdingType !== 'unlisted_fund') continue
    const fundType = h.holdingType === 'listed_fund' ? 'ETF / listed fund' : 'Unlisted fund'
    items.set(commentaryKey(h.code, 'exposure'), {
      code: normaliseCode(h.code),
      name: h.name,
      kind: 'exposure',
      assetClass: h.assetClass,
      fundType,
      context: `${fundType} held in the ${h.assetClass} allocation.`,
    })
  }
  const order: Record<CommentaryKind, number> = { buy: 0, sell: 1, exposure: 2 }
  return Array.from(items.values()).sort((a, b) => order[a.kind] - order[b.kind] || a.code.localeCompare(b.code))
}

/** Saved commentary, keyed by commentaryKey(code, kind). */
export async function fetchCommentary(codes: string[]): Promise<Record<string, string>> {
  const wanted = Array.from(new Set(codes.map(normaliseCode))).filter(Boolean)
  if (wanted.length === 0) return {}
  const { data, error } = await supabase.from('security_commentary').select('code, kind, text').in('code', wanted)
  if (error) {
    if (error.message.includes('security_commentary')) return {}
    throw new Error(`Failed to load commentary: ${error.message}`)
  }
  const out: Record<string, string> = {}
  for (const r of (data ?? []) as { code: string; kind: CommentaryKind; text: string }[]) {
    if (r.text?.trim()) out[commentaryKey(r.code, r.kind)] = r.text.trim()
  }
  return out
}

export async function saveCommentary(
  entries: { code: string; kind: CommentaryKind; text: string }[],
  updatedBy: string | null,
): Promise<void> {
  const rows = entries
    .filter((e) => e.text.trim())
    .map((e) => ({
      code: normaliseCode(e.code),
      kind: e.kind,
      text: e.text.trim(),
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    }))
  if (rows.length === 0) return
  const { error } = await supabase.from('security_commentary').upsert(rows, { onConflict: 'code,kind' })
  if (error) {
    throw new Error(
      error.message.includes('security_commentary')
        ? 'Run migration 0031 in Supabase to save proposal commentary.'
        : `Failed to save commentary: ${error.message}`,
    )
  }
}
