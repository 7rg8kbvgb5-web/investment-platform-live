import { fetchHouseViews } from '../../../../lib/engines/house-view'
import { fetchCoreSecurities } from '../../../../lib/engines/model-portfolio-core'
import { selectedModelIdFromCookies } from '../../../../lib/model-context-server'
import { getBulkEod, isEodhdConfigured } from '../../../../lib/eodhd-client'
import { normaliseCode } from '../../../../lib/engines/codes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Securities Ord Minnett rates Buy/Accumulate that aren't in the selected
 * adviser's model, ranked by upside to price target where a price is known
 * (whole-market prices need the EODHD paid plan), else by most recent rating.
 */
export async function GET() {
  try {
    const held = new Set(
      (await fetchCoreSecurities(await selectedModelIdFromCookies())).map((s) => normaliseCode(s.code)),
    )

    let prices: Record<string, number> = {}
    let pricesAvailable = false
    if (isEodhdConfigured()) {
      try {
        const rows = await getBulkEod('AU')
        if (Array.isArray(rows) && rows.length > 0) {
          for (const r of rows) if (r.close > 0) prices[normaliseCode(r.code)] = r.close
          pricesAvailable = true
        }
      } catch {
        prices = {}
      }
    }

    const views = await fetchHouseViews(undefined, 'Ord Minnett', prices)
    const ideas = Array.from(views.values())
      .filter((v) => v.lean === 'bullish' && !held.has(v.code))
      .sort((a, b) => {
        if (a.upside !== null && b.upside !== null) return b.upside - a.upside
        if (a.upside !== null) return -1
        if (b.upside !== null) return 1
        return (b.ratingDate ?? '').localeCompare(a.ratingDate ?? '')
      })

    return Response.json({ ok: true, ideas, pricesAvailable })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
