import { describe, expect, it } from 'vitest'
import { isFullyInvested, sumProfileWeights } from '../lib/engines/model-portfolio-core'

describe('risk profile allocation check', () => {
  it('sums every asset class and ignores unknown or blank entries', () => {
    expect(
      sumProfileWeights({
        'Australian Equities': 30,
        'International Equities': 25,
        'Listed Property / Infrastructure': 7.5,
        Alternatives: 7.5,
        'Australian Fixed Interest': 15,
        'Global Fixed Interest': 10,
        Cash: 5,
        'Not an asset class': 50,
      }),
    ).toBe(100)
    expect(sumProfileWeights({ 'Australian Equities': Number.NaN, Cash: 10 })).toBe(10)
  })

  it('flags over and under invested profiles', () => {
    expect(isFullyInvested(100)).toBe(true)
    expect(isFullyInvested(99.99)).toBe(true)
    expect(isFullyInvested(103)).toBe(false)
    expect(isFullyInvested(97.5)).toBe(false)
  })

  it('avoids floating-point drift when summing one-decimal weights', () => {
    expect(isFullyInvested(sumProfileWeights({ 'Australian Equities': 33.3, 'International Equities': 33.3, Cash: 33.4 }))).toBe(true)
  })
})
