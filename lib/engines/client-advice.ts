import { getSecurityIncome, isIncomeStale } from './security-income'
import { sortSecurities } from './security-order'
import type { HoldingTreatment } from './holding-triage'
import type { ModelPortfolio, RiskProfile } from './model-portfolios'
import { fetchModelPortfolio, fetchAllRiskProfileWeights, computeGrowthDefensiveByProfile } from './model-portfolio-core'
import { mapClientHoldings, type MappedHolding } from './client-holdings-mapping'
import { classifyPortfolioRiskProfile } from './portfolio-risk-classification'
import { applyClientWeightOverrides } from './client-weight-overrides'
import {
  compareClientPortfolioToModel,
  type AssetClassComparisonRow,
  type HoldingRecommendation,
  UNIT_ROUNDING,
} from './portfolio-review-comparison'
import { deployCash, type CashDeploymentResult } from './cash-deployment'
import type { ClientPortfolioReview } from './client-portfolio-reviews'
import type { CommitteeDecision } from './investment-committee-decisions'
import { normaliseCode } from './codes'
import { frankingCredit } from './yield-aggregation'
import { fetchHouseViews, houseViewSentence } from './house-view'
import { exclusionStatus, exclusionWarning } from './exclusions-check'

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
  /** Value of the whole holding before the trade (0 if not held). */
  currentValue: number | null
  code: string
  name: string
  assetClass: string
  action: 'buy' | 'increase' | 'reduce' | 'sell'
  value: number | null
  units: number | null
  currentWeight: number
  targetWeight: number
  rationale: string
  /** Holdings outside the model: sell now vs staged exit. */
  treatment?: HoldingTreatment
  /** Code as printed on the statement where it differs (e.g. bond ISIN) - for cost-base lookup. */
  statementCode?: string
}

/** One holding in the portfolio as it stands after the advice is implemented. */
export type ResultingHolding = {
  code: string
  name: string
  assetClass: string
  weight: number
  value: number | null
  yield: number | null
  frankingPct: number | null
  /** False for holdings retained (or left untouched) outside the house model. */
  inModel: boolean
  /** From the model: direct_equity / listed_fund / unlisted_fund / ... - null outside the model. */
  holdingType?: string | null
}

/** A holding kept outside the model as a documented adviser exception. */
export type RetainedHolding = {
  code: string
  name: string
  assetClass: string
  currentValue: number | null
  currentWeight: number
  reason: string | null
}

export type ClientAdvice = {
  reviewId: string
  clientName: string
  asAtDate: string | null
  riskProfile: RiskProfile
  riskProfileSource: 'agreed' | 'estimated'
  model: ModelPortfolio
  hasBespokeWeights: boolean
  /** Units per step when trades are rounded for presentation (e.g. 10); null = whole units. */
  unitRounding?: number | null
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
  /** Income the client's portfolio produces today (before the advice), where yields are known. */
  currentIncome: number | null
  currentYieldPct: number | null
  currentFrankingCredits: number | null
  /** % of today's portfolio (by value) with a known yield. */
  currentIncomeCoveragePct: number
  /** Current holdings with no known yield yet - can be looked up from Client Advice. */
  incomeLookupNeeded: { code: string; name: string }[]
  /** % of the existing portfolio still unclassified - excluded from this proposal until classified. */
  unclassifiedWeightPct: number
  retainedHoldings: RetainedHolding[]
  resultingHoldings: ResultingHolding[]
  /** The client's holdings today, by % of the portfolio (for before/after comparisons). Empty for new money. */
  currentHoldings: { code: string; name: string; assetClass: string; weight: number }[]
  projectedIncome: number | null
  projectedYieldPct: number | null
  yieldCoveragePct: number
  /**
   * Franking credit benefit by asset class, in percentage points of return a
   * year: each class's franking credits / value of its holdings with a known
   * yield. Worked out from each holding's own yield and franking level
   * (credit = cash dividend x 30/70 when fully franked).
   */
  frankingBenefitByClass: { current: Record<string, number>; projected: Record<string, number> }
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
  /** Cache shared across many clients (register) so each model is fetched once - keyed "modelId:riskProfile". */
  modelCache?: Map<string, Promise<ModelPortfolio>>
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

  // Everything follows the adviser model this review is built against.
  const modelId = review.modelId
  const mapping = isNewMoney || state.holdings.length === 0 ? null : await mapClientHoldings(state.holdings, modelId)
  const mapped: MappedHolding[] = mapping?.mappedHoldings ?? []

  // Risk profile: the adviser's agreed profile if set, else the nearest by growth/defensive split.
  let riskProfile: RiskProfile
  let riskProfileSource: 'agreed' | 'estimated' = 'agreed'
  if (state.riskOverride !== 'auto') {
    riskProfile = state.riskOverride
  } else if (mapping) {
    const gd = await (context.growthDefensive ??
      fetchAllRiskProfileWeights(modelId).then((w) => computeGrowthDefensiveByProfile(w)))
    riskProfile = classifyPortfolioRiskProfile(mapping.growthWeight, mapping.defensiveWeight, gd).nearestRiskProfile
    riskProfileSource = 'estimated'
    warnings.push(`No agreed risk profile recorded - compared against ${riskProfile}, the nearest by growth/defensive split. Set the agreed profile on the Construction tab.`)
  } else {
    riskProfile = 'Balanced'
    riskProfileSource = 'estimated'
    warnings.push('No risk profile recorded - defaulting to Balanced.')
  }

  const cache = context.modelCache
  const cacheKey = `${modelId}:${riskProfile}`
  let modelPromise = cache?.get(cacheKey)
  if (!modelPromise) {
    modelPromise = fetchModelPortfolio(riskProfile, modelId)
    cache?.set(cacheKey, modelPromise)
  }
  const baseModel = await modelPromise
  const model = applyClientWeightOverrides(baseModel, state.assetClassOverrides ?? {}, state.holdingOverrides ?? {})
  const hasBespokeWeights =
    Object.keys(state.assetClassOverrides ?? {}).length > 0 ||
    Object.keys(state.holdingOverrides ?? {}).length > 0 ||
    Object.keys(state.tradeOverrides ?? {}).length > 0

  const roundUnitsTo = state.roundUnits ? UNIT_ROUNDING : undefined
  const totalAfter = existingValue !== null ? existingValue + newCash : newCash > 0 ? newCash : null
  const comparison = compareClientPortfolioToModel(mapped, model, {
    totalPortfolioValue: totalAfter ?? undefined,
    currentPortfolioValue: existingValue ?? undefined,
    prices: context.prices,
    tradeOverrides: state.tradeOverrides ?? {},
    roundUnitsTo,
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

  // Approach: new money is invested straight into the model. An existing
  // portfolio - with or without a top-up - defaults to a full rebalance, with
  // any new cash included in the total the model weights are applied to.
  // "Invest new cash only - no sells" stays available as an alternative.
  const approach: AdviceApproach = approachOverride ?? (isNewMoney ? 'new-cash' : 'rebalance')

  let cashDeployment: CashDeploymentResult | null = null
  if (approach === 'new-cash' && newCash > 0) {
    if (isNewMoney) {
      cashDeployment = deployCash({ model, cashAmount: newCash, mappedHoldings: [], existingPortfolioValue: 0, prices: context.prices, tradeOverrides: state.tradeOverrides ?? {}, roundUnitsTo })
    } else if (existingValue !== null) {
      cashDeployment = deployCash({ model, cashAmount: newCash, mappedHoldings: mapped, existingPortfolioValue: existingValue, prices: context.prices, tradeOverrides: state.tradeOverrides ?? {}, roundUnitsTo })
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
        currentValue: l.currentValue,
        action: l.currentValue > 0 ? 'increase' : 'buy',
        value: l.investValue,
        units: l.units,
        currentWeight: cashDeployment!.existingValue > 0 ? round2((l.currentValue / cashDeployment!.existingValue) * 100) : 0,
        targetWeight: l.targetWeight,
        rationale:
          l.currentValue > 0
            ? `Below target within an underweight asset class - new cash directed here.`
            : 'New position, per the model, within an underweight asset class.',
      }))
  } else {
    trades = comparison.holdingRecommendations
      .filter((r): r is HoldingRecommendation & { action: ProposedTrade['action'] } => r.action !== 'hold')
      .map((r) => ({
        code: r.code,
        name: r.name,
        assetClass: r.assetClass,
        currentValue: r.currentValue,
        action: r.action,
        value: r.changeValue,
        units: r.units,
        currentWeight: r.currentWeight,
        targetWeight: r.targetWeight,
        rationale: r.rationale,
        treatment: r.treatment,
        statementCode: r.statementCode,
      }))
  }

  // Ord Minnett's house view, where it supports a trade, goes into that
  // trade's reasoning in the proposal. Where a trade cuts against it, the
  // adviser is warned instead - the client document stays consistent.
  try {
    const views = await fetchHouseViews(
      trades.map((t) => t.code),
      'Ord Minnett',
      context.prices ?? undefined,
    )
    for (const t of trades) {
      const v = views.get(normaliseCode(t.code))
      if (!v) continue
      const buying = t.action === 'buy' || t.action === 'increase'
      if ((buying && v.lean === 'bullish') || (!buying && v.lean !== 'bullish')) {
        t.rationale = `${t.rationale.trim()} ${houseViewSentence(v)}.`.trim()
      } else if (t.action === 'sell' && v.lean === 'bullish') {
        warnings.push(`${t.code}: proposed sale, but Ord Minnett rates it ${v.rating}. Consider retaining, or document why it's being sold.`)
      } else if (buying && v.lean === 'bearish') {
        warnings.push(`${t.code}: proposed purchase, but Ord Minnett rates it ${v.rating}. Check the model holding with the Investment Committee.`)
      }
    }
  } catch {
    // House views are supporting detail - never block the advice over them.
  }

  // The portfolio as it stands once the advice is implemented - every
  // holding with its resulting weight and value, plus yield and franking
  // from the model where known. Drives projected income and the proposal.
  const yieldByCode = new Map<string, number>()
  const frankingByCode = new Map<string, number>()
  const holdingTypeByCode = new Map<string, string>()
  for (const ac of model.assetClasses)
    for (const h of ac.holdings) {
      if (typeof h.yield === 'number') yieldByCode.set(normaliseCode(h.code), h.yield)
      if (typeof h.frankingPct === 'number') frankingByCode.set(normaliseCode(h.code), h.frankingPct)
      if (h.holdingType) holdingTypeByCode.set(normaliseCode(h.code), h.holdingType)
    }
  const resultingHoldings: ResultingHolding[] = []
  if (cashDeployment) {
    for (const l of cashDeployment.lines) {
      if (l.resultingValue <= 0) continue
      resultingHoldings.push({
        code: l.code,
        name: l.name,
        assetClass: l.assetClass,
        weight: l.resultingWeight,
        value: l.resultingValue,
        yield: yieldByCode.get(normaliseCode(l.code)) ?? null,
        frankingPct: frankingByCode.get(normaliseCode(l.code)) ?? null,
        inModel: true,
        holdingType: holdingTypeByCode.get(normaliseCode(l.code)) ?? null,
      })
    }
    // Existing holdings outside the model are untouched when only new cash is invested.
    const modelCodes = new Set(cashDeployment.lines.map((l) => normaliseCode(l.code)))
    for (const h of mapped) {
      if (!h.mapped || modelCodes.has(normaliseCode(h.code))) continue
      const value = h.value ?? (existingValue ? (h.weight / 100) * existingValue : 0)
      resultingHoldings.push({
        code: h.code,
        name: h.name ?? h.code,
        assetClass: h.assetClass,
        weight: cashDeployment.totalAfter > 0 ? round2((value / cashDeployment.totalAfter) * 100) : 0,
        value,
        yield: null,
        frankingPct: null,
        inModel: false,
      })
    }
  } else {
    for (const r of comparison.holdingRecommendations) {
      if (r.targetWeight <= 0) continue
      resultingHoldings.push({
        code: r.code,
        name: r.name,
        assetClass: r.assetClass,
        weight: r.targetWeight,
        value: r.targetValue ?? (totalAfter ? (r.targetWeight / 100) * totalAfter : null),
        yield: yieldByCode.get(normaliseCode(r.code)) ?? null,
        frankingPct: frankingByCode.get(normaliseCode(r.code)) ?? null,
        inModel: r.treatment === undefined,
        holdingType: r.treatment === undefined ? holdingTypeByCode.get(normaliseCode(r.code)) ?? null : null,
      })
    }
  }

  // Franking benefit per asset class, from the actual holdings (see frankingBenefitByClass).
  const currentByClass: Record<string, { value: number; credits: number }> = {}
  const projectedByClass: Record<string, { value: number; credits: number }> = {}

  // Income today, on the client's current holdings: model yields where the
  // holding is in the model, otherwise remembered lookups (security_income).
  let currentIncome: number | null = null
  let currentCredits = 0
  let currentCovered = 0
  let currentTotal = 0
  const incomeLookupNeeded: { code: string; name: string }[] = []
  if (!isNewMoney && mapped.length > 0) {
    const remembered = await getSecurityIncome(mapped.map((h) => h.statementCode ?? h.code))
    currentIncome = 0
    for (const h of mapped) {
      const value = h.value ?? (existingValue ? (h.weight / 100) * existingValue : null)
      if (value === null) continue
      currentTotal += value
      const key = normaliseCode(h.code)
      const fromModel = yieldByCode.get(key)
      const fromLookup = remembered[normaliseCode(h.statementCode ?? h.code)]
      const y = fromModel ?? fromLookup?.yield ?? null
      const f = fromModel !== undefined ? frankingByCode.get(key) ?? 0 : fromLookup?.frankingPct ?? 0
      if (typeof y === 'number') {
        const income = (value * y) / 100
        currentIncome += income
        currentCredits += frankingCredit(income, f)
        currentCovered += value
        addClassFranking(currentByClass, h.assetClass, value, frankingCredit(income, f))
      } else if (!fromLookup || isIncomeStale(fromLookup)) {
        incomeLookupNeeded.push({ code: h.statementCode ?? h.code, name: h.name ?? h.code })
      }
    }
    if (currentCovered === 0) currentIncome = null
  }
  const currentIncomeCoveragePct = currentTotal > 0 ? Math.round((currentCovered / currentTotal) * 100) : 0
  const currentYieldPct = currentIncome !== null && currentCovered > 0 ? round2((currentIncome / currentCovered) * 100) : null

  // Projected income on the resulting portfolio.
  let projectedIncome: number | null = null
  let credits = 0
  let coveredWeight = 0
  let modelWeight = 0
  if (totalAfter) {
    projectedIncome = 0
    for (const h of resultingHoldings) {
      const value = h.value ?? (h.weight / 100) * totalAfter
      modelWeight += value
      if (typeof h.yield === 'number') {
        const income = (value * h.yield) / 100
        projectedIncome += income
        credits += frankingCredit(income, h.frankingPct ?? 0)
        coveredWeight += value
        addClassFranking(projectedByClass, h.assetClass, value, frankingCredit(income, h.frankingPct ?? 0))
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
  const unclassifiedWeightPct = round2(comparison.unclassifiedHoldings.reduce((sum, h) => sum + h.weight, 0))
  if (comparison.unclassifiedHoldings.length > 0) {
    warnings.push(
      `${comparison.unclassifiedHoldings.length} holding(s), ${unclassifiedWeightPct}% of the portfolio, are not yet classified and are excluded from this proposal - classify them on the Construction tab before presenting.`,
    )
  }
  const retainedHoldings: RetainedHolding[] = cashDeployment
    ? []
    : comparison.holdingRecommendations
        .filter((r) => r.treatment === 'retain' && r.action === 'hold')
        .map((r) => ({
          code: r.code,
          name: r.name,
          assetClass: r.assetClass,
          currentValue: r.currentValue,
          currentWeight: r.currentWeight,
          reason: r.treatmentReason ?? null,
        }))
  const undocumented = retainedHoldings.filter((h) => !h.reason)
  if (undocumented.length > 0) {
    warnings.push(`${undocumented.length} retained holding(s) have no documented reason: ${undocumented.map((h) => h.code).join(', ')}.`)
  }

  // Client exclusions: warn until the recommended holdings have been checked against them.
  const exclusion = exclusionWarning(
    exclusionStatus(review.objectives?.constraints, review.objectives?.exclusionCheck, resultingHoldings.map((h) => h.code)),
  )
  if (exclusion) warnings.push(exclusion)

  return {
    reviewId: review.id,
    clientName: review.clientName,
    asAtDate: state.meta.asAtDate,
    riskProfile,
    riskProfileSource,
    model,
    hasBespokeWeights,
    unitRounding: roundUnitsTo ?? null,
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
    unclassifiedWeightPct,
    retainedHoldings,
    resultingHoldings: sortSecurities(resultingHoldings),
    currentIncome: currentIncome !== null ? Math.round(currentIncome) : null,
    currentYieldPct,
    currentFrankingCredits: currentIncome !== null ? Math.round(currentCredits) : null,
    frankingBenefitByClass: { current: classBenefit(currentByClass), projected: classBenefit(projectedByClass) },
    currentHoldings: isNewMoney
      ? []
      : mapped
          .filter((h) => h.weight > 0)
          .map((h) => ({ code: h.code, name: h.name ?? h.code, assetClass: h.assetClass, weight: h.weight })),
    currentIncomeCoveragePct,
    incomeLookupNeeded,
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

function addClassFranking(
  acc: Record<string, { value: number; credits: number }>,
  assetClass: string | null | undefined,
  value: number,
  credits: number,
): void {
  if (!assetClass || value <= 0) return
  const row = (acc[assetClass] ??= { value: 0, credits: 0 })
  row.value += value
  row.credits += credits
}

/** Percentage points of return a year from franking credits, per asset class. */
function classBenefit(acc: Record<string, { value: number; credits: number }>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(acc)) if (v.value > 0) out[k] = Math.round((v.credits / v.value) * 1000) / 10
  return out
}
