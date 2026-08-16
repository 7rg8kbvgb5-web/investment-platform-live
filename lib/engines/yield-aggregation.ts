import type { ModelPortfolio } from './model-portfolios'

export type HoldingYieldRow = {
  code: string
  name: string
  assetClass: string
  /** % of the whole portfolio this holding represents. */
  weight: number
  yieldPct: number | null
  /** Annual income in dollars - null unless both a portfolio value and this holding's yield are known. */
  incomeValue: number | null
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
      const incomeValue =
        portfolioValue !== null && yieldPct !== null
          ? round2((holding.weight / 100) * portfolioValue * (yieldPct / 100))
          : null

      holdings.push({
        code: holding.code,
        name: holding.name,
        assetClass: assetClass.name,
        weight: holding.weight,
        yieldPct,
        incomeValue,
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

    return {
      assetClass: assetClass.name,
      weight: round2(classWeight),
      blendedYieldPct,
      incomeValue,
      yieldCoveragePct,
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

  return {
    holdings,
    assetClasses,
    totalBlendedYieldPct,
    totalIncomeValue,
    totalYieldCoveragePct,
    portfolioValue,
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
