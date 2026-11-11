import type { ClientAdvice } from '../../engines/client-advice'
import type { RiskProfile } from '../../engines/model-portfolios'
import { isIsin } from '../../engines/holding-triage'

/**
 * Client-facing analytics for the proposal: expected return and risk of the
 * portfolio, the Standard Risk Measure, what a typical / severe year looks
 * like in dollars, fees, and 10-year capital and income scenarios.
 *
 * CAPITAL MARKET ASSUMPTIONS below are illustrative long-term (10-year)
 * nominal, pre-fee figures. They are NOT a published Ord Minnett house view -
 * replace them with the firm's official assumptions when available. Every
 * figure that depends on them is labelled as an estimate in the document.
 */
export const CMA_AS_AT = 'November 2026'

/**
 * ret is the total return before franking; franking is the extra benefit of
 * franking credits for an Australian investor (received in full).
 *
 * A franking credit is the company tax already paid: on a fully franked
 * dividend it is 30/70 = 42.9% of the cash dividend (a $1.00 dividend
 * grosses up to $1.43). As a return, the benefit is therefore
 *   dividend yield x franked % x 30/70.
 * In a proposal the figure is worked out from the actual holdings' forecast
 * yields and franking levels (ClientAdvice.frankingBenefitByClass). The
 * default below is used only where no holding in the class has a known
 * yield: an Australian share market yield of ~3.6%, ~80% franked, gives
 * 3.6 x 0.8 x 0.4286 = ~1.2 percentage points.
 */
export const CAPITAL_MARKET_ASSUMPTIONS: Record<
  string,
  { ret: number; vol: number; group: 'growth' | 'alts' | 'defensive' | 'cash'; franking?: number }
> = {
  'Australian Equities': { ret: 7.0, vol: 16.0, group: 'growth', franking: 1.2 },
  // Published 10-year forecasts ~5.6-6.4% (Vanguard, AMP, Monash); 7.0% sits above the middle, reflecting
  // a quality, actively selected global allocation, while remaining defensible.
  'International Equities': { ret: 7.0, vol: 15.0, group: 'growth' },
  'Listed Property / Infrastructure': { ret: 7.0, vol: 14.0, group: 'growth' },
  Alternatives: { ret: 6.5, vol: 9.0, group: 'alts' },
  'Australian Fixed Interest': { ret: 4.8, vol: 4.5, group: 'defensive' },
  'Global Fixed Interest': { ret: 4.5, vol: 4.5, group: 'defensive' },
  Cash: { ret: 3.5, vol: 0.7, group: 'cash' },
}

/** Simplified correlations between asset-class groups. */
function correlation(a: string, b: string): number {
  if (a === b) return 1
  const ga = CAPITAL_MARKET_ASSUMPTIONS[a]?.group
  const gb = CAPITAL_MARKET_ASSUMPTIONS[b]?.group
  if (!ga || !gb) return 0
  if (ga === 'cash' || gb === 'cash') return 0
  if (ga === 'growth' && gb === 'growth') return 0.75
  if (ga === 'defensive' && gb === 'defensive') return 0.6
  if ((ga === 'alts' && gb === 'growth') || (ga === 'growth' && gb === 'alts')) return 0.5
  if (ga === 'alts' || gb === 'alts') return 0.2
  return 0.1 // growth vs defensive
}

export const CPI_ASSUMPTION = 2.5

export type PortfolioRiskStats = {
  /** Expected return before fees, excluding franking credits. Risk measures are based on this. */
  expectedReturn: number
  /** Annual benefit of franking credits, percentage points. */
  frankingBenefit: number
  /** Expected return before fees, including franking credits - the headline figure. */
  expectedReturnInclFranking: number
  volatility: number
  negativeYearsPer20: number
  srm: { band: number; label: string }
  /** Range covering roughly two years in three. */
  typicalLow: number
  typicalHigh: number
  /** A 1-in-20 bad year (5th percentile). */
  severeYear: number
}

const SRM_BANDS: { max: number; band: number; label: string }[] = [
  { max: 0.5, band: 1, label: 'Very low' },
  { max: 1, band: 2, label: 'Low' },
  { max: 2, band: 3, label: 'Low to medium' },
  { max: 3, band: 4, label: 'Medium' },
  { max: 4, band: 5, label: 'Medium to high' },
  { max: 6, band: 6, label: 'High' },
  { max: Infinity, band: 7, label: 'Very high' },
]

/** Standard normal CDF (Abramowitz-Stegun). */
function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp((-x * x) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - p : p
}

/**
 * weights: asset class -> % of portfolio. frankingByClass: the franking
 * benefit (percentage points a year) worked out from the actual holdings;
 * classes not in it fall back to the default assumption.
 */
export function portfolioRiskStats(
  weights: Record<string, number>,
  frankingByClass?: Record<string, number>,
): PortfolioRiskStats | null {
  const classes = Object.keys(weights).filter((k) => weights[k] > 0 && CAPITAL_MARKET_ASSUMPTIONS[k])
  const total = classes.reduce((s, k) => s + weights[k], 0)
  if (total <= 0) return null
  const w = (k: string) => weights[k] / total
  let ret = 0
  let franking = 0
  for (const k of classes) {
    ret += w(k) * CAPITAL_MARKET_ASSUMPTIONS[k].ret
    franking += w(k) * (frankingByClass?.[k] ?? CAPITAL_MARKET_ASSUMPTIONS[k].franking ?? 0)
  }
  let variance = 0
  for (const a of classes)
    for (const b of classes)
      variance +=
        w(a) * w(b) * CAPITAL_MARKET_ASSUMPTIONS[a].vol * CAPITAL_MARKET_ASSUMPTIONS[b].vol * correlation(a, b)
  const vol = Math.sqrt(variance)
  const negativeYearsPer20 = vol > 0 ? 20 * normCdf(-ret / vol) : 0
  const srm = SRM_BANDS.find((b) => negativeYearsPer20 < b.max) ?? SRM_BANDS[SRM_BANDS.length - 1]
  return {
    expectedReturn: round1(ret),
    frankingBenefit: round2(franking),
    expectedReturnInclFranking: round1(ret + franking),
    volatility: round1(vol),
    negativeYearsPer20: round1(negativeYearsPer20),
    srm: { band: srm.band, label: srm.label },
    typicalLow: round1(ret - vol),
    typicalHigh: round1(ret + vol),
    severeYear: round1(ret - 1.645 * vol),
  }
}

/** Plain-English guide to each risk profile - what it is and what to expect. */
export const PROFILE_GUIDE: Record<RiskProfile, { timeframe: string; investor: string; expect: string }> = {
  Conservative: {
    timeframe: '2 years or more',
    investor:
      'You place a high value on stability and reliable income, and are prepared to accept lower long-term returns to limit how much your portfolio moves in value.',
    expect:
      'Most of the portfolio is in cash and fixed interest. Values should move modestly from year to year, though falls can still occur, particularly when interest rates rise sharply.',
  },
  Moderate: {
    timeframe: '3 years or more',
    investor:
      'You want your wealth to grow ahead of inflation, but stability still matters to you. You are comfortable with some short-term movement in exchange for better long-term returns.',
    expect:
      'A blend that leans defensive, with a meaningful share in shares and listed real assets. Expect occasional negative years, generally of a moderate size.',
  },
  Balanced: {
    timeframe: '5 years or more',
    investor:
      'You seek long-term growth and reliable income in roughly equal measure, and understand that the value of your portfolio will rise and fall along the way.',
    expect:
      'Growth assets such as shares and listed property drive returns, while fixed interest and cash cushion the falls. Negative years will occur, typically recovered over a full market cycle.',
  },
  Growth: {
    timeframe: '7 years or more',
    investor:
      'Your priority is building wealth over the long term. You are comfortable with noticeable falls in value along the way, knowing they are part of earning higher returns.',
    expect:
      'Most of the portfolio is in Australian and international shares and real assets. Returns over time should be higher, but so will the swings, including falls of 15% or more in a severe year.',
  },
  'High Growth': {
    timeframe: '9 years or more',
    investor:
      'You have a long investment horizon and want the highest long-term growth, accepting large and sometimes prolonged falls in value along the way.',
    expect:
      'Almost entirely growth assets. This offers the highest expected long-term return, but also the largest swings, so you need to be able to stay invested through difficult markets.',
  },
}

/** Ongoing PARS advisory fee: tiered, progressive, plus GST. */
export const ADVISORY_FEE_TIERS = [
  { upTo: 5_000_000, rate: 1.0 },
  { upTo: 10_000_000, rate: 0.75 },
  { upTo: Infinity, rate: 0.5 },
]
export const GST_RATE = 0.1
export const BROKERAGE_CAP = 25
export const BOND_TRANSACTION_RATE = 0.25

export type FeeEstimate = {
  tiers: { label: string; amount: number; fee: number }[]
  feeExGst: number
  gst: number
  feeIncGst: number
  effectiveRatePct: number
  listedTrades: number
  brokerageEstimate: number
  bondTradeValue: number
  bondCostEstimate: number
  totalTransactionCosts: number
}

export function estimateFees(advice: ClientAdvice): FeeEstimate | null {
  const total = advice.totalAfter
  if (!total || total <= 0) return null
  const tiers: FeeEstimate['tiers'] = []
  let remaining = total
  let lower = 0
  let feeExGst = 0
  for (const tier of ADVISORY_FEE_TIERS) {
    if (remaining <= 0) break
    const band = Math.min(remaining, tier.upTo - lower)
    const fee = (band * tier.rate) / 100
    tiers.push({
      label:
        tier.upTo === Infinity
          ? `Above ${money(lower)} at ${tier.rate.toFixed(2)}%`
          : `${lower === 0 ? 'First' : 'Next'} ${money(tier.upTo - lower)} at ${tier.rate.toFixed(2)}%`,
      amount: band,
      fee,
    })
    feeExGst += fee
    remaining -= band
    lower = tier.upTo
  }
  const gst = feeExGst * GST_RATE
  const bondTrades = advice.trades.filter((t) => isBondCode(t.code, t.name))
  const listedTrades = advice.trades.filter((t) => !isBondCode(t.code, t.name) && t.units !== null).length
  const bondTradeValue = bondTrades.reduce((s, t) => s + Math.abs(t.value ?? 0), 0)
  const brokerageEstimate = listedTrades * BROKERAGE_CAP
  const bondCostEstimate = (bondTradeValue * BOND_TRANSACTION_RATE) / 100
  return {
    tiers,
    feeExGst,
    gst,
    feeIncGst: feeExGst + gst,
    effectiveRatePct: ((feeExGst + gst) / total) * 100,
    listedTrades,
    brokerageEstimate,
    bondTradeValue,
    bondCostEstimate,
    totalTransactionCosts: brokerageEstimate + bondCostEstimate,
  }
}

function isBondCode(code: string, name: string): boolean {
  return isIsin(code) || (/%/.test(code + ' ' + name) && /\d{2}/.test(code + name))
}

export type Scenario = { key: 'low' | 'base' | 'high'; label: string; returnPct: number; values: number[]; income: number[] }

/**
 * 10-year capital and income scenarios, after the advisory fee. Income is
 * the portfolio's running yield applied to the value at the start of each
 * year (so it grows as capital grows); capital compounds at the scenario's
 * total return less fees, assuming income is reinvested and no withdrawals.
 */
export function projectScenarios(input: {
  startValue: number
  expectedReturn: number
  feePct: number
  yieldPct: number
  years?: number
}): Scenario[] {
  const years = input.years ?? 10
  const defs: { key: Scenario['key']; label: string; delta: number }[] = [
    { key: 'low', label: 'Lower returns', delta: -2 },
    { key: 'base', label: 'Expected', delta: 0 },
    { key: 'high', label: 'Higher returns', delta: 2 },
  ]
  return defs.map((d) => {
    const net = (input.expectedReturn + d.delta - input.feePct) / 100
    // Income tracks the scenario too: lower returns usually come with lower distributions.
    const yieldPct = Math.max(0, input.yieldPct + d.delta * 0.25)
    const values = [input.startValue]
    const income: number[] = []
    for (let y = 1; y <= years; y++) {
      const prev = values[y - 1]
      income.push((prev * yieldPct) / 100)
      values.push(prev * (1 + net))
    }
    return { key: d.key, label: d.label, returnPct: round1(input.expectedReturn + d.delta - input.feePct), values, income }
  })
}

/** Weighted asset-class split of the portfolio after the advice is implemented. */
export function afterAdviceWeights(advice: ClientAdvice): Record<string, number> {
  const out: Record<string, number> = {}
  if (advice.resultingHoldings.length > 0) {
    for (const h of advice.resultingHoldings) out[h.assetClass] = (out[h.assetClass] ?? 0) + h.weight
  } else {
    for (const r of advice.assetClasses) out[r.assetClass] = r.modelWeight
  }
  return out
}

export function currentWeights(advice: ClientAdvice): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of advice.assetClasses) if (r.clientWeight > 0) out[r.assetClass] = r.clientWeight
  return out
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

function money(v: number): string {
  return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}m` : `$${Math.round(v).toLocaleString('en-AU')}`
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
