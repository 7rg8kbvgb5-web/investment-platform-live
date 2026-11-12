// One place to set which Claude model the platform's AI features use, and
// how many web searches each feature may run. Searches are the main driver
// of API cost, so every feature has a cap sized to what it needs.
// ANTHROPIC_MODEL in Vercel overrides the default without a code change.

export const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

export const SEARCH_LIMITS = {
  monitoring: 8,
  fundReview: 8,
  sectorHealth: 6,
  tacticalView: 6,
  weeklyBrief: 8,
  consensus: 4,
  deepDive: 10,
  securityLookup: 3,
  taxReference: 5,
  exclusions: 4,
} as const
