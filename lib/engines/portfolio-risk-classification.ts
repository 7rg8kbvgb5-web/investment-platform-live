import { modelPortfolios, type RiskProfile } from './model-portfolios'

export type RiskClassificationResult = {
  clientGrowthWeight: number
  clientDefensiveWeight: number
  nearestRiskProfile: RiskProfile
  nearestModelGrowthWeight: number
  growthWeightGap: number
  /** All five profiles ranked by closeness, for the adviser to see the full picture rather than just the top pick. */
  ranked: Array<{
    riskProfile: RiskProfile
    modelGrowthWeight: number
    distance: number
  }>
}

/**
 * Classifies a client's portfolio against the five house model risk
 * profiles using actual growth/defensive weights from model-portfolios.ts
 * (the same data driving the rest of the platform) — nothing here is an
 * invented threshold.
 *
 * Method: nearest match by absolute distance between the client's mapped
 * growth weight and each model's growth weight. This is a starting point
 * for adviser judgement, not a substitute for it — a client's actual risk
 * profile also depends on stated tolerance, timeframe and objectives,
 * which this function has no visibility into.
 */
export function classifyPortfolioRiskProfile(
  clientGrowthWeight: number,
  clientDefensiveWeight: number,
): RiskClassificationResult {
  const ranked = modelPortfolios
    .map((portfolio) => ({
      riskProfile: portfolio.riskProfile,
      modelGrowthWeight: portfolio.growthWeight,
      distance: Math.abs(portfolio.growthWeight - clientGrowthWeight),
    }))
    .sort((a, b) => a.distance - b.distance)

  const nearest = ranked[0]

  return {
    clientGrowthWeight: round2(clientGrowthWeight),
    clientDefensiveWeight: round2(clientDefensiveWeight),
    nearestRiskProfile: nearest.riskProfile,
    nearestModelGrowthWeight: nearest.modelGrowthWeight,
    growthWeightGap: round2(clientGrowthWeight - nearest.modelGrowthWeight),
    ranked,
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
