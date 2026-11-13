import { describe, expect, it } from 'vitest'
import { normaliseSector } from '../lib/engines/sector-names'

describe('sector name normalisation', () => {
  it('maps common variants to the GICS name', () => {
    expect(normaliseSector('Healthcare')).toBe('Health Care')
    expect(normaliseSector('health care')).toBe('Health Care')
    expect(normaliseSector('Tech')).toBe('Information Technology')
    expect(normaliseSector('Telecommunications')).toBe('Communication Services')
    expect(normaliseSector('Resources')).toBe('Materials')
  })
  it('keeps fund exposure labels and treats blanks as unclassified', () => {
    expect(normaliseSector('Global Equities')).toBe('Global Equities')
    expect(normaliseSector('  ')).toBeNull()
    expect(normaliseSector(null)).toBeNull()
  })
})
