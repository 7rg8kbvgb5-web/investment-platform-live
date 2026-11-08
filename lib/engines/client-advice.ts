import type { ModelPortfolio, RiskProfile } from './model-portfolios'
import { fetchModelPortfolio, fetchAllRiskProfileWeights, computeGrowthDefensiveByProfile } from './model-portfolio-core'
import { mapClientHoldings, type MappedHolding } from './client-holdings-mapping'
import { classifyPortfolioRiskProfile } from './portfolio-risk-classification'
import { applyClientWeightOverrides } from './client-weight-overrides'
import {
  compareClientPortfolioToModel,
  type AssetClassComparisonRow,
  type HoldingRecommendation,
} from './portfolio-review-comparison'
import { deployCash, type CashDeploymentResult } from './cash-deployment'
import type { ClientPortfolioReview } from './client-portfolio-reviews'
import type { CommitteeDecision } from './investment-committee-decisions'
import { normaliseCode } from './codes'
import { frankingCredit } from './yield-aggregation'

// One engine that turns a saved client review into advice. Used by the
// Client Advice tab, the client register (drift), and the proposal PDF,
// so every view of a client is computed the same way from the same
// inputs: the client's holdings, the live house model for their risk
// profile (with any bespoke weights), any new cash, Investment Committee
// decisions, and the model version.

/** Asset class drift beyond this many percentage points is outside tolerance. */
export const DRIFT_TOLERANCE_PP = 5
/** Drift beyond this (but within tolerance) is worth watching. */
export const DRIFT_WATCH_PP = 2.5

export type AdviceApproach = 'rebalance' | 'new-cash'

export type DriftStatus = 'in-tolerance' | 'watch' | 'outside-tolerance' | 'no-holdings'

export type ProposedTrade = {
  code: string
  name: string
  assetClass: string
  action: 'buy' | 'increase' | 'reduce' | 'sell'
  value: number | null
  units: number | null
  currentWeight: number
  targetWeight: number
  rationale: string
}

export type ClientAdvice = {
  reviewId: string
  clientName: string
  asAtDate: string | null
  riskProfile: RiskProfile
  riskProfileSource: 'agreed' | 'estimated'
  model: ModelPortfolio
  hasBespokeWeights: boolean
  isNewMoney: boolean
  existingValue: number | null
  newCash: number
  totalAfter: number | null
  approach: AdviceApproach
  assetClasses: AssetClassComparisonRow[]
  /** Largest asset-class gap vs the model, in percentage points (absolute). */
  maxDriftPp: number
  driftStatus: DriftStatus
  trades: ProposedTrade[]
  cashDeployment: CashDeploymentResult | null
  holdingsOutsideModel: number
  unmappedHoldings: { code: string; name?: string; weight: number }[]
  projectedIncome: number | null
  projectedYieldPct: number | null
  yieldCoveragePct: number
  /** Annual franking credits on the projected income (30% company tax rate). */
  projectedFrankingCredits: number | null
  /** Projected yield including franking credits. */
  projectedGrossedUpYieldPct: number | null
  relevantDecisions: CommitteeDecision[]
  reviewModelVersion: number | null
  currentModelVersion: number | null
  warnings: string[]
}

export type AdviceContext = {
  prices?: Record<string, number | null>
  approvedDecisions?: CommitteeDecision[]
  currentModelVersion?: number | null
  /** Cache shared across many clients (register) so each model is fetched once. */
  modelCache?: Map<RiskProfile, Promise<ModelPortfolio>>
  growthDefensive?: Promise<ReturnType<typeof computeGrowthDefensiveByProfile>>
}

export async function buildClientAdvice(
  review: ClientPortfolioReview,
  context: AdviceContext = {},
  approachOverride?: AdviceApproach,
): Promise<ClientAdvice> {
  const { state } = review
  const warnings: string[] = []
  const isNewMoney = state.entryMode === 'new-money'
  const newCash = parseAmount(state.additionalCash)
  const existingValue = isNewMoney
    ? 0
    : state.meta.totalPortfolioValue ?? (parseAmount(state.manualPortfolioValue) || null)

  const mapping = isNewMoney || state.holdings.length === 0 ? null : await mapClientHoldings(state.holdings)
  const mapped: MappedHolding[] = mapping?.mappedHoldings ?? []

  // Risk profile: the adviser's agreed profile if set, else the nearest by growth/defensive split.
  let riskProfile: RiskProfile
  let riskProfileSource: 'agreed' | 'estimated' = 'agreed'
  if (state.riskOverride !== 'auto') {
    riskProfile = state.riskOverride
  } else if (mapping) {
    const gd = await (context.growthDefensive ??
      fetchAllRiskProfileWeights().then((w) => computeGrowthDefensiveByProfile(w)))
    riskProfile = classifyPortfolioRiskProfile(mapping.growthWeight, mapping.defensiveWeight, gd).nearestRiskProfile
    riskProfileSource = 'estimated'
    warnings.push(`No agreed risk profile recorded - compared against ${riskProfile}, the nearest by growth/defensive split. Set the agreed profile on the Construction tab.`)
  } else {
    riskProfile = 'Balanced'
    riskProfileSource = 'estimated'
    warnings.push('No risk profile recorded - defaulting to Balanced.')
  }

  const cache = context.modelCache
  let modelPromise = cache?.get(riskProfile)
  if (!modelPromise) {
    modelPromise = fetchModelPortfolio(riskProfile)
    cache?.set(riskProfile, modelPromise)
  }
  const baseModel = await modelPromise
  const model = applyClientWeightOverrides(baseModel, state.assetClassOverrides ?? {}, state.holdingOverrides ?? {})
  const hasBespokeWeights =
    Object.keys(state.assetClassOverrides ?? {}).length > 0 || Object.keys(state.holdingOverrides ?? {}).length > 0

  const totalAfter = existingValue !== null ? existingValue + newCash : newCash > 0 ? newCash : null
  const comparison = compareClientPortfolioToModel(mapped, model, {
    totalPortfolioValue: totalAfter ?? undefined,
    currentPortfolioValue: existingValue ?? undefined,
    prices: context.prices,
  })

  const maxDriftPp = mapped.length
    ? Math.max(0, ...comparison.assetClassComparison.map((r) => Math.abs(r.difference)))
    : 0
  const driftStatus: DriftStatus = !mapped.length
    ? 'no-holdings'
    : maxDriftPp > DRIFT_TOLERANCE_PP
      ? 'outside-tolerance'
      : maxDriftPp > DRIFT_WATCH_PP
        ? 'watch'
        : 'in-tolerance'

  // Approach: new money and top-ups default to investing the cash without
  // selling; otherwise a full rebalance.
  const approach: AdviceApproach =
    approachOverride ?? (isNewMoney || newCash > 0 ? 'new-cash' : 'rebalance')

  let cashDeployment: CashDeploymentResult | null = null
  if (approach === 'new-cash' && newCash > 0) {
    if (isNewMoney) {
      cashDeployment = deployCash({ model, cashAmount: newCash, mappedHoldings: [], existingPortfolioValue: 0, prices: context.prices })
    } else if (existingValue !== null) {
      cashDeployment = deployCash({ model, cashAmount: newCash, mappedHoldings: mapped, existingPortfolioValue: existingValue, prices: context.prices })
    } else {
      warnings.push('Enter the current portfolio value on the Construction tab to size the new-cash investment.')
    }
  } else if (approach === 'new-cash' && newCash <= 0) {
    warnings.push('No new cash recorded for this client - showing a full rebalance instead.')
  }

  let trades: ProposedTrade[]
  if (cashDeployment) {
    trades = cashDeployment.lines
      .filter((l) => l.investValue > 0)
      .map((l) => ({
        code: l.code,
        name: l.name,
        assetClass: l.assetClass,
        action: l.currentValue > 0 ? 'increase' : 'buy',
        value: l.investValue,
        units: l.units,
        currentWeight: cashDeployment!.existingValue > 0 ? round2((l.currentValue / cashDeployment!.existingValue) * 100) : 0,
        targetWeight: l.targetWeight,
        rationale: l.currentValue > 0 ? `Below target - new cash directed here.` : 'New position, per the model.',
      }))
  } else {
    trades = comparison.holdingRecommendations
      .filter((r): r is HoldingRecommendation & { action: ProposedTrade['action'] } => r.action !== 'hold')
      .map((r) => ({
        code: r.code,
        name: r.name,
        assetClass: r.assetClass,
        action: r.action,
        value: r.changeValue,
        units: r.units,
        currentWeight: r.currentWeight,
        targetWeight: r.targetWeight,
        rationale: r.rationale,
      }))
  }

  // Projected income on the model holdings once the trades are done.
  const yieldByCode = new Map<string, number>()
  const frankingByCode = new Map<string, number>()
  for (const ac of model.assetClasses)
    for (const h of ac.holdings) {
      if (typeof h.yield === 'number') yieldByCode.set(normaliseCode(h.code), h.yield)
      if (typeof h.frankingPct === 'number') frankingByCode.set(normaliseCode(h.code), h.frankingPct)
    }
  let projectedIncome: number | null = null
  let credits = 0
  let coveredWeight = 0
  let modelWeight = 0
  if (cashDeployment) {
    projectedIncome = 0
    for (const l of cashDeployment.lines) {
      modelWeight += l.resultingValue
      const y = yieldByCode.get(normaliseCode(l.code))
      if (y !== undefined) {
        const income = (l.resultingValue * y) / 100
        projectedIncome += income
        credits += frankingCredit(income, frankingByCode.get(normaliseCode(l.code)) ?? 0)
        coveredWeight += l.resultingValue
      }
    }
  } else if (totalAfter) {
    projectedIncome = 0
    for (const ac of model.assetClasses)
      for (const h of ac.holdings) {
        const value = (h.weight / 100) * totalAfter
        modelWeight += value
        if (typeof h.yield === 'number') {
          const income = (value * h.yield) / 100
          projectedIncome += income
          credits += frankingCredit(income, h.frankingPct ?? 0)
          coveredWeight += value
        }
      }
  }
  const yieldCoveragePct = modelWeight > 0 ? Math.round((coveredWeight / modelWeight) * 100) : 0
  const projectedYieldPct = projectedIncome !== null && coveredWeight > 0 ? round2((projectedIncome / coveredWeight) * 100) : null
  const projectedFrankingCredits = projectedIncome !== null && coveredWeight > 0 ? Math.round(credits) : null
  const projectedGrossedUpYieldPct =
    projectedIncome !== null && coveredWeight > 0 ? round2(((projectedIncome + credits) / coveredWeight) * 100) : null
  if (projectedIncome !== null) projectedIncome = Math.round(projectedIncome)
  if (projectedIncome === 0 && coveredWeight === 0) projectedIncome = null

  const heldCodes = new Set(mapped.map((h) => normaliseCode(h.code)))
  const relevantDecisions = (context.approvedDecisions ?? []).filter(
    (d) => d.currentCode && heldCodes.has(normaliseCode(d.currentCode)),
  )

  const reviewModelVersion = state.modelVersion ?? null
  const currentModelVersion = context.currentModelVersion ?? null
  if (reviewModelVersion !== null && currentModelVersion !== null && reviewModelVersion < currentModelVersion) {
    warnings.push(`Review last saved against model v${reviewModelVersion}; the model is now v${currentModelVersion}. Figures here use the current model.`)
  }
  if (!isNewMoney && existingValue === null) {
    warnings.push('No portfolio value recorded - trades are shown by weight only. Enter it on the Construction tab.')
  }
  if (comparison.unclassifiedHoldings.length > 0) {
    warnings.push(`${comparison.unclassifiedHoldings.length} holding(s) couldn't be classified and are excluded - review them on the Construction tab.`)
  }

  return {
    reviewId: review.id,
    clientName: review.clientName,
    asAtDate: state.meta.asAtDate,
    riskProfile,
    riskProfileSource,
    model,
    hasBespokeWeights,
    isNewMoney,
    existingValue,
    newCash,
    totalAfter,
    approach: cashDeployment ? 'new-cash' : 'rebalance',
    assetClasses: comparison.assetClassComparison,
    maxDriftPp: round2(maxDriftPp),
    driftStatus,
    trades,
    cashDeployment,
    holdingsOutsideModel: comparison.holdingRecommendations.filter((r) => r.action === 'sell').length,
    unmappedHoldings: comparison.unclassifiedHoldings.map((h) => ({ code: h.code, name: h.name, weight: h.weight })),
    projectedIncome,
    projectedYieldPct,
    yieldCoveragePct,
    projectedFrankingCredits,
    projectedGrossedUpYieldPct,
    relevantDecisions,
    reviewModelVersion,
    currentModelVersion,
    warnings,
  }
}

function parseAmount(value: string | null | undefined): number {
  if (!value) return 0
  const n = parseFloat(String(value).replace(/[,$\s]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
