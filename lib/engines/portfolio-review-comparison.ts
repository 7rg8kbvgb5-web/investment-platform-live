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
  // Dollar figures - null whenever we don't have enough to size a real
  // trade (no total portfolio value supplied and no actual $ value on
  // the uploaded holding). Weight-only comparisons still work exactly
  // as before; these are additive.
  currentValue: number | null
  targetValue: number | null
  changeValue: number | null
  // Live price, when available (EODHD). Null if not connected, not a
  // quotable listed security (direct mandate/active fund/cash), or the
  // lookup failed.
  price: number | null
  // Signed unit count implied by changeValue/price - positive to buy,
  // negative to sell. For a full sell of a holding the client's actual
  // uploaded quantity is used directly when known, since that's exact
  // rather than derived from a price that may have moved since the
  // statement date.
  units: number | null
  action: 'buy' | 'increase' | 'reduce' | 'sell' | 'hold'
  rationale: string
}

export type PortfolioReviewComparison = {
  assetClassComparison: AssetClassComparisonRow[]
  holdingRecommendations: HoldingRecommendation[]
  unclassifiedHoldings: MappedHolding[]
}

export type ComparisonContext = {
  /** Total client portfolio value in dollars, if known - from the upload's
   * stated total, or entered manually. Powers weight -> dollar sizing for
   * any holding that doesn't have its own stated value. */
  totalPortfolioValue?: number
  /** Live prices keyed by normalised code, for converting dollar trade
   * sizes into unit counts. Missing/null entries just mean units can't
   * be shown for that security - dollar figures still work without it. */
  prices?: Record<string, number | null>
}

/** Within this band either side of the model weight, no change is recommended. */
const NEUTRAL_BAND_PP = 1

export function compareClientPortfolioToModel(
  mappedHoldings: MappedHolding[],
  model: ModelPortfolio,
  context: ComparisonContext = {},
): PortfolioReviewComparison {
  const { totalPortfolioValue, prices } = context

  function priceFor(code: string): number | null {
    return prices?.[normaliseCode(code)] ?? null
  }

  function valueFromWeight(weight: number): number | null {
    return totalPortfolioValue ? round2((weight / 100) * totalPortfolioValue) : null
  }

  function unitsFor(value: number | null, code: string): number | null {
    if (value === null) return null
    const price = priceFor(code)
    if (!price) return null
    return Math.round(value / price)
  }

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
  const clientHoldingValues = new Map<string, number>()
  const clientHoldingQuantities = new Map<string, number>()
  for (const holding of mappedHoldings) {
    if (!holding.mapped) continue
    const code = normaliseCode(holding.code)
    clientHoldingWeights.set(
      code,
      (clientHoldingWeights.get(code) ?? 0) + holding.weight,
    )
    if (holding.value) {
      clientHoldingValues.set(code, (clientHoldingValues.get(code) ?? 0) + holding.value)
    }
    if (holding.quantity) {
      clientHoldingQuantities.set(code, (clientHoldingQuantities.get(code) ?? 0) + holding.quantity)
    }
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

      // Prefer the client's actual stated dollar value for what they
      // currently hold (exact) over deriving it from weight (estimated).
      const currentValue =
        clientHoldingValues.get(normalisedModelCode) ?? valueFromWeight(currentWeight)
      const targetValue = valueFromWeight(targetWeight)
      const changeValue =
        currentValue !== null && targetValue !== null
          ? round2(targetValue - currentValue)
          : null
      const price = priceFor(modelHolding.code)
      const units = unitsFor(changeValue, modelHolding.code)

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
        currentValue,
        targetValue,
        changeValue,
        price,
        units,
        action,
        rationale,
      })
    }
  }

  // Client holdings that are mapped (known securities/asset classes) but
  // aren't part of this model portfolio at all - genuine full sells, not
  // holdings we have no data on. These don't meet the risk-adjusted
  // return bar this client is being managed to, so the whole position
  // goes, filed under the asset class it actually belongs to (from the
  // security universe, not the model) so it represents correctly when a
  // proposal is generated.
  for (const holding of mappedHoldings) {
    if (!holding.mapped) continue
    const code = normaliseCode(holding.code)
    if (modelHoldingCodes.has(code)) continue
    if (holdingRecommendations.some((rec) => normaliseCode(rec.code) === code)) continue

    // Actual stated value/quantity from the upload is authoritative for a
    // full sell - it's what the client genuinely holds, not an estimate.
    const currentValue = holding.value ?? valueFromWeight(holding.weight)
    const changeValue = currentValue !== null ? round2(-currentValue) : null
    const actualQuantity = clientHoldingQuantities.get(code)
    const price = priceFor(holding.code)
    const units =
      actualQuantity !== undefined ? -actualQuantity : unitsFor(changeValue, holding.code)

    holdingRecommendations.push({
      code: holding.code,
      name: holding.name ?? holding.code,
      assetClass: holding.assetClass,
      currentWeight: holding.weight,
      targetWeight: 0,
      changeWeight: -holding.weight,
      currentValue,
      targetValue: 0,
      changeValue,
      price,
      units,
      action: 'sell',
      rationale: 'Not part of the selected model portfolio — does not meet the risk-adjusted return bar for this client. Full exit recommended, or retain as a documented adviser exception.',
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
