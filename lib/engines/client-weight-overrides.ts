import type { ModelPortfolio } from './model-portfolios'
import { normaliseCode } from './security-universe'

/**
 * Client-specific weight overrides for a single proposal. These live only
 * in the browser session for the portfolio currently being reviewed - they
 * are never written back to the house model in Supabase. Two independent
 * layers, matching how advisers actually adjust a client away from the
 * model:
 *
 *  - assetClass: override an asset class's overall target weight for this
 *    client only (e.g. a client with a existing direct property holding
 *    outside managed funds might carry less in the Property asset class
 *    than the formal model calls for).
 *  - holding: override one security's target weight within its asset
 *    class for this client only (e.g. a CGT-impaired position that should
 *    be trimmed more gently than the model weight, or topped up less
 *    because the client already holds it elsewhere).
 *
 * Both are keyed so they survive re-renders and can be individually reset:
 * asset class overrides by asset class name, holding overrides by
 * normalised security code.
 */
export type AssetClassWeightOverrides = Record<string, number>
export type HoldingWeightOverrides = Record<string, number>

export const EMPTY_ASSET_CLASS_OVERRIDES: AssetClassWeightOverrides = {}
export const EMPTY_HOLDING_OVERRIDES: HoldingWeightOverrides = {}

/**
 * Returns a new ModelPortfolio with any overridden asset-class or
 * holding-level target weights applied. The house model object passed in
 * is never mutated - this is purely a client-side view layered on top of
 * it, so the same `model` reference can be reused as the reset target.
 */
export function applyClientWeightOverrides(
  model: ModelPortfolio,
  assetClassOverrides: AssetClassWeightOverrides,
  holdingOverrides: HoldingWeightOverrides,
): ModelPortfolio {
  const hasAssetClassOverrides = Object.keys(assetClassOverrides).length > 0
  const hasHoldingOverrides = Object.keys(holdingOverrides).length > 0

  if (!hasAssetClassOverrides && !hasHoldingOverrides) return model

  return {
    ...model,
    assetClasses: model.assetClasses.map((assetClass) => {
      const overriddenTargetWeight = assetClassOverrides[assetClass.name]

      const holdings = hasHoldingOverrides
        ? assetClass.holdings.map((holding) => {
            const override = holdingOverrides[normaliseCode(holding.code)]
            return override === undefined ? holding : { ...holding, weight: override }
          })
        : assetClass.holdings

      return overriddenTargetWeight === undefined && holdings === assetClass.holdings
        ? assetClass
        : {
            ...assetClass,
            targetWeight:
              overriddenTargetWeight === undefined
                ? assetClass.targetWeight
                : overriddenTargetWeight,
            holdings,
          }
    }),
  }
}

/** Sum of an asset class's holding target weights, for a running total the
 * adviser can check against 100% while editing bespoke in-class weights. */
export function sumHoldingWeights(holdings: { weight: number }[]): number {
  return Math.round(holdings.reduce((total, h) => total + h.weight, 0) * 100) / 100
}

/** Sum of all asset-class target weights, for a running total the adviser
 * can check against 100% while editing bespoke asset-class weights. */
export function sumAssetClassWeights(assetClasses: { targetWeight: number }[]): number {
  return Math.round(assetClasses.reduce((total, ac) => total + ac.targetWeight, 0) * 100) / 100
}
