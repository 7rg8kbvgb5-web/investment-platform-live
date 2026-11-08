import type { ModelPortfolio } from './model-portfolios'
import type { MappedHolding } from './client-holdings-mapping'
import { normaliseCode } from './security-universe'
import type { TradeOverrides } from './portfolio-review-comparison'

// Cash deployment: how a sum of new money gets invested.
//
// Two situations, one engine:
//   - New money: the client has no existing portfolio with us. The whole
//     lump sum is invested straight into the selected model at its target
//     weights.
//   - Top-up: the client already holds a portfolio and is adding cash.
//     The new cash goes to whatever is furthest below its target weight
//     first, measured against the portfolio's size AFTER the cash goes
//     in. Nothing is sold - this is deliberately the no-CGT, no-turnover
//     route. Only once every underweight is filled does any surplus get
//     spread across the whole model at its target weights.
//
// When the cash isn't enough to fill every underweight, it's shared
// across them in proportion to how far each is below target, so the
// portfolio moves evenly toward the model rather than one gap being
// closed completely while another is untouched.
//
// Unit counts are rounded DOWN to whole units where a live price exists,
// so a buy list never asks for more money than is actually available.
// The rounding leftover is reported as residual cash.

export type CashDeploymentMode = 'new-money' | 'top-up'

export type CashDeploymentLine = {
  code: string
  name: string
  assetClass: string
  currentValue: number
  /** Target weight in the post-investment portfolio (percent). */
  targetWeight: number
  targetValue: number
  /** How far below target this holding sits before the cash goes in (0 if at/above target). */
  shortfall: number
  /** Dollars of new cash directed here (after rounding to whole units, where priced). */
  investValue: number
  price: number | null
  /** Whole units to buy, rounded down. Null where no live price (e.g. unlisted funds) - invest by dollar amount. */
  units: number | null
  resultingValue: number
  resultingWeight: number
  /** True when the adviser has set this line's units / dollars. */
  adjusted: boolean
}

export type CashDeploymentAssetClassRow = {
  assetClass: string
  type: 'Growth' | 'Defensive'
  targetWeight: number
  beforeWeight: number
  afterWeight: number
  investValue: number
}

export type CashDeploymentResult = {
  mode: CashDeploymentMode
  cashAmount: number
  existingValue: number
  totalAfter: number
  lines: CashDeploymentLine[]
  assetClasses: CashDeploymentAssetClassRow[]
  /** Dollars actually allocated to holdings. */
  totalInvested: number
  /** New cash left uninvested: unit rounding, plus any part of the model not allocated (bespoke weights summing below 100%). */
  residualCash: number
  /** True when the cash wasn't enough to fill every underweight - some gaps remain after this. */
  underweightsRemain: boolean
  /** Sum of underweights before investing - how much new cash would bring every holding up to target. */
  totalShortfall: number
}

export type CashDeploymentInput = {
  model: ModelPortfolio
  cashAmount: number
  /** Client's existing holdings (empty for new money). */
  mappedHoldings: MappedHolding[]
  /** Value of the existing portfolio before the cash goes in. Used to turn weight-only holdings into dollars. */
  existingPortfolioValue: number
  prices?: Record<string, number | null>
  /** Adviser-set units (or $ where unpriced) for specific lines; the rest keep their calculated size. */
  tradeOverrides?: TradeOverrides
}

export function deployCash(input: CashDeploymentInput): CashDeploymentResult {
  const { model, mappedHoldings, prices } = input
  const cashAmount = Math.max(0, input.cashAmount)
  const existingValue = Math.max(0, input.existingPortfolioValue)
  const mode: CashDeploymentMode = existingValue > 0 && mappedHoldings.length > 0 ? 'top-up' : 'new-money'
  const totalAfter = existingValue + cashAmount

  // Current dollar value per code. Stated dollar values on the upload win
  // over weight-derived estimates, same rule as the review comparison.
  const currentByCode = new Map<string, number>()
  for (const holding of mappedHoldings) {
    const code = normaliseCode(holding.code)
    const value = holding.value ?? (holding.weight / 100) * existingValue
    currentByCode.set(code, (currentByCode.get(code) ?? 0) + value)
  }

  type Draft = Omit<CashDeploymentLine, 'investValue' | 'units' | 'resultingValue' | 'resultingWeight' | 'adjusted'> & {
    rawInvest: number
  }

  const drafts: Draft[] = []
  for (const assetClass of model.assetClasses) {
    for (const holding of assetClass.holdings) {
      const code = normaliseCode(holding.code)
      const currentValue = currentByCode.get(code) ?? 0
      const targetValue = (holding.weight / 100) * totalAfter
      drafts.push({
        code: holding.code,
        name: holding.name,
        assetClass: assetClass.name,
        currentValue,
        targetWeight: holding.weight,
        targetValue,
        shortfall: Math.max(0, targetValue - currentValue),
        price: prices?.[code] ?? null,
        rawInvest: 0,
      })
    }
  }

  const totalShortfall = drafts.reduce((sum, d) => sum + d.shortfall, 0)
  const underweightsRemain = totalShortfall > cashAmount + 0.5

  if (totalShortfall <= 0) {
    // Already at or above target everywhere - spread at model weights.
    for (const d of drafts) d.rawInvest = cashAmount * (d.targetWeight / 100)
  } else if (totalShortfall >= cashAmount) {
    // Not enough to fill every gap - share in proportion to each gap.
    for (const d of drafts) d.rawInvest = cashAmount * (d.shortfall / totalShortfall)
  } else {
    // Fill every gap, then spread the surplus at model weights.
    const surplus = cashAmount - totalShortfall
    for (const d of drafts) d.rawInvest = d.shortfall + surplus * (d.targetWeight / 100)
  }

  const overrides = input.tradeOverrides ?? {}
  const lines: CashDeploymentLine[] = drafts.map((d) => {
    let investValue = d.rawInvest
    let units: number | null = null
    const o = overrides[normaliseCode(d.code)]
    let adjusted = false
    if (o && typeof o.units === 'number' && d.price && d.price > 0) {
      // New cash only buys - a negative entry is treated as zero.
      units = Math.max(0, Math.round(o.units))
      investValue = units * d.price
      adjusted = true
    } else if (o && typeof o.value === 'number') {
      investValue = Math.max(0, o.value)
      units = d.price && d.price > 0 ? Math.floor(investValue / d.price) : null
      adjusted = true
    } else if (d.price && d.price > 0) {
      units = Math.floor(d.rawInvest / d.price)
      investValue = units * d.price
    }
    investValue = round2(investValue)
    const resultingValue = d.currentValue + investValue
    return {
      code: d.code,
      name: d.name,
      assetClass: d.assetClass,
      currentValue: round2(d.currentValue),
      targetWeight: d.targetWeight,
      targetValue: round2(d.targetValue),
      shortfall: round2(d.shortfall),
      investValue,
      price: d.price,
      units,
      resultingValue: round2(resultingValue),
      resultingWeight: totalAfter > 0 ? round2((resultingValue / totalAfter) * 100) : 0,
      adjusted,
    }
  })

  const totalInvested = round2(lines.reduce((sum, l) => sum + l.investValue, 0))
  const residualCash = round2(cashAmount - totalInvested)

  // Asset-class view, before vs after. "Before" uses the existing
  // portfolio's own size; holdings outside the model still count toward
  // their asset class so the picture isn't flattered.
  const beforeByClass = new Map<string, number>()
  for (const holding of mappedHoldings) {
    if (!holding.mapped) continue
    const value = holding.value ?? (holding.weight / 100) * existingValue
    beforeByClass.set(holding.assetClass, (beforeByClass.get(holding.assetClass) ?? 0) + value)
  }
  const investByClass = new Map<string, number>()
  for (const line of lines) {
    investByClass.set(line.assetClass, (investByClass.get(line.assetClass) ?? 0) + line.investValue)
  }

  const assetClasses: CashDeploymentAssetClassRow[] = model.assetClasses.map((ac) => {
    const before = beforeByClass.get(ac.name) ?? 0
    const invest = investByClass.get(ac.name) ?? 0
    // Residual cash from rounding sits in the Cash asset class afterwards.
    const residualHere = ac.name === 'Cash' ? residualCash : 0
    return {
      assetClass: ac.name,
      type: ac.type,
      targetWeight: ac.targetWeight,
      beforeWeight: existingValue > 0 ? round2((before / existingValue) * 100) : 0,
      afterWeight: totalAfter > 0 ? round2(((before + invest + residualHere) / totalAfter) * 100) : 0,
      investValue: round2(invest),
    }
  })

  return {
    mode,
    cashAmount,
    existingValue,
    totalAfter,
    lines,
    assetClasses,
    totalInvested,
    residualCash,
    underweightsRemain,
    totalShortfall: round2(totalShortfall),
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
