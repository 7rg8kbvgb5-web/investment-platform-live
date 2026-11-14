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

  it('a top-up fills asset-class gaps first, then securities within the class', () => {
    // Existing $100k all in AAA. Adding $100k -> $200k total.
    // Asset classes: Aus Equities target $120k (holds $100k, gap $20k); Cash target $80k (gap $80k).
    const r = deployCash({ model, cashAmount: 100_000, mappedHoldings: [held('AAA', 100_000, 'Australian Equities')], existingPortfolioValue: 100_000 })
    expect(r.mode).toBe('top-up')
    const byCode = Object.fromEntries(r.lines.map((l) => [l.code, l.investValue]))
    expect(byCode.AAA).toBe(0) // over its own target - never sold, never topped up
    expect(byCode.BBB).toBe(20_000) // the class's whole gap goes to the unheld security
    expect(byCode.CASH).toBe(80_000)
    expect(r.totalShortfall).toBe(100_000)
    expect(r.underweightsRemain).toBe(false)
  })

  it('sends nothing to an overweight asset class, even if the client lacks some of its securities', () => {
    // Existing $100k all in AAA (Aus Equities = 100% vs 60% target). Add $20k -> $120k.
    // Aus Equities target $72k vs $100k held: overweight. BBB is unheld, but the class is over target.
    const r = deployCash({ model, cashAmount: 20_000, mappedHoldings: [held('AAA', 100_000, 'Australian Equities')], existingPortfolioValue: 100_000 })
    const byCode = Object.fromEntries(r.lines.map((l) => [l.code, l.investValue]))
    expect(byCode.AAA).toBe(0)
    expect(byCode.BBB).toBe(0)
    expect(byCode.CASH).toBe(20_000)
    expect(r.underweightsRemain).toBe(true) // Cash target $48k, so $28k of gap remains
    const ae = r.assetClasses.find((c) => c.assetClass === 'Australian Equities')!
    expect(ae.investValue).toBe(0)
  })

  it('once every asset class is at target, the surplus follows the model weights', () => {
    // $60k AAA + $60k BBB + $80k CASH = $200k, exactly on model. Add $100k.
    const r = deployCash({
      model,
      cashAmount: 100_000,
      mappedHoldings: [
        held('AAA', 60_000, 'Australian Equities'),
        held('BBB', 60_000, 'Australian Equities'),
        { ...held('CASH', 80_000, 'Cash'), assetClassType: 'Defensive' },
      ],
      existingPortfolioValue: 200_000,
    })
    expect(r.lines.map((l) => l.investValue)).toEqual([30_000, 30_000, 40_000])
  })

  it('rounds to whole units when priced, leaving the remainder in cash', () => {
    const r = deployCash({ model, cashAmount: 10_000, mappedHoldings: [], existingPortfolioValue: 0, prices: { AAA: 7, BBB: 11 } })
    const a = r.lines.find((l) => l.code === 'AAA')!
    expect(a.units).toBe(Math.floor(3_000 / 7))
    expect(a.investValue).toBe(a.units! * 7)
    expect(r.totalInvested + r.residualCash).toBeCloseTo(10_000, 2)
  })

  it("takes an adjusted line's overspend out of the model's cash allocation", () => {
    // AAA bumped from $30k to $31k of units: the extra $1k comes out of CASH, no shortfall.
    const r = deployCash({ model, cashAmount: 100_000, mappedHoldings: [], existingPortfolioValue: 0, prices: { AAA: 10, BBB: 10 }, tradeOverrides: { AAA: { units: 3_100 } } })
    const byCode = Object.fromEntries(r.lines.map((l) => [l.code, l.investValue]))
    expect(byCode.AAA).toBe(31_000)
    expect(byCode.CASH).toBe(39_000)
    expect(r.residualCash).toBe(0)
    expect(r.totalInvested).toBe(100_000)
  })

  it('only shows a shortfall once the cash allocation is used up', () => {
    const r = deployCash({ model, cashAmount: 100_000, mappedHoldings: [], existingPortfolioValue: 0, prices: { AAA: 10, BBB: 10 }, tradeOverrides: { AAA: { units: 7_500 } } })
    const byCode = Object.fromEntries(r.lines.map((l) => [l.code, l.investValue]))
    expect(byCode.CASH).toBe(0)
    expect(r.residualCash).toBe(-5_000)
  })
})
