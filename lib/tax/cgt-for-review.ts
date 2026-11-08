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
    .filter((t) => (t.action === 'sell' || t.action === 'reduce') && (t.value ?? 0) < 0)
    .map((t) => ({
      code: normaliseCode(t.code),
      name: t.name,
      proceeds: Math.abs(t.value as number),
      holdingValue: t.currentValue && t.currentValue > 0 ? t.currentValue : Math.abs(t.value as number),
    }))
}

export function settingsWithStatementDefaults(review: ClientPortfolioReview, sales: CgtSaleInput[]): CgtSettings {
  const saved = review.cgtSettings ?? DEFAULT_CGT_SETTINGS
  const holdings = { ...saved.holdings }
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  for (const sale of sales) {
    if (holdings[sale.code]) continue
    const fromStatement = review.state.holdings.find((h) => normaliseCode(h.code) === sale.code)
    holdings[sale.code] = {
      costBase: typeof fromStatement?.costBase === 'number' ? fromStatement.costBase : null,
      over12Months: fromStatement?.acquiredDate ? new Date(fromStatement.acquiredDate) <= oneYearAgo : true,
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
