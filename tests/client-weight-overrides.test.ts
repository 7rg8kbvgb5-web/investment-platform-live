import { describe, expect, it } from 'vitest'
import { applyClientWeightOverrides } from '../lib/engines/client-weight-overrides'
import type { ModelPortfolio } from '../lib/engines/model-portfolios'

const model = {
  riskProfile: 'Growth',
  objective: '',
  growthWeight: 70,
  defensiveWeight: 30,
  assetClasses: [
    { name: 'Australian Equities', type: 'Growth', targetWeight: 40, description: '', holdings: [
      { code: 'BHP', name: 'BHP', weight: 30 },
      { code: 'CBA', name: 'CBA', weight: 10 },
    ] },
    { name: 'Cash', type: 'Defensive', targetWeight: 60, description: '', holdings: [{ code: 'CASH', name: 'Cash', weight: 60 }] },
  ],
} as unknown as ModelPortfolio

describe('client asset class overrides', () => {
  it('scale the securities in the class, keeping their in-class shares', () => {
    const out = applyClientWeightOverrides(model, { 'Australian Equities': 30, Cash: 70 }, {})
    expect(out.assetClasses[0].targetWeight).toBe(30)
    expect(out.assetClasses[0].holdings.map((h) => h.weight)).toEqual([22.5, 7.5])
    expect(out.assetClasses[1].holdings[0].weight).toBe(70)
  })
  it('leave a security with its own bespoke weight as set', () => {
    const out = applyClientWeightOverrides(model, { 'Australian Equities': 20 }, { CBA: 8 })
    expect(out.assetClasses[0].holdings.map((h) => h.weight)).toEqual([15, 8])
  })
  it('leave the house model untouched with no overrides', () => {
    expect(applyClientWeightOverrides(model, {}, {})).toBe(model)
  })
})
