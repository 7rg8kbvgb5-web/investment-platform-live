import { isMissingModelColumn } from '../model-context'
import { supabase } from '../supabase'
import type { UploadedHolding } from './client-portfolio-upload'
import { normaliseCode } from './security-universe'

// Client impact: for a given security, which clients currently hold it,
// at what weight, and how many dollars are affected. Reads the saved
// client reviews on the Construction tab - the platform's record of each
// client's actual holdings - so one Investment Committee decision turns
// straight into a list of clients to contact.

export type ClientExposure = {
  reviewId: string
  clientName: string
  updatedAt: string
  weight: number
  /** Dollar value of the holding - stated on the statement, or weight x portfolio value. Null if neither is known. */
  value: number | null
}

export type SecurityImpact = {
  code: string
  clients: ClientExposure[]
  totalValue: number
  /** Clients holding it whose dollar value couldn't be worked out (no portfolio value on file). */
  unvaluedCount: number
}

type ReviewRow = {
  id: string
  client_name: string
  updated_at: string
  holdings: UploadedHolding[] | null
  extraction_meta: { totalPortfolioValue: number | null } | null
  manual_portfolio_value: string | null
}

/** Which of an adviser model's clients hold each code (all clients if no model is given). */
export async function getClientImpact(codes: string[], modelId?: string | null): Promise<Record<string, SecurityImpact>> {
  const wanted = Array.from(new Set(codes.map(normaliseCode).filter(Boolean)))
  const result: Record<string, SecurityImpact> = {}
  for (const code of wanted) result[code] = { code, clients: [], totalValue: 0, unvaluedCount: 0 }
  if (wanted.length === 0) return result

  const query = () =>
    supabase
      .from('client_portfolio_reviews')
      .select('id, client_name, updated_at, holdings, extraction_meta, manual_portfolio_value')
      .order('updated_at', { ascending: false })
  let { data, error } = modelId ? await query().eq('model_id', modelId) : await query()
  if (isMissingModelColumn(error)) ({ data, error } = await query())
  if (error) throw new Error(`Failed to read client reviews: ${error.message}`)

  for (const row of (data ?? []) as ReviewRow[]) {
    const holdings = row.holdings ?? []
    if (holdings.length === 0) continue
    const portfolioValue =
      row.extraction_meta?.totalPortfolioValue ??
      (row.manual_portfolio_value ? parseFloat(row.manual_portfolio_value) || null : null)

    const byCode = new Map<string, { weight: number; value: number | null }>()
    for (const h of holdings) {
      const code = normaliseCode(h.code)
      if (!result[code]) continue
      const value = h.value ?? (portfolioValue ? (h.weight / 100) * portfolioValue : null)
      const prev = byCode.get(code)
      byCode.set(code, {
        weight: (prev?.weight ?? 0) + h.weight,
        value: prev && prev.value === null ? null : value === null ? null : (prev?.value ?? 0) + value,
      })
    }

    for (const [code, exposure] of Array.from(byCode.entries())) {
      const impact = result[code]
      impact.clients.push({
        reviewId: row.id,
        clientName: row.client_name,
        updatedAt: row.updated_at,
        weight: round2(exposure.weight),
        value: exposure.value === null ? null : round2(exposure.value),
      })
      if (exposure.value === null) impact.unvaluedCount += 1
      else impact.totalValue = round2(impact.totalValue + exposure.value)
    }
  }

  for (const impact of Object.values(result)) {
    impact.clients.sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || b.weight - a.weight)
  }
  return result
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
