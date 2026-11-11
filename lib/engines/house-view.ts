import { supabase } from '../supabase'
import { normaliseCode } from './codes'
import { classifyRating, type RatingLean } from './rating-scale'

// A broker's current view on a security - rating, price target, risk and
// rating date - from uploaded research (a coverage universe spreadsheet or
// research PDFs), with upside to target and simple checks an adviser should
// see. One batched query; superseded coverage universes are ignored so a
// stock dropped from coverage loses its old view.

export type HouseViewSource = 'Ord Minnett' | 'Barrenjoey'

export type HouseViewEntry = {
  code: string
  name: string | null
  source: HouseViewSource
  rating: string
  lean: RatingLean
  priceTarget: number | null
  risk: string | null
  ratingDate: string | null
  /** Latest close (from the daily price cache or the caller), if known. */
  price: number | null
  /** Price target / price - 1, as a decimal. */
  upside: number | null
  /** Short, adviser-facing checks that failed - empty when nothing needs attention. */
  flags: string[]
}

type Row = {
  code: string
  name: string | null
  rating: string | null
  price_target: number | null
  risk?: string | null
  rating_date?: string | null
  created_at: string
  research_documents: { source: string; document_type: string; is_current: boolean | null; published_at: string | null } | null
}

const STALE_DAYS = 365

/** Current house views for the given codes (or every covered security if codes is omitted). */
export async function fetchHouseViews(
  codes?: string[],
  source: HouseViewSource = 'Ord Minnett',
  prices?: Record<string, number | null | undefined>,
): Promise<Map<string, HouseViewEntry>> {
  const wanted = codes ? Array.from(new Set(codes.map(normaliseCode))).filter(Boolean) : null
  if (wanted && wanted.length === 0) return new Map()

  const select =
    'code, name, rating, price_target, risk, rating_date, created_at, research_documents!inner(source, document_type, is_current, published_at)'
  const run = async (columns: string) => {
    let q = supabase
      .from('research_document_securities')
      .select(columns)
      .eq('research_documents.source', source)
      .not('rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5000)
    if (wanted) q = q.in('code', wanted)
    return q
  }
  let { data, error } = await run(select)
  if (error && /risk|rating_date/.test(error.message)) {
    // Before migration 0030.
    ;({ data, error } = await run(select.replace('risk, rating_date, ', '')))
  }
  if (error) throw new Error(`Failed to load house views: ${error.message}`)

  const latest = new Map<string, Row>()
  for (const row of (data ?? []) as unknown as Row[]) {
    const doc = row.research_documents
    if (doc?.document_type === 'Coverage Universe' && doc.is_current === false) continue
    const code = normaliseCode(row.code)
    if (!latest.has(code)) latest.set(code, row)
  }

  const cached = await cachedPrices(Array.from(latest.keys()).filter((c) => prices?.[c] == null))

  const result = new Map<string, HouseViewEntry>()
  for (const [code, row] of Array.from(latest.entries())) {
    const price = prices?.[code] ?? cached[code] ?? null
    result.set(code, buildEntry(code, row, source, price))
  }
  return result
}

function buildEntry(code: string, row: Row, source: HouseViewSource, price: number | null): HouseViewEntry {
  const rating = (row.rating ?? '').trim()
  const lean = classifyRating(rating)
  const priceTarget = row.price_target === null || row.price_target === undefined ? null : Number(row.price_target)
  const ratingDate = row.rating_date ?? row.research_documents?.published_at ?? null
  const upside = priceTarget && price && price > 0 ? Math.round((priceTarget / price - 1) * 1000) / 1000 : null

  const flags: string[] = []
  if (lean === 'bearish') flags.push(`${source} rates it ${rating}`)
  else if (lean === 'neutral' && upside !== null && upside < 0) flags.push('Hold with the price above target')
  else if (lean === 'bullish' && upside !== null && upside < 0) flags.push('Price is above target')
  if (ratingDate && Date.now() - Date.parse(`${ratingDate}T00:00:00Z`) > STALE_DAYS * 86400000)
    flags.push('Rating over 12 months old')

  return {
    code,
    name: row.name,
    source,
    rating,
    lean,
    priceTarget,
    risk: row.risk ?? null,
    ratingDate,
    price,
    upside,
    flags,
  }
}

/** Latest close per code from the daily price cache (no data-feed calls). */
async function cachedPrices(codes: string[]): Promise<Record<string, number>> {
  if (codes.length === 0) return {}
  try {
    const { data } = await supabase.from('price_history_cache').select('code, closes').in('code', codes)
    const out: Record<string, number> = {}
    for (const r of (data ?? []) as { code: string; closes: unknown }[]) {
      const closes = Array.isArray(r.closes) ? (r.closes as number[]) : []
      const last = closes[closes.length - 1]
      if (typeof last === 'number' && last > 0) out[normaliseCode(r.code)] = last
    }
    return out
  } catch {
    return {}
  }
}

/** One plain-English line for a proposal or tooltip, e.g. "Ord Minnett rates Buy, target $5.67 (12% upside)". */
export function houseViewSentence(v: HouseViewEntry): string {
  const parts = [`${v.source} rates ${v.rating}`]
  if (v.priceTarget !== null) {
    let target = `target ${money(v.priceTarget)}`
    if (v.upside !== null) {
      const pct = Math.round(Math.abs(v.upside) * 100)
      target += v.upside >= 0 ? ` (${pct}% upside)` : ` (${pct}% below the current price)`
    }
    parts.push(target)
  }
  return parts.join(', ')
}

export function formatRatingDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function money(v: number): string {
  return `$${v < 10 ? v.toFixed(2) : v.toFixed(v < 100 ? 2 : 0)}`
}
