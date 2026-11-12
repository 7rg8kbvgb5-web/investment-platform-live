import { normaliseCode } from './codes'

// Exclusions check: before a proposal goes out, test every recommended
// holding against what the client has said they don't want to own (the
// free-text constraints on their objectives - e.g. "no fossil fuels, no
// gambling"). The check is run by AI with web search on the Client Advice
// tab and saved inside the client's objectives (no new table), together
// with the constraints text and the holdings it covered - so a later change
// to either makes the saved result stale and it has to be run again.

export type ExclusionConflict = {
  code: string
  name: string
  /** The client exclusion it conflicts with, e.g. "fossil fuels". */
  exclusion: string
  /** One sentence: why it conflicts. */
  reason: string
  /** 'conflict' = clearly breaches; 'possible' = indirect or partial exposure worth a look. */
  severity: 'conflict' | 'possible'
}

export type ExclusionCheck = {
  checkedAt: string
  /** The constraints text checked against (trimmed). */
  constraints: string
  /** Exclusions the AI read from the constraints. Empty = none found in the text. */
  exclusions: string[]
  /** Holding codes covered by the check, normalised and sorted. */
  codes: string[]
  conflicts: ExclusionConflict[]
}

export type ExclusionStatus =
  | { state: 'no-constraints' }
  | { state: 'not-run' }
  | { state: 'stale'; check: ExclusionCheck; reason: string }
  | { state: 'no-exclusions'; check: ExclusionCheck }
  | { state: 'clear'; check: ExclusionCheck }
  | { state: 'conflicts'; check: ExclusionCheck }

export function holdingKey(codes: string[]): string[] {
  return Array.from(new Set(codes.map(normaliseCode).filter(Boolean))).sort()
}

/** Is the saved check still valid for these constraints and holdings, and what did it find? */
export function exclusionStatus(
  constraints: string | null | undefined,
  check: ExclusionCheck | null | undefined,
  holdingCodes: string[],
): ExclusionStatus {
  const text = (constraints ?? '').trim()
  if (!text) return { state: 'no-constraints' }
  if (!check) return { state: 'not-run' }
  if (check.constraints.trim() !== text) return { state: 'stale', check, reason: 'the client’s constraints have changed since it was run' }
  const now = holdingKey(holdingCodes)
  const then = holdingKey(check.codes)
  const added = now.filter((c) => !then.includes(c))
  if (added.length > 0) return { state: 'stale', check, reason: `new holding${added.length === 1 ? '' : 's'} not yet checked: ${added.join(', ')}` }
  if (check.exclusions.length === 0) return { state: 'no-exclusions', check }
  const relevant = check.conflicts.filter((c) => now.includes(normaliseCode(c.code)))
  if (relevant.length > 0) return { state: 'conflicts', check: { ...check, conflicts: relevant } }
  return { state: 'clear', check }
}

/** Adviser warning for Client Advice, or null when there's nothing to say. */
export function exclusionWarning(status: ExclusionStatus): string | null {
  switch (status.state) {
    case 'not-run':
      return 'The client has stated constraints, but the recommended holdings haven’t been checked against them - run the exclusions check before presenting.'
    case 'stale':
      return `Exclusions check needs re-running: ${status.reason}.`
    case 'conflicts': {
      const firm = status.check.conflicts.filter((c) => c.severity === 'conflict')
      const list = status.check.conflicts.map((c) => `${c.code} (${c.exclusion})`).join(', ')
      return firm.length > 0
        ? `Exclusions check: ${firm.length} recommended holding(s) conflict with the client’s exclusions - ${list}.`
        : `Exclusions check: possible exposure to the client’s exclusions - ${list}. Review before presenting.`
    }
    default:
      return null
  }
}

export const EXCLUSIONS_SYSTEM = `You check an Australian investment portfolio against a client's stated exclusions for an Ord Minnett private wealth adviser.

You are given the client's constraints (free text - it may also mention things that are not exclusions, such as liquidity needs or holdings to keep; ignore those) and the list of recommended holdings (code, name, asset class, type).

1. Read the exclusions from the constraints - industries, activities or specific companies the client does not want to own (e.g. fossil fuels, gambling, tobacco, weapons, alcohol, a named company). If there are none, return an empty exclusions list and no conflicts.
2. For each holding, decide if it conflicts:
   - "conflict": the company's core business is in an excluded activity, or a fund's stated strategy is concentrated in it.
   - "possible": a material but partial exposure - e.g. a diversified company with a significant excluded division, or a broad index ETF/fund that holds excluded companies in meaningful weight.
   - Ignore trivial exposure. Cash and government bonds don't conflict unless the client says so.
3. Use web search only where you're unsure what a company or fund does. Never guess about a holding you don't recognise - list it in "unknown".

Respond ONLY with JSON:
{"exclusions": ["..."], "conflicts": [{"code": "...", "exclusion": "...", "reason": "one sentence", "severity": "conflict" | "possible"}], "unknown": ["CODE"]}`
