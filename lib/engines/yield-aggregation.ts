import type { ModelPortfolio } from './model-portfolios'

/** Corporate tax rate franking credits are calculated at (standard rate; base-rate entities use 25%). */
export const FRANKING_TAX_RATE = 0.3

/** Franking credit attached to a cash distribution with the given franking level (0-100). */
export function frankingCredit(cashIncome: number, frankingPct: number): number {
  return cashIncome * (frankingPct / 100) * (FRANKING_TAX_RATE / (1 - FRANKING_TAX_RATE))
}

export type HoldingYieldRow = {
  code: string
  name: string
  assetClass: string
  /** % of the whole portfolio this holding represents. */
  weight: number
  yieldPct: number | null
  /** Expected franking level, 0-100. Null if not stated. */
  frankingPct: number | null
  /** Yield including franking credits. Equal to yieldPct when franking is 0 or unknown. */
  grossedUpYieldPct: number | null
  /** Annual income in dollars - null unless both a portfolio value and this holding's yield are known. */
  incomeValue: number | null
  /** Annual franking credits in dollars - null unless income and franking are known. */
  frankingCreditValue: number | null
}

export type AssetClassYieldRow = {
  assetClass: string
  /** % of the whole portfolio this asset class represents. */
  weight: number
  /** Weight-weighted average yield across holdings in this class that have a stated yield - null if none do. */
  blendedYieldPct: number | null
  /** Annual income in dollars from holdings in this class with a stated yield - null unless a portfolio value is known. */
  incomeValue: number | null
  /** Share of this class's weight that has a stated yield (0-100) - a coverage indicator, not a return figure. */
  yieldCoveragePct: number
  /** Blended yield including franking credits. */
  blendedGrossedUpYieldPct: number | null
  /** Annual franking credits in dollars from this class. */
  frankingCreditValue: number | null
}

export type PortfolioYieldSummary = {
  holdings: HoldingYieldRow[]
  assetClasses: AssetClassYieldRow[]
  /** Weight-weighted average yield across every holding with a stated yield - null if none do. */
  totalBlendedYieldPct: number | null
  /** Total annual income in dollars from holdings with a stated yield - null unless a portfolio value is known. */
  totalIncomeValue: number | null
  /** Share of the whole portfolio's weight that has a stated yield (0-100). */
  totalYieldCoveragePct: number
  /** Blended yield including franking credits, across holdings with a stated yield. */
  totalGrossedUpYieldPct: number | null
  /** Total annual franking credits in dollars. */
  totalFrankingCreditValue: number | null
  /** Cash income plus franking credits. */
  totalGrossedUpIncomeValue: number | null
  /** Weighted average franking level of the income stream (0-100), across holdings with a stated yield. */
  averageFrankingPct: number | null
  /** Share of yield-bearing weight that has a stated franking level (0-100). */
  frankingCoveragePct: number
  portfolioValue: number | null
}

/**
 * Rolls a model portfolio's per-holding yields up into asset-class and
 * whole-portfolio aggregate income figures. Holdings without a stated
 * yield are excluded from the blended % averages (not treated as 0%) but
 * do lower the coverage figures, so an adviser can see how much of the
 * number rests on real data vs gaps still to fill in.
 *
 * `portfolioValue` is optional - without it, only the %-based blended
 * yields are returned (useful on the Risk Profile tab, which isn't tied
 * to any one client's dollars). With it (e.g. the client's total
 * portfolio value in Construction), dollar income figures are added too.
 */
export function computePortfolioYield(
  model: ModelPortfolio,
  portfolioValue: number | null = null,
): PortfolioYieldSummary {
  const holdings: HoldingYieldRow[] = []

  for (const assetClass of model.assetClasses) {
    for (const holding of assetClass.holdings) {
      const yieldPct = typeof holding.yield === 'number' ? holding.yield : null
      const frankingPct = typeof holding.frankingPct === 'number' ? holding.frankingPct : null
      const incomeValue =
        portfolioValue !== null && yieldPct !== null
          ? round2((holding.weight / 100) * portfolioValue * (yieldPct / 100))
          : null
      const grossedUpYieldPct =
        yieldPct !== null ? round2(yieldPct + frankingCredit(yieldPct, frankingPct ?? 0)) : null
      const frankingCreditValue =
        incomeValue !== null && frankingPct !== null ? round2(frankingCredit(incomeValue, frankingPct)) : null

      holdings.push({
        code: holding.code,
        name: holding.name,
        assetClass: assetClass.name,
        weight: holding.weight,
        yieldPct,
        frankingPct,
        grossedUpYieldPct,
        incomeValue,
        frankingCreditValue,
      })
    }
  }

  const assetClasses: AssetClassYieldRow[] = model.assetClasses.map((assetClass) => {
    const classHoldings = holdings.filter((h) => h.assetClass === assetClass.name)
    const knownYieldHoldings = classHoldings.filter((h) => h.yieldPct !== null)

    const knownWeightSum = knownYieldHoldings.reduce((sum, h) => sum + h.weight, 0)
    const blendedYieldPct =
      knownWeightSum > 0
        ? round2(
            knownYieldHoldings.reduce((sum, h) => sum + h.weight * (h.yieldPct as number), 0) /
              knownWeightSum,
          )
        : null

    const incomeValue =
      portfolioValue !== null && knownYieldHoldings.length > 0
        ? round2(knownYieldHoldings.reduce((sum, h) => sum + (h.incomeValue ?? 0), 0))
        : null

    const classWeight = classHoldings.reduce((sum, h) => sum + h.weight, 0)
    const yieldCoveragePct = classWeight > 0 ? round2((knownWeightSum / classWeight) * 100) : 0

    const blendedGrossedUpYieldPct =
      knownWeightSum > 0
        ? round2(
            knownYieldHoldings.reduce((sum, h) => sum + h.weight * (h.grossedUpYieldPct as number), 0) /
              knownWeightSum,
          )
        : null
    const frankingCreditValue =
      portfolioValue !== null && knownYieldHoldings.length > 0
        ? round2(knownYieldHoldings.reduce((sum, h) => sum + (h.frankingCreditValue ?? 0), 0))
        : null

    return {
      assetClass: assetClass.name,
      weight: round2(classWeight),
      blendedYieldPct,
      incomeValue,
      yieldCoveragePct,
      blendedGrossedUpYieldPct,
      frankingCreditValue,
    }
  })

  const knownYieldHoldings = holdings.filter((h) => h.yieldPct !== null)
  const totalKnownWeight = knownYieldHoldings.reduce((sum, h) => sum + h.weight, 0)
  const totalWeight = holdings.reduce((sum, h) => sum + h.weight, 0)

  const totalBlendedYieldPct =
    totalKnownWeight > 0
      ? round2(
          knownYieldHoldings.reduce((sum, h) => sum + h.weight * (h.yieldPct as number), 0) /
            totalKnownWeight,
        )
      : null

  const totalIncomeValue =
    portfolioValue !== null && knownYieldHoldings.length > 0
      ? round2(knownYieldHoldings.reduce((sum, h) => sum + (h.incomeValue ?? 0), 0))
      : null

  const totalYieldCoveragePct = totalWeight > 0 ? round2((totalKnownWeight / totalWeight) * 100) : 0

  const totalGrossedUpYieldPct =
    totalKnownWeight > 0
      ? round2(
          knownYieldHoldings.reduce((sum, h) => sum + h.weight * (h.grossedUpYieldPct as number), 0) /
            totalKnownWeight,
        )
      : null
  const totalFrankingCreditValue =
    portfolioValue !== null && knownYieldHoldings.length > 0
      ? round2(knownYieldHoldings.reduce((sum, h) => sum + (h.frankingCreditValue ?? 0), 0))
      : null
  const totalGrossedUpIncomeValue =
    totalIncomeValue !== null ? round2(totalIncomeValue + (totalFrankingCreditValue ?? 0)) : null

  // Average franking of the income stream: income-weighted (weight x yield).
  const frankedHoldings = knownYieldHoldings.filter((h) => h.frankingPct !== null)
  const frankedIncomeWeight = frankedHoldings.reduce((sum, h) => sum + h.weight * (h.yieldPct as number), 0)
  const averageFrankingPct =
    frankedIncomeWeight > 0
      ? round2(
          frankedHoldings.reduce((sum, h) => sum + h.weight * (h.yieldPct as number) * (h.frankingPct as number), 0) /
            frankedIncomeWeight,
        )
      : null
  const frankingCoveragePct =
    totalKnownWeight > 0 ? round2((frankedHoldings.reduce((sum, h) => sum + h.weight, 0) / totalKnownWeight) * 100) : 0

  return {
    holdings,
    assetClasses,
    totalBlendedYieldPct,
    totalIncomeValue,
    totalYieldCoveragePct,
    totalGrossedUpYieldPct,
    totalFrankingCreditValue,
    totalGrossedUpIncomeValue,
    averageFrankingPct,
    frankingCoveragePct,
    portfolioValue,
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
