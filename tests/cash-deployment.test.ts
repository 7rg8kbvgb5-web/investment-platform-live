import { describe, expect, it } from 'vitest'
import { deployCash } from '../lib/engines/cash-deployment'
import type { ModelPortfolio } from '../lib/engines/model-portfolios'
import type { MappedHolding } from '../lib/engines/client-holdings-mapping'

const model: ModelPortfolio = {
  riskProfile: 'Balanced',
  objective: '',
  growthWeight: 60,
  defensiveWeight: 40,
  assetClasses: [
    { name: 'Australian Equities', type: 'Growth', targetWeight: 60, description: '', holdings: [
      { code: 'AAA', name: 'A', weight: 30, rationale: '' },
      { code: 'BBB', name: 'B', weight: 30, rationale: '' },
    ] },
    { name: 'Cash', type: 'Defensive', targetWeight: 40, description: '', holdings: [{ code: 'CASH', name: 'Cash', weight: 40, rationale: '' }] },
  ],
}

const held = (code: string, value: number, assetClass: string): MappedHolding => ({
  code, value, weight: 0, sector: '', assetClass, assetClassType: 'Growth', mapped: true, inSecurityMaster: true,
})

describe('cash deployment', () => {
  it('new money is invested at model weights in full', () => {
    const r = deployCash({ model, cashAmount: 100_000, mappedHoldings: [], existingPortfolioValue: 0 })
    expect(r.mode).toBe('new-money')
    expect(r.lines.map((l) => l.investValue)).toEqual([30_000, 30_000, 40_000])
    expect(r.totalInvested).toBe(100_000)
    expect(r.residualCash).toBe(0)
  })

  it('a top-up fills the gaps first', () => {
    // Existing $100k all in AAA. Adding $100k -> $200k total; targets AAA 60k, BBB 60k, CASH 80k.
    const r = deployCash({ model, cashAmount: 100_000, mappedHoldings: [held('AAA', 100_000, 'Australian Equities')], existingPortfolioValue: 100_000 })
    expect(r.mode).toBe('top-up')
    const byCode = Object.fromEntries(r.lines.map((l) => [l.code, l.investValue]))
    expect(byCode.AAA).toBe(0) // already over target - never sold, never topped up
    expect(byCode.BBB + byCode.CASH).toBe(100_000)
    expect(byCode.CASH / byCode.BBB).toBeCloseTo(80 / 60, 6) // gaps shared in proportion
    expect(r.underweightsRemain).toBe(true)
  })

  it('rounds to whole units when priced, leaving the remainder in cash', () => {
    const r = deployCash({ model, cashAmount: 10_000, mappedHoldings: [], existingPortfolioValue: 0, prices: { AAA: 7, BBB: 11 } })
    const a = r.lines.find((l) => l.code === 'AAA')!
    expect(a.units).toBe(Math.floor(3_000 / 7))
    expect(a.investValue).toBe(a.units! * 7)
    expect(r.totalInvested + r.residualCash).toBeCloseTo(10_000, 2)
  })
})
