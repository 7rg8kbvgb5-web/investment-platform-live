import { describe, expect, it } from 'vitest'
import { roundTradeUnits, type HoldingRecommendation } from '../lib/engines/portfolio-review-comparison'

const TOTAL = 1_000_000

function rec(p: Partial<HoldingRecommendation> & { code: string }): HoldingRecommendation {
  return {
    name: p.code,
    assetClass: 'Australian Equities',
    currentWeight: 0,
    targetWeight: 0,
    changeWeight: 0,
    currentValue: 0,
    targetValue: 0,
    changeValue: 0,
    price: null,
    units: null,
    action: 'hold',
    rationale: '',
    adjusted: false,
    ...p,
  } as HoldingRecommendation
}

describe('roundTradeUnits', () => {
  it('rounds buys and partial sales to 10 units, revalues them, and balances through cash', () => {
    const recs = [
      rec({ code: 'ANZ', action: 'buy', price: 40, units: 1588, changeValue: 63_520, targetValue: 63_520 }),
      rec({ code: 'BHP', action: 'reduce', price: 50, units: -1292, currentValue: 100_000, changeValue: -64_600, targetValue: 35_400 }),
      rec({ code: 'CASH', assetClass: 'Cash', action: 'reduce', currentValue: 80_000, changeValue: -20_000, targetValue: 60_000 }),
    ]
    roundTradeUnits(recs, 10, TOTAL)
    expect(recs[0].units).toBe(1590)
    expect(recs[0].changeValue).toBe(63_600)
    expect(recs[1].units).toBe(-1290)
    expect(recs[1].changeValue).toBe(-64_500)
    // ANZ +$80 more, BHP sells $100 less -> cash has $180 less.
    expect(recs[2].changeValue).toBe(-20_180)
    expect(recs[2].targetValue).toBe(59_820)
    const net = recs.reduce((s, r) => s + (r.changeValue ?? 0), 0)
    expect(net).toBeCloseTo(63_520 - 64_600 - 20_000, 2)
  })

  it('leaves full sales, adviser adjustments, tiny trades and unpriced lines exact', () => {
    const recs = [
      rec({ code: 'CBA', action: 'sell', price: 165, units: -1403, currentValue: 231_495, changeValue: -231_495 }),
      rec({ code: 'MQG', action: 'increase', price: 240, units: 7, currentValue: 10_000, changeValue: 1_680 }),
      rec({ code: 'XRO', action: 'buy', price: 77, units: 195, changeValue: 15_015, adjusted: true }),
      rec({ code: 'FUND', action: 'buy', price: null, units: null, changeValue: 30_000 }),
    ]
    const before = JSON.parse(JSON.stringify(recs))
    roundTradeUnits(recs, 10, TOTAL)
    expect(recs).toEqual(before)
  })
})

describe('balanceThroughCash', () => {
  it('absorbs small rounding into cash so the rebalance adds to 100%', async () => {
    const { balanceThroughCash } = await import('../lib/engines/portfolio-review-comparison')
    const recs = [
      rec({ code: 'A', action: 'buy', currentValue: 0, changeValue: 500_600, targetValue: 500_600 }),
      rec({ code: 'CASH', assetClass: 'Cash', action: 'reduce', currentValue: 520_000, changeValue: -20_000, targetValue: 500_000 }),
    ]
    balanceThroughCash(recs, TOTAL)
    expect(recs[1].targetValue).toBe(499_400)
    expect(recs.reduce((t, r) => t + (r.targetValue ?? 0), 0)).toBe(TOTAL)
  })
  it('leaves a real allocation gap visible', async () => {
    const { balanceThroughCash } = await import('../lib/engines/portfolio-review-comparison')
    const recs = [
      rec({ code: 'A', action: 'buy', currentValue: 0, changeValue: 480_000, targetValue: 480_000 }),
      rec({ code: 'CASH', assetClass: 'Cash', action: 'hold', currentValue: 500_000, changeValue: 0, targetValue: 500_000 }),
    ]
    balanceThroughCash(recs, TOTAL)
    expect(recs[1].targetValue).toBe(500_000)
  })
})
