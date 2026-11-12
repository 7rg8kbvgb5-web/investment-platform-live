import { getDividends, isEodhdConfigured, toEodhdTicker, type EodhdDividend } from '../eodhd-client'
import { normaliseCode } from './codes'

// Income calendar: when in the year the recommended portfolio's income is
// paid. Each listed holding's estimated annual income is spread across the
// months it actually paid in over the last year (EODHD distribution
// history). Cash pays monthly. Anything without a payment history - unlisted
// funds, bonds, or a listed code with no data - is assumed to pay quarterly
// and is marked as estimated timing.

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** Shown in financial-year order: July to June. */
export const FY_ORDER = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5]
const QUARTERLY = [2, 5, 8, 11] // Mar, Jun, Sep, Dec

/** 12 weights (Jan..Dec) summing to 1. */
export type PaymentPattern = number[]

export type CalendarHolding = { code: string; income: number; holdingType?: string | null }

export type IncomeCalendarMonth = {
  /** 0 = January. */
  month: number
  label: string
  /** Income with a known payment pattern. */
  known: number
  /** Income whose timing is assumed (quarterly). */
  estimated: number
  total: number
}

export type IncomeCalendar = {
  /** Financial-year order, July first. */
  months: IncomeCalendarMonth[]
  totalIncome: number
  /** % of income whose timing comes from actual payment history (or cash). */
  knownTimingPct: number
  /** Codes whose timing was assumed. */
  estimatedCodes: string[]
}

/** Ticker-like codes worth asking EODHD about: 3-6 letters/digits, at least one letter, not an ISIN. */
export function isDistributionLookupCode(code: string): boolean {
  const c = normaliseCode(code)
  return /^[A-Z0-9]{3,6}$/.test(c) && /[A-Z]/.test(c)
}

/**
 * Turn a distribution history into a monthly pattern, using payments in the
 * 12 months before `asOf` (falling back to the last 24 months, halved, if
 * the last year is empty). Payment date is used where given, otherwise the
 * ex-date plus a month. Returns null with no usable history.
 */
export function paymentPattern(history: EodhdDividend[], asOf: Date = new Date()): PaymentPattern | null {
  const paid = history
    .map((d) => {
      let when = d.paymentDate ? new Date(d.paymentDate) : null
      if (!when || Number.isNaN(when.getTime())) {
        const ex = new Date(d.date)
        if (Number.isNaN(ex.getTime())) return null
        when = new Date(ex.getTime() + 30 * 86_400_000)
      }
      return { when, value: d.value }
    })
    .filter((d): d is { when: Date; value: number } => !!d && d.value > 0 && d.when <= asOf)
  const window = (months: number) => {
    const from = new Date(asOf)
    from.setMonth(from.getMonth() - months)
    return paid.filter((d) => d.when > from)
  }
  let recent = window(12)
  if (recent.length === 0) recent = window(24)
  if (recent.length === 0) return null
  const weights = new Array(12).fill(0)
  for (const d of recent) weights[d.when.getMonth()] += d.value
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return null
  return weights.map((w) => w / total)
}

/** Spread each holding's annual income across the months it pays in. */
export function buildIncomeCalendar(holdings: CalendarHolding[], patterns: Record<string, PaymentPattern>): IncomeCalendar {
  const known = new Array(12).fill(0)
  const estimated = new Array(12).fill(0)
  const estimatedCodes: string[] = []
  let total = 0
  let knownTotal = 0
  for (const h of holdings) {
    if (!(h.income > 0)) continue
    total += h.income
    const pattern = patterns[normaliseCode(h.code)]
    if (pattern) {
      pattern.forEach((w, m) => (known[m] += h.income * w))
      knownTotal += h.income
    } else if (h.holdingType === 'cash') {
      for (let m = 0; m < 12; m++) known[m] += h.income / 12
      knownTotal += h.income
    } else {
      for (const m of QUARTERLY) estimated[m] += h.income / 4
      estimatedCodes.push(h.code)
    }
  }
  return {
    months: FY_ORDER.map((m) => ({
      month: m,
      label: MONTH_LABELS[m],
      known: round(known[m]),
      estimated: round(estimated[m]),
      total: round(known[m] + estimated[m]),
    })),
    totalIncome: round(total),
    knownTimingPct: total > 0 ? Math.round((knownTotal / total) * 100) : 0,
    estimatedCodes,
  }
}

/**
 * Payment patterns for the given codes from EODHD distribution history.
 * Codes EODHD doesn't know (or any failure) are simply left out - the
 * calendar then assumes quarterly timing for them. Server-side only.
 */
export async function fetchPaymentPatterns(codes: string[], asOf: Date = new Date()): Promise<Record<string, PaymentPattern>> {
  if (!isEodhdConfigured()) return {}
  const wanted = Array.from(new Set(codes.map(normaliseCode))).filter(isDistributionLookupCode).slice(0, 60)
  const from = new Date(asOf)
  from.setMonth(from.getMonth() - 25)
  const fromStr = from.toISOString().slice(0, 10)
  const out: Record<string, PaymentPattern> = {}
  await Promise.all(
    wanted.map(async (code) => {
      try {
        const pattern = paymentPattern(await getDividends(toEodhdTicker(code), fromStr), asOf)
        if (pattern) out[code] = pattern
      } catch {
        // No history for this code - quarterly timing is assumed instead.
      }
    }),
  )
  return out
}

function round(v: number): number {
  return Math.round(v)
}
