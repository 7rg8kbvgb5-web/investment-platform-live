import { describe, expect, it } from 'vitest'
import { exclusionStatus, exclusionWarning, type ExclusionCheck } from '../lib/engines/exclusions-check'

const check = (over: Partial<ExclusionCheck> = {}): ExclusionCheck => ({
  checkedAt: '2026-11-12T00:00:00Z',
  constraints: 'No fossil fuels',
  exclusions: ['fossil fuels'],
  codes: ['CBA', 'WDS'],
  conflicts: [{ code: 'WDS', name: 'Woodside', exclusion: 'fossil fuels', reason: 'Oil and gas producer.', severity: 'conflict' }],
  ...over,
})

describe('exclusions check status', () => {
  it('nothing to do without constraints', () => {
    expect(exclusionStatus('', null, ['CBA']).state).toBe('no-constraints')
    expect(exclusionWarning(exclusionStatus('  ', null, ['CBA']))).toBeNull()
  })
  it('asks for a check when constraints exist but none has run', () => {
    const s = exclusionStatus('No fossil fuels', null, ['CBA'])
    expect(s.state).toBe('not-run')
    expect(exclusionWarning(s)).toMatch(/run the exclusions check/)
  })
  it('goes stale when the constraints change', () => {
    expect(exclusionStatus('No fossil fuels or gambling', check(), ['CBA', 'WDS']).state).toBe('stale')
  })
  it('goes stale when a new holding appears', () => {
    const s = exclusionStatus('No fossil fuels', check(), ['CBA', 'WDS', 'BHP'])
    expect(s.state).toBe('stale')
    expect(exclusionWarning(s)).toMatch(/BHP/)
  })
  it('reports conflicts still in the portfolio', () => {
    const s = exclusionStatus('No fossil fuels', check(), ['CBA', 'WDS'])
    expect(s.state).toBe('conflicts')
    expect(exclusionWarning(s)).toMatch(/WDS/)
  })
  it('is clear once the conflicting holding is removed', () => {
    expect(exclusionStatus('No fossil fuels', check(), ['CBA']).state).toBe('clear')
  })
  it('ignores code case and whitespace', () => {
    expect(exclusionStatus('No fossil fuels', check(), [' cba ']).state).toBe('clear')
  })
})
