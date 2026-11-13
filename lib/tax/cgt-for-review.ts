import type { ClientPortfolioReview } from '../engines/client-portfolio-reviews'
import type { ClientAdvice } from '../engines/client-advice'
import { normaliseCode } from '../engines/codes'
import { calculateCgt, DEFAULT_CGT_SETTINGS, type CgtResult, type CgtSaleInput, type CgtSettings } from './cgt'
import type { TaxReference } from './tax-reference'

// Joins a review's proposed sales to its capital gains settings. Cost base
// and holding period come from what the adviser entered, falling back to
// what the statement showed (cost base and acquisition date), if anything.

export function salesFromAdvice(advice: ClientAdvice): CgtSaleInput[] {
  return advice.trades
    // Cash isn't a CGT asset - drawing on it realises no gain or loss.
    .filter((t) => (t.action === 'sell' || t.action === 'reduce') && (t.value ?? 0) < 0)
    .filter((t) => t.assetClass !== 'Cash' && normaliseCode(t.code) !== 'CASH')
    .map((t) => ({
      code: normaliseCode(t.code),
      name: t.name,
      proceeds: Math.abs(t.value as number),
      holdingValue: t.currentValue && t.currentValue > 0 ? t.currentValue : Math.abs(t.value as number),
      statementCode: t.statementCode ? normaliseCode(t.statementCode) : undefined,
    }))
}

export function settingsWithStatementDefaults(review: ClientPortfolioReview, sales: CgtSaleInput[]): CgtSettings {
  const saved = review.cgtSettings ?? DEFAULT_CGT_SETTINGS
  const holdings = { ...saved.holdings }
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  for (const sale of sales) {
    const saved = holdings[sale.code]
    // Anything the adviser has entered stands; gaps are filled from the statement.
    if (saved && saved.costBase !== null) continue
    const fromStatement = review.state.holdings.find(
      (h) => normaliseCode(h.code) === sale.code || (!!sale.statementCode && normaliseCode(h.code) === sale.statementCode),
    )
    const statementCost = typeof fromStatement?.costBase === 'number' ? fromStatement.costBase : null
    holdings[sale.code] = {
      costBase: statementCost,
      over12Months: saved
        ? saved.over12Months
        : fromStatement?.acquiredDate
          ? new Date(fromStatement.acquiredDate) <= oneYearAgo
          : true,
    }
  }
  return { ...DEFAULT_CGT_SETTINGS, ...saved, holdings }
}

export function cgtForReview(
  review: ClientPortfolioReview,
  advice: ClientAdvice,
  reference: TaxReference,
): { sales: CgtSaleInput[]; settings: CgtSettings; result: CgtResult } {
  const sales = salesFromAdvice(advice)
  const settings = settingsWithStatementDefaults(review, sales)
  return { sales, settings, result: calculateCgt(sales, settings, reference) }
}
