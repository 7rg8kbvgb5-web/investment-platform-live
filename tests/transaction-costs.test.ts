import { describe, expect, it } from 'vitest'
import { describeTransactionCost, normaliseTransactionCosts, tradeCost } from '../lib/engines/transaction-costs'

describe('transaction costs', () => {
  it('defaults to $25 per trade', () => {
    const s = normaliseTransactionCosts(null)
    expect(tradeCost(100_000, s)).toBe(25)
    expect(describeTransactionCost(s)).toBe('$25 per trade')
  })
  it('applies a percentage with a minimum, plus GST', () => {
    const s = normaliseTransactionCosts({ mode: 'percent', percent: 1, minimum: 50, addGst: true })
    expect(tradeCost(20_000, s)).toBeCloseTo(220, 6) // 1% = $200 + GST
    expect(tradeCost(-2_000, s)).toBeCloseTo(55, 6) // 1% = $20 -> $50 minimum + GST
    expect(describeTransactionCost(s)).toBe('1.00% + GST, minimum $50 per trade')
  })
  it('flat cost can carry GST', () => {
    expect(tradeCost(5_000, normaliseTransactionCosts({ mode: 'flat', flat: 30, addGst: true }))).toBeCloseTo(33, 6)
  })
})
