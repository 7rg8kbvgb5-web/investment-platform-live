import { lookupSecurity } from '../../../../lib/engines/security-lookup'
import { getSecurityIncome, isIncomeStale, saveSecurityIncome } from '../../../../lib/engines/security-income'
import { normaliseCode } from '../../../../lib/engines/codes'
import { describeAiError } from '../../../../lib/ai-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Looks up yield and franking for a client's current holdings that sit
// outside the model, and remembers them (see security-income.ts). Runs a
// few lookups at a time; anything already remembered and current is skipped.
const MAX_PER_CALL = 30
const CONCURRENCY = 4

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const items = (Array.isArray(body?.holdings) ? body.holdings : []) as { code: string; name?: string }[]
    const known = await getSecurityIncome(items.map((i) => i.code))
    const todo = items
      .filter((i) => i.code && isIncomeStale(known[normaliseCode(i.code)]))
      .slice(0, MAX_PER_CALL)

    const results: Record<string, { ok: boolean; yield?: number | null; error?: string }> = {}
    let index = 0
    async function worker() {
      while (index < todo.length) {
        const item = todo[index++]
        try {
          const r = await lookupSecurity(item.code)
          await saveSecurityIncome({
            code: item.code,
            name: r.name ?? item.name ?? null,
            yield: r.yield,
            frankingPct: r.frankingPct,
            note: r.yieldNote,
          })
          results[item.code] = { ok: true, yield: r.yield }
        } catch (error) {
          results[item.code] = { ok: false, error: describeAiError(error, 'Lookup failed') }
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker))
    return Response.json({ ok: true, looked: todo.length, skipped: items.length - todo.length, results })
  } catch (error) {
    return Response.json({ ok: false, error: describeAiError(error, 'Income lookup failed.') }, { status: 500 })
  }
}
