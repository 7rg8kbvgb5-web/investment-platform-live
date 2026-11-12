// Historical stress test: what three real market shocks would have done to
// a portfolio, given its asset-class mix. Each shock is the widely published
// consensus return of the standard benchmark for each asset class over the
// period (rounded to whole percentages, including income, in Australian
// dollars unless noted). Applied to the client's current and recommended
// allocations so the proposal can show both.
//
// These are illustrations of past events, not forecasts. A real portfolio
// holds specific securities, so its result would differ from the index.
//
// Sources (reviewed Nov 2026, adviser-approved as consensus figures):
//  GFC - S&P/ASX 200 total return fell ~50% peak to trough (price index -54%);
//    S&P/ASX 300 A-REIT fell ~76-80%, global listed infrastructure far less,
//    so the 50/50 blend is ~-55%; AusBond Composite +15% and Global Aggregate
//    (AUD hedged) +9% in calendar 2008; HFRI Fund Weighted Composite ~-20%
//    peak to trough (USD); MSCI World ex Australia ~-40% in AUD, the falling
//    dollar cushioning a ~-55% local-currency fall.
//  COVID - S&P/ASX 200 fell 37% (20 Feb - 23 Mar 2020); HFRI FWC ~-11%
//    over Feb-Mar 2020; S&P 500 -34% in USD, ~-22% for MSCI World ex
//    Australia in AUD after the dollar's fall.
//  2022 - calendar-year index returns: S&P/ASX 200 TR -1.1%, MSCI World ex
//    Australia NR AUD ~-12.5%, S&P/ASX 200 A-REIT -20%, AusBond Composite
//    -9.7%, Global Aggregate (hedged) ~-12%, HFRI FWC -4.2%, cash +1.3%.

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
    period: 'Nov 2007 – Mar 2009',
    summary: 'A banking crisis triggered the deepest share market fall in decades; bonds and cash rose as interest rates were cut.',
    returns: {
      'Australian Equities': -50,
      'International Equities': -40,
      'Listed Property / Infrastructure': -55,
      Alternatives: -20,
      'Australian Fixed Interest': 15,
      'Global Fixed Interest': 9,
      Cash: 7,
    },
  },
  {
    key: 'covid',
    name: 'COVID-19 crash',
    period: '20 Feb – 23 Mar 2020',
    summary: 'Share markets fell sharply in five weeks as economies shut down, then recovered within the year.',
    returns: {
      'Australian Equities': -37,
      'International Equities': -22,
      'Listed Property / Infrastructure': -40,
      Alternatives: -11,
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
      Alternatives: -4,
      'Australian Fixed Interest': -10,
      'Global Fixed Interest': -12,
      Cash: 1,
    },
  },
]

export const STRESS_INDEX_NOTE =
  'Widely published benchmark returns for each period, rounded, including income and in Australian dollars unless noted: S&P/ASX 200 Accumulation (Australian equities), MSCI World ex Australia unhedged (international equities), a blend of S&P/ASX 200 A-REIT and global listed infrastructure (listed property / infrastructure), HFRI Fund Weighted Composite in US dollars (alternatives), Bloomberg AusBond Composite (Australian fixed interest), Bloomberg Global Aggregate hedged to AUD (global fixed interest) and bank bills (cash). Share market figures are peak-to-trough falls; past performance is not a reliable indicator of future performance.'

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
