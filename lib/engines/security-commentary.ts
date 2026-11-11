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

/** A security in the proposal that can carry a brief, with the facts a draft can draw on. */
export type CommentaryItem = {
  code: string
  name: string
  kind: CommentaryKind
  assetClass: string
  /** What happens to it in this proposal. */
  action: 'buy' | 'increase' | 'sell' | 'reduce' | 'hold'
  /** direct_equity / listed_fund / unlisted_fund / ... where known. */
  holdingType: string | null
  /** Facts for drafting: the platform's own reasoning for the trade, holding type. */
  context: string
  /** 'ETF / listed fund' or 'Unlisted fund' where relevant. */
  fundType?: string
}

export const ACTION_LABELS: Record<CommentaryItem['action'], string> = {
  buy: 'New purchase',
  increase: 'Top-up',
  sell: 'Full sale',
  reduce: 'Partial sale',
  hold: 'Held',
}

export function commentaryKey(code: string, kind: CommentaryKind): string {
  return `${normaliseCode(code)}:${kind}`
}

function fundTypeOf(holdingType: string | null | undefined): string | undefined {
  if (holdingType === 'listed_fund') return 'ETF / listed fund'
  if (holdingType === 'unlisted_fund') return 'Unlisted fund'
  return undefined
}

/**
 * Every security in the proposal: each trade (buy, top-up, sale, trim) and
 * each holding kept without a trade. A traded security gets a "why" brief
 * (buy or sell); a held one gets a "what it adds" brief.
 */
export function commentaryItemsFor(advice: Pick<ClientAdvice, 'trades' | 'resultingHoldings'>): CommentaryItem[] {
  const typeByCode = new Map(advice.resultingHoldings.map((h) => [normaliseCode(h.code), h.holdingType ?? null]))
  const items = new Map<string, CommentaryItem>()
  for (const t of advice.trades) {
    const code = normaliseCode(t.code)
    const kind: CommentaryKind = t.action === 'buy' || t.action === 'increase' ? 'buy' : 'sell'
    const holdingType = typeByCode.get(code) ?? null
    items.set(code, {
      code,
      name: t.name,
      kind,
      assetClass: t.assetClass,
      action: t.action,
      holdingType,
      fundType: fundTypeOf(holdingType),
      context: [
        `${ACTION_LABELS[t.action]}.`,
        t.rationale,
        t.treatment === 'staged_exit' ? 'To be sold as a staged exit over time.' : '',
      ]
        .filter(Boolean)
        .join(' '),
    })
  }
  for (const h of advice.resultingHoldings) {
    const code = normaliseCode(h.code)
    if (items.has(code) || h.holdingType === 'cash') continue
    const fundType = fundTypeOf(h.holdingType)
    items.set(code, {
      code,
      name: h.name,
      kind: 'exposure',
      assetClass: h.assetClass,
      action: 'hold',
      holdingType: h.holdingType ?? null,
      fundType,
      context: `${fundType ?? 'Holding'} kept in the ${h.assetClass} allocation${h.inModel ? '' : ' (retained outside the house model)'}.`,
    })
  }
  const order: Record<CommentaryItem['action'], number> = { buy: 0, increase: 1, sell: 2, reduce: 3, hold: 4 }
  return Array.from(items.values()).sort((a, b) => order[a.action] - order[b.action] || a.code.localeCompare(b.code))
}

/** Ticked by default until the adviser chooses: outright buys and sells, and every ETF / fund. */
export function defaultCommentarySelection(items: CommentaryItem[]): string[] {
  return items
    .filter((i) => i.action === 'buy' || i.action === 'sell' || i.fundType)
    .map((i) => commentaryKey(i.code, i.kind))
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
