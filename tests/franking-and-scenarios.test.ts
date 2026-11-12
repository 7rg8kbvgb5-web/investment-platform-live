import { describe, expect, it } from 'vitest'
import { frankingCredit } from '../lib/engines/yield-aggregation'
import { projectScenarios } from '../lib/pdf/proposal/insights'

describe('franking credits', () => {
  it('fully franked $700 dividend carries a $300 credit (30% company rate)', () => {
    expect(frankingCredit(700, 100)).toBeCloseTo(300, 6)
  })
  it('scales with franking level', () => {
    expect(frankingCredit(700, 50)).toBeCloseTo(150, 6)
    expect(frankingCredit(700, 0)).toBe(0)
  })
})

describe('10-year projections', () => {
  const scenarios = projectScenarios({ startValue: 1_000_000, expectedReturn: 7, feePct: 1, yieldPct: 4 })
  const base = scenarios.find((s) => s.key === 'base')!
  const low = scenarios.find((s) => s.key === 'low')!
  const high = scenarios.find((s) => s.key === 'high')!

  it('compounds at the return less fees', () => {
    expect(base.returnPct).toBe(6)
    expect(base.values[1]).toBeCloseTo(1_060_000, 2)
    expect(base.values[10]).toBeCloseTo(1_000_000 * 1.06 ** 10, 2)
  })
  it('spreads low and high two points either side', () => {
    expect(low.returnPct).toBe(4)
    expect(high.returnPct).toBe(8)
    expect(low.values[10]).toBeLessThan(base.values[10])
    expect(high.values[10]).toBeGreaterThan(base.values[10])
  })
  it('pays income on the value at the start of each year', () => {
    expect(base.income).toHaveLength(10)
    expect(base.income[0]).toBeCloseTo(40_000, 2)
    expect(base.income[1]).toBeCloseTo(1_060_000 * 0.04, 2)
  })
})
