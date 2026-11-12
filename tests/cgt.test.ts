import { describe, expect, it } from 'vitest'
import { calculateCgt, DEFAULT_CGT_SETTINGS, type CgtSettings } from '../lib/tax/cgt'
import { DEFAULT_TAX_REFERENCE as REF } from '../lib/tax/tax-reference'

const settings = (over: Partial<CgtSettings>): CgtSettings => ({ ...DEFAULT_CGT_SETTINGS, ...over })

describe('capital gains tax estimate', () => {
  it('applies the 50% discount for an individual held over 12 months', () => {
    const r = calculateCgt(
      [{ code: 'AAA', name: 'A', proceeds: 150_000, holdingValue: 150_000 }],
      settings({ marginalRate: 0.45, includeMedicare: true, holdings: { AAA: { costBase: 50_000, over12Months: true } } }),
      REF,
    )
    expect(r.grossGains).toBe(100_000)
    expect(r.discountApplied).toBe(50_000)
    expect(r.netCapitalGain).toBe(50_000)
    expect(r.estimatedTax).toBeCloseTo(50_000 * 0.47, 2)
  })

  it('gives no discount inside 12 months', () => {
    const r = calculateCgt(
      [{ code: 'AAA', name: 'A', proceeds: 150_000, holdingValue: 150_000 }],
      settings({ holdings: { AAA: { costBase: 50_000, over12Months: false } } }),
      REF,
    )
    expect(r.discountApplied).toBe(0)
    expect(r.netCapitalGain).toBe(100_000)
  })

  it('apportions the cost base on a partial sale', () => {
    const r = calculateCgt(
      [{ code: 'AAA', name: 'A', proceeds: 50_000, holdingValue: 200_000 }],
      settings({ holdings: { AAA: { costBase: 100_000, over12Months: true } } }),
      REF,
    )
    expect(r.lines[0].costBaseApplied).toBe(25_000)
    expect(r.lines[0].gain).toBe(25_000)
  })

  it('companies pay 30% with no discount', () => {
    const r = calculateCgt(
      [{ code: 'AAA', name: 'A', proceeds: 150_000, holdingValue: 150_000 }],
      settings({ entityType: 'company', holdings: { AAA: { costBase: 50_000, over12Months: true } } }),
      REF,
    )
    expect(r.netCapitalGain).toBe(100_000)
    expect(r.estimatedTax).toBe(30_000)
  })

  it('SMSF in accumulation gets a one-third discount and 15% tax', () => {
    const r = calculateCgt(
      [{ code: 'AAA', name: 'A', proceeds: 130_000, holdingValue: 130_000 }],
      settings({ entityType: 'smsf_accumulation', holdings: { AAA: { costBase: 100_000, over12Months: true } } }),
      REF,
    )
    expect(r.netCapitalGain).toBeCloseTo(20_000, 2)
    expect(r.estimatedTax).toBeCloseTo(3_000, 2)
  })

  it('offsets losses against non-discountable gains first, then carries the rest forward', () => {
    const r = calculateCgt(
      [
        { code: 'GAIN', name: 'Long', proceeds: 120_000, holdingValue: 120_000 },
        { code: 'SHORT', name: 'Short', proceeds: 30_000, holdingValue: 30_000 },
        { code: 'LOSS', name: 'Loss', proceeds: 10_000, holdingValue: 10_000 },
      ],
      settings({
        carryForwardLosses: 5_000,
        holdings: {
          GAIN: { costBase: 100_000, over12Months: true }, // +20,000 discountable
          SHORT: { costBase: 20_000, over12Months: false }, // +10,000 not discountable
          LOSS: { costBase: 30_000, over12Months: true }, // -20,000
        },
      }),
      REF,
    )
    // Loss pool 25,000: absorbs 10,000 short gain, then 15,000 of the 20,000 long gain; 5,000 left, discounted to 2,500.
    expect(r.currentYearLosses).toBe(20_000)
    expect(r.carryForwardUsed).toBe(5_000)
    expect(r.netCapitalGain).toBe(2_500)
    expect(r.lossesCarriedForward).toBe(0)
  })

  it('flags missing cost bases instead of guessing', () => {
    const r = calculateCgt([{ code: 'ZZZ', name: 'Z', proceeds: 10_000, holdingValue: 10_000 }], settings({}), REF)
    expect(r.missingCostBase).toEqual(['ZZZ'])
    expect(r.estimatedTax).toBe(0)
  })
})
