import { describe, expect, it } from 'vitest'
import { displayDate, displaySecurityName } from '../lib/pdf/proposal/names'
import { internalWordingIssues } from '../lib/engines/security-commentary'

describe('proposal display helpers', () => {
  it('tidies security names', () => {
    expect(displaySecurityName('ResMed Inc. (ASX: RMD – CHESS Depositary Interests, 10 CDIs per ordinary share)')).toBe('ResMed Inc. (CDI)')
    expect(displaySecurityName('Global X Morningstar Global Technology ETF')).toBe('Global X Morningstar Global Technology ETF')
    expect(displaySecurityName('BHP Group')).toBe('BHP Group')
  })
  it('formats ISO dates', () => {
    expect(displayDate('2026-11-12')).toBe('12 November 2026')
    expect(displayDate('12 Nov 2026')).toBe('12 Nov 2026')
  })
  it('flags internal wording in client briefs', () => {
    expect(internalWordingIssues('It is not on the Approved List - we recommend reviewing this position before proceeding.').length).toBeGreaterThan(0)
    expect(internalWordingIssues('A diversified Australian industrial group with a strong earnings base.')).toEqual([])
  })
})
