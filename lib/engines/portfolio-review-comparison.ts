import type { ModelPortfolio } from './model-portfolios'
import type { MappedHolding } from './client-holdings-mapping'
import { normaliseCode } from './security-universe'

export type AssetClassComparisonRow = {
  assetClass: string
  type: 'Growth' | 'Defensive'
  clientWeight: number
  modelWeight: number
  difference: number
  status: 'in-line' | 'overweight' | 'underweight'
}

export type HoldingRecommendation = {
  code: string
  name: string
  assetClass: string
  currentWeight: number
  targetWeight: number
  changeWeight: number
  action: 'buy' | 'increase' | 'reduce' | 'sell' | 'hold'
  rationale: string
}

export type PortfolioReviewComparison = {
  assetClassComparison: AssetClassComparisonRow[]
  holdingRecommendations: HoldingRecommendation[]
  unclassifiedHoldings: MappedHolding[]
}

/** Within this band either side of the model weight, no change is recommended. */
const NEUTRAL_BAND_PP = 1

export function compareClientPortfolioToModel(
  mappedHoldings: MappedHolding[],
  model: ModelPortfolio,
): PortfolioReviewComparison {
  // Asset class level: client's actual exposure per asset class vs the model's target.
  const clientAssetClassWeights = new Map<string, number>()
  for (const holding of mappedHoldings) {
    if (!holding.mapped) continue
    clientAssetClassWeights.set(
      holding.assetClass,
      (clientAssetClassWeights.get(holding.assetClass) ?? 0) + holding.weight,
    )
  }

  const assetClassComparison: AssetClassComparisonRow[] = model.assetClasses.map(
    (assetClass) => {
      const clientWeight = round2(
        clientAssetClassWeights.get(assetClass.name) ?? 0,
      )
      const difference = round2(clientWeight - assetClass.targetWeight)

      return {
        assetClass: assetClass.name,
        type: assetClass.type,
        clientWeight,
        modelWeight: assetClass.targetWeight,
        difference,
        status:
          Math.abs(difference) <= NEUTRAL_BAND_PP
            ? 'in-line'
            : difference > 0
              ? 'overweight'
              : 'underweight',
      }
    },
  )

  // Holding level: flatten the model's target holdings and line them up
  // against what the client actually holds (by code).
  const clientHoldingWeights = new Map<string, number>()
  for (const holding of mappedHoldings) {
    if (!holding.mapped) continue
    const code = normaliseCode(holding.code)
    clientHoldingWeights.set(
      code,
      (clientHoldingWeights.get(code) ?? 0) + holding.weight,
    )
  }

  const modelHoldingCodes = new Set<string>()
  const holdingRecommendations: HoldingRecommendation[] = []

  for (const assetClass of model.assetClasses) {
    for (const modelHolding of assetClass.holdings) {
      const normalisedModelCode = normaliseCode(modelHolding.code)
      modelHoldingCodes.add(normalisedModelCode)

      const currentWeight = round2(
        clientHoldingWeights.get(normalisedModelCode) ?? 0,
      )
      const targetWeight = round2(modelHolding.weight)
      const changeWeight = round2(targetWeight - currentWeight)

      let action: HoldingRecommendation['action'] = 'hold'
      let rationale = modelHolding.rationale

      if (currentWeight === 0 && targetWeight > 0) {
        action = 'buy'
        rationale = `Not currently held. ${modelHolding.rationale}`
      } else if (Math.abs(changeWeight) <= NEUTRAL_BAND_PP / 2) {
        action = 'hold'
        rationale = 'Broadly in line with the model weight — no change required.'
      } else if (changeWeight > 0) {
        action = 'increase'
        rationale = `Below model weight by ${Math.abs(changeWeight)}pp. ${modelHolding.rationale}`
      } else {
        action = 'reduce'
        rationale = `Above model weight by ${Math.abs(changeWeight)}pp.`
      }

      holdingRecommendations.push({
        code: modelHolding.code,
        name: modelHolding.name,
        assetClass: assetClass.name,
        currentWeight,
        targetWeight,
        changeWeight,
        action,
        rationale,
      })
    }
  }

  // Client holdings that are mapped (known securities/asset classes) but
  // aren't part of this model portfolio at all — genuine "review as an
  // exception" candidates, not holdings we have no data on.
  for (const holding of mappedHoldings) {
    if (!holding.mapped) continue
    const code = normaliseCode(holding.code)
    if (modelHoldingCodes.has(code)) continue
    if (holdingRecommendations.some((rec) => normaliseCode(rec.code) === code)) continue

    holdingRecommendations.push({
      code: holding.code,
      name: holding.name ?? holding.code,
      assetClass: holding.assetClass,
      currentWeight: holding.weight,
      targetWeight: 0,
      changeWeight: -holding.weight,
      action: 'sell',
      rationale: 'Not part of the selected model portfolio — review whether to retain as an adviser exception or replace.',
    })
  }

  const unclassifiedHoldings = mappedHoldings.filter((h) => !h.mapped)

  return {
    assetClassComparison,
    holdingRecommendations: holdingRecommendations.sort(
      (a, b) => Math.abs(b.changeWeight) - Math.abs(a.changeWeight),
    ),
    unclassifiedHoldings,
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
