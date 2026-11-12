import { describe, expect, it } from 'vitest'
import { runStressTest, STRESS_SCENARIOS } from '../lib/engines/stress-test'
import { buildIncomeCalendar, paymentPattern, isDistributionLookupCode } from '../lib/engines/income-calendar'
import { ASSET_CLASSES } from '../lib/engines/model-portfolio-core'

describe('stress test', () => {
  it('covers every asset class in every scenario', () => {
    for (const sc of STRESS_SCENARIOS) for (const ac of ASSET_CLASSES) expect(sc.returns[ac.name]).toBeTypeOf('number')
  })
  it('a 100% Australian equities portfolio takes the index fall', () => {
    const r = runStressTest({ 'Australian Equities': 100 }, 1_000_000)
    expect(r[0].returnPct).toBe(-50)
    expect(r[0].change).toBe(-500_000)
  })
  it('weights the mix and normalises an incomplete total', () => {
    const half = runStressTest({ 'Australian Equities': 30, Cash: 30 }, null)
    expect(half[0].returnPct).toBeCloseTo((-50 + 7) / 2, 1)
    expect(half[0].change).toBeNull()
  })
  it('a defensive mix falls less than a growth mix in the GFC', () => {
    const growth = runStressTest({ 'Australian Equities': 50, 'International Equities': 40, 'Australian Fixed Interest': 10 }, 1)
    const defensive = runStressTest({ 'Australian Equities': 20, 'International Equities': 10, 'Australian Fixed Interest': 50, Cash: 20 }, 1)
    expect(defensive[0].returnPct).toBeGreaterThan(growth[0].returnPct)
  })
})

describe('income calendar', () => {
  const asOf = new Date('2026-11-12')
  it('reads a half-yearly payer from its payment dates', () => {
    const p = paymentPattern(
      [
        { date: '2026-02-10', paymentDate: '2026-03-28', value: 2.25 },
        { date: '2026-08-14', paymentDate: '2026-09-29', value: 2.35 },
        { date: '2025-08-14', paymentDate: '2025-09-29', value: 2.3 }, // older than 12 months - ignored
      ],
      asOf,
    )!
    expect(p[2]).toBeCloseTo(2.25 / 4.6, 6) // March
    expect(p[8]).toBeCloseTo(2.35 / 4.6, 6) // September
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
  })
  it('falls back to ex-date plus a month without a payment date', () => {
    const p = paymentPattern([{ date: '2026-05-01', paymentDate: null, value: 1 }], asOf)!
    expect(p[4] + p[5]).toBeCloseTo(1, 9) // May/June, depending on month length
  })
  it('returns null with no history', () => {
    expect(paymentPattern([], asOf)).toBeNull()
  })
  it('spreads income: known patterns, cash monthly, unknown quarterly', () => {
    const pattern = new Array(12).fill(0)
    pattern[2] = 0.5
    pattern[8] = 0.5
    const cal = buildIncomeCalendar(
      [
        { code: 'CBA', income: 1200, holdingType: 'direct_equity' },
        { code: 'CASH', income: 1200, holdingType: 'cash' },
        { code: 'FUND', income: 400, holdingType: 'unlisted_fund' },
      ],
      { CBA: pattern },
    )
    expect(cal.totalIncome).toBe(2800)
    expect(cal.months.reduce((a, m) => a + m.total, 0)).toBeCloseTo(2800, 0)
    expect(cal.months[0].label).toBe('Jul')
    const mar = cal.months.find((m) => m.label === 'Mar')!
    expect(mar.known).toBe(700) // 600 CBA + 100 cash
    expect(mar.estimated).toBe(100) // quarterly fund
    expect(cal.knownTimingPct).toBe(86)
    expect(cal.estimatedCodes).toEqual(['FUND'])
  })
  it('only looks up ticker-like codes', () => {
    expect(isDistributionLookupCode('CBA')).toBe(true)
    expect(isDistributionLookupCode('A200')).toBe(true)
    expect(isDistributionLookupCode('AU000000CBA7')).toBe(false)
    expect(isDistributionLookupCode('Direct Bonds')).toBe(false)
  })
})
