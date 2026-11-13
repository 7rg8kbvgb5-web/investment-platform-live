import { describe, expect, it } from 'vitest'
import { compareClientPortfolioToModel } from '../lib/engines/portfolio-review-comparison'
import { applyClientWeightOverrides } from '../lib/engines/client-weight-overrides'
import { deployCash } from '../lib/engines/cash-deployment'
import type { ModelPortfolio } from '../lib/engines/model-portfolios'
import type { MappedHolding } from '../lib/engines/client-holdings-mapping'

// End-to-end invariants for the Construction / Client Advice engine: whatever
// the adviser does (bespoke class weights, retained holdings, unit rounding,
// new cash), a full rebalance must allocate exactly the portfolio's value.

const model = {
  riskProfile: 'Growth',
  objective: '',
  growthWeight: 70,
  defensiveWeight: 30,
  assetClasses: [
    { name: 'Australian Equities', type: 'Growth', targetWeight: 35, description: '', holdings: [
      { code: 'ANZ', name: 'ANZ', weight: 11.67 }, { code: 'BHP', name: 'BHP', weight: 11.67 }, { code: 'CSL', name: 'CSL', weight: 11.66 },
    ] },
    { name: 'International Equities', type: 'Growth', targetWeight: 35, description: '', holdings: [
      { code: 'IOO', name: 'IOO', weight: 17.5 }, { code: 'QUAL', name: 'QUAL', weight: 17.5 },
    ] },
    { name: 'Australian Fixed Interest', type: 'Defensive', targetWeight: 24, description: '', holdings: [{ code: 'SUBD', name: 'SUBD', weight: 24 }] },
    { name: 'Cash', type: 'Defensive', targetWeight: 6, description: '', holdings: [{ code: 'CASH', name: 'Cash', weight: 6 }] },
  ],
} as unknown as ModelPortfolio

const h = (code: string, assetClass: string, value: number, quantity?: number, extra: Partial<MappedHolding> = {}): MappedHolding => ({
  code, name: code, weight: 0, value, quantity, sector: '', assetClass, assetClassType: 'Growth', mapped: true, inSecurityMaster: true, ...extra,
})
const existing = [
  h('BHP', 'Australian Equities', 300_000, 6000),
  h('CBA', 'Australian Equities', 400_000, 2500),
  h('WES', 'Australian Equities', 100_000, 1500, { treatment: 'retain', treatmentReason: 'Large unrealised gain' }),
  h('CASH', 'Cash', 200_000),
]
const existingValue = existing.reduce((t, x) => t + (x.value ?? 0), 0)
for (const x of existing) x.weight = ((x.value ?? 0) / existingValue) * 100
const prices = { ANZ: 39.61, BHP: 58.84, CSL: 203.11, IOO: 203.0, QUAL: 64.8, SUBD: 25.04, CBA: 165, WES: 80.81 }

const allocated = (recs: { targetValue: number | null }[]) => recs.reduce((t, r) => t + (r.targetValue ?? 0), 0)

describe('full rebalance allocates exactly the portfolio', () => {
  for (const newCash of [0, 200_000]) {
    for (const roundUnitsTo of [undefined, 10]) {
      for (const overrides of [{}, { 'Australian Equities': 30, 'Cash': 11 }]) {
        it(`cash ${newCash}, rounding ${roundUnitsTo ?? 'off'}, overrides ${Object.keys(overrides).length > 0}`, () => {
          const total = existingValue + newCash
          const m = applyClientWeightOverrides(model, overrides, {})
          const cmp = compareClientPortfolioToModel(existing, m, {
            totalPortfolioValue: total,
            currentPortfolioValue: existingValue,
            prices,
            roundUnitsTo,
          })
          expect(Math.abs(allocated(cmp.holdingRecommendations) - total)).toBeLessThan(1)
          // Retained holding is untouched; a stock outside the model is sold in full.
          const wes = cmp.holdingRecommendations.find((r) => r.code === 'WES')!
          expect(wes.action).toBe('hold')
          expect(wes.targetValue).toBe(100_000)
          const cba = cmp.holdingRecommendations.find((r) => r.code === 'CBA')!
          expect(cba.action).toBe('sell')
          expect(cba.units).toBe(-2500)
          if (roundUnitsTo) {
            for (const r of cmp.holdingRecommendations)
              if (r.price && r.units !== null && r.action !== 'sell' && Math.abs(r.units) >= 10) expect(Math.abs(r.units % 10)).toBe(0)
          }
          // Asset class targets follow the (possibly bespoke) class weights, scaled for the retained holding.
          const ae = cmp.holdingRecommendations.filter((r) => r.assetClass === 'Australian Equities' && r.code !== 'WES')
          const aeTarget = ae.reduce((t, r) => t + r.targetWeight, 0)
          const expectedAe = (overrides as Record<string, number>)['Australian Equities'] ?? 35
          expect(aeTarget).toBeCloseTo(expectedAe * (1 - 100_000 / total), 0)
        })
      }
    }
  }
})

describe('new cash only (no sells)', () => {
  it('never spends more than the new cash and sells nothing', () => {
    for (const roundUnitsTo of [undefined, 10]) {
      const r = deployCash({ model, cashAmount: 200_000, mappedHoldings: existing, existingPortfolioValue: existingValue, prices, roundUnitsTo })
      expect(r.totalInvested).toBeLessThanOrEqual(200_000)
      expect(r.residualCash).toBeGreaterThanOrEqual(0)
      expect(r.lines.every((l) => l.investValue >= 0)).toBe(true)
    }
  })
})
