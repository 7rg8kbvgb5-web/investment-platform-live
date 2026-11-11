import { supabase } from '../supabase'
import { normaliseCode } from './codes'

// Remembered yield and franking for securities outside the house model
// (migration 0027) - looked up once, reused for every client who holds
// them, so the proposal can compare income today with the recommendation.
// Entries older than STALE_DAYS are looked up again on request.

const TABLE = 'security_income'
export const INCOME_STALE_DAYS = 90

export type SecurityIncome = { code: string; yield: number | null; frankingPct: number | null; note: string | null; updatedAt: string }

/** Remembered income data for the given codes. Returns {} (not an error) before migration 0027. */
export async function getSecurityIncome(codes: string[]): Promise<Record<string, SecurityIncome>> {
  const wanted = Array.from(new Set(codes.map(normaliseCode))).filter(Boolean)
  if (wanted.length === 0) return {}
  const { data, error } = await supabase.from(TABLE).select('*').in('code', wanted)
  if (error) return {}
  const out: Record<string, SecurityIncome> = {}
  for (const row of data ?? []) {
    out[row.code] = {
      code: row.code,
      yield: row.yield === null ? null : Number(row.yield),
      frankingPct: row.franking_pct === null ? null : Number(row.franking_pct),
      note: row.note,
      updatedAt: row.updated_at,
    }
  }
  return out
}

export async function saveSecurityIncome(entry: {
  code: string
  name?: string | null
  yield: number | null
  frankingPct: number | null
  note?: string | null
}): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert({
    code: normaliseCode(entry.code),
    name: entry.name ?? null,
    yield: entry.yield,
    franking_pct: entry.frankingPct,
    note: entry.note ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(`Couldn't save income data: ${error.message}`)
}

export function isIncomeStale(entry: SecurityIncome | undefined): boolean {
  if (!entry) return true
  // A lookup that found no yield is retried after a week; a found yield lasts 90 days.
  const days = entry.yield === null ? 7 : INCOME_STALE_DAYS
  return Date.now() - new Date(entry.updatedAt).getTime() > days * 86_400_000
}
