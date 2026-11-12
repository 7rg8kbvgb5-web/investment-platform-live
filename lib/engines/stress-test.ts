// Historical stress test: what three real market shocks would have done to
// a portfolio, given its asset-class mix. Each shock is the approximate
// return of a broad index for each asset class over the period (rounded,
// including income, in Australian dollars). Applied to the client's
// current and recommended allocations so the proposal can show both.
//
// These are illustrations of past events, not forecasts. A real portfolio
// holds specific securities, so its result would differ from the index.
// CHECK BEFORE CHANGING: the figures below are rounded index-level
// approximations - review them against the house data provider if they
// are ever used beyond the proposal's illustrative page.

export type StressScenario = {
  key: 'gfc' | 'covid' | 'rates2022'
  name: string
  period: string
  /** One plain-English line on what happened. */
  summary: string
  /** Approximate return (%) for each asset class over the period. */
  returns: Record<string, number>
}

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    key: 'gfc',
    name: 'Global Financial Crisis',
    period: 'Nov 2007 – Feb 2009',
    summary: 'A banking crisis triggered the deepest share market fall in decades; bonds and cash rose as interest rates were cut.',
    returns: {
      'Australian Equities': -50,
      'International Equities': -40,
      'Listed Property / Infrastructure': -55,
      Alternatives: -15,
      'Australian Fixed Interest': 10,
      'Global Fixed Interest': 8,
      Cash: 7,
    },
  },
  {
    key: 'covid',
    name: 'COVID-19 crash',
    period: 'Feb – Mar 2020',
    summary: 'Share markets fell sharply in five weeks as economies shut down, then recovered within the year.',
    returns: {
      'Australian Equities': -36,
      'International Equities': -22,
      'Listed Property / Infrastructure': -40,
      Alternatives: -8,
      'Australian Fixed Interest': -1,
      'Global Fixed Interest': -2,
      Cash: 0,
    },
  },
  {
    key: 'rates2022',
    name: 'Interest rate shock',
    period: 'Calendar year 2022',
    summary: 'Rapid rate rises to fight inflation meant shares and bonds fell together - the year diversification was tested.',
    returns: {
      'Australian Equities': -1,
      'International Equities': -12,
      'Listed Property / Infrastructure': -15,
      Alternatives: -2,
      'Australian Fixed Interest': -10,
      'Global Fixed Interest': -11,
      Cash: 1,
    },
  },
]

export const STRESS_INDEX_NOTE =
  'Approximate, rounded index returns including income, in Australian dollars: S&P/ASX 200 Accumulation (Australian equities), MSCI World ex Australia unhedged (international equities), a blend of S&P/ASX 200 A-REIT and global listed infrastructure (listed property / infrastructure), broad hedge fund indices (alternatives), Bloomberg AusBond Composite (Australian fixed interest), Bloomberg Global Aggregate hedged to AUD (global fixed interest) and the cash rate (cash).'

export type StressResult = {
  key: StressScenario['key']
  name: string
  period: string
  summary: string
  /** Portfolio return (%) over the period, from its asset-class weights. */
  returnPct: number
  /** Change in dollars on the given value, null without a value. */
  change: number | null
}

/**
 * Apply each scenario to a portfolio's asset-class weights (% of the
 * portfolio, any total). Weights are normalised to 100 so an unclassified
 * remainder doesn't count as a 0% return. Unknown asset classes are
 * treated as cash.
 */
export function runStressTest(weights: Record<string, number>, value: number | null): StressResult[] {
  const total = Object.values(weights).reduce((sum, w) => sum + (w > 0 ? w : 0), 0)
  return STRESS_SCENARIOS.map((sc) => {
    let r = 0
    if (total > 0) {
      for (const [ac, w] of Object.entries(weights)) {
        if (w <= 0) continue
        r += (w / total) * (sc.returns[ac] ?? sc.returns.Cash ?? 0)
      }
    }
    const returnPct = Math.round(r * 10) / 10
    return {
      key: sc.key,
      name: sc.name,
      period: sc.period,
      summary: sc.summary,
      returnPct,
      change: value !== null && value > 0 ? Math.round((value * returnPct) / 100) : null,
    }
  })
}
