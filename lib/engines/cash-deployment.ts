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
//   - Top-up: the client already holds a portfolio and is adding cash,
//     and nothing is to be sold (the no-CGT, no-turnover route). The cash
//     is directed TOP DOWN, measured against the portfolio's size AFTER
//     the cash goes in:
//       1. Asset classes first. Cash goes only to asset classes below
//          their risk-profile target - an overweight asset class gets
//          nothing, however many of its model securities the client
//          doesn't yet own.
//       2. Then securities within each asset class, by the model's
//          security weights: to the holdings furthest below target first,
//          then any remainder at the model's in-class weights.
//     When the cash can't close every asset-class gap it's shared across
//     the underweight classes in proportion to their gaps, so the whole
//     portfolio moves evenly toward the model. Once every gap is closed,
//     any surplus is spread across the model at its target weights.
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
  /** True when the cash wasn't enough to fill every underweight asset class - some gaps remain after this. */
  underweightsRemain: boolean
  /** Sum of asset-class shortfalls before investing - how much new cash would bring every asset class up to target without selling. */
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

  // Step 1 - asset classes. Current value per class counts every mapped
  // holding in it, including ones outside the model, so an overweight class
  // is recognised as overweight.
  const currentByClass = new Map<string, number>()
  for (const holding of mappedHoldings) {
    if (!holding.mapped) continue
    const value = holding.value ?? (holding.weight / 100) * existingValue
    currentByClass.set(holding.assetClass, (currentByClass.get(holding.assetClass) ?? 0) + value)
  }
  const classes = model.assetClasses
    .map((ac) => {
      const lines = drafts.filter((d) => d.assetClass === ac.name)
      const modelWeight = lines.reduce((sum, d) => sum + d.targetWeight, 0)
      const targetValue = (modelWeight / 100) * totalAfter
      return {
        name: ac.name,
        lines,
        modelWeight,
        shortfall: Math.max(0, targetValue - (currentByClass.get(ac.name) ?? 0)),
      }
    })
    .filter((c) => c.lines.length > 0 && c.modelWeight > 0)

  const totalShortfall = classes.reduce((sum, c) => sum + c.shortfall, 0)
  const underweightsRemain = totalShortfall > cashAmount + 0.5
  const modelTotalWeight = classes.reduce((sum, c) => sum + c.modelWeight, 0)

  const classCash = new Map<string, number>()
  for (const c of classes) {
    let cash: number
    if (mode === 'new-money' || totalShortfall <= 0) {
      cash = cashAmount * (c.modelWeight / 100)
    } else if (totalShortfall >= cashAmount) {
      cash = cashAmount * (c.shortfall / totalShortfall)
    } else {
      cash = c.shortfall + (cashAmount - totalShortfall) * (c.modelWeight / Math.max(modelTotalWeight, 100))
    }
    classCash.set(c.name, cash)
  }

  // Step 2 - securities within each asset class.
  for (const c of classes) {
    const cash = classCash.get(c.name) ?? 0
    if (cash <= 0) continue
    const gaps = c.lines.reduce((sum, d) => sum + d.shortfall, 0)
    for (const d of c.lines) {
      const share = d.targetWeight / c.modelWeight
      if (mode === 'new-money' || gaps <= 0) d.rawInvest = cash * share
      else if (gaps >= cash) d.rawInvest = cash * (d.shortfall / gaps)
      else d.rawInvest = d.shortfall + (cash - gaps) * share
    }
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
  const beforeByClass = currentByClass
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
