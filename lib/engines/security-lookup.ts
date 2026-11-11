import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL, SEARCH_LIMITS } from '../ai/models'

/**
 * Strips exchange suffixes that aren't part of the actual ticker code
 * (e.g. Yahoo Finance-style ".AX"/".ASX", or ".AU"). The rest of the app
 * works with bare codes (a client's holding statement says "FMG", not
 * "FMG.ASX"), so anything entered with a suffix needs cleaning before it
 * goes anywhere near a lookup, a save, or the comparison engine - a
 * mismatched code here would silently break matching downstream.
 */
export function stripExchangeSuffix(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/\.(ASX|AX|AU|AXW)$/, '')
}

export type SecurityLookupResult = {
  code: string
  name: string | null
  sector: string | null
  /** Forward (estimated, current FY) distribution yield, percent (e.g. 5.2 for 5.2%). Null if not found or the security doesn't distribute. */
  yield: number | null
  /** Short note on where the yield figure came from / how current it is, for adviser judgement - not stored, display only. */
  yieldNote: string | null
  /** Expected franking level of distributions, 0-100. Null if not found. */
  frankingPct: number | null
  /** What kind of security this resolved to - drives the holding type it's added with. */
  holdingType: 'direct_equity' | 'listed_fund' | 'unlisted_fund' | 'direct_bond' | null
  /** Bonds only: the 12-character ISIN, e.g. "AU3CB0326452". */
  isin: string | null
}

/**
 * Wholesale (OTC) bonds aren't ASX tickers - they're identified by ISIN
 * ("AU3CB0326452") or a dealer short name ("AGL 5.77% Sep-35",
 * "ANZHNZ +2.95% Oct-30/Perp"). Anything that looks like either goes to the
 * bond lookup rather than the ASX one.
 */
export function looksLikeBond(input: string): boolean {
  const v = input.trim().toUpperCase()
  if (/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(v) && /\d/.test(v.slice(2, 11))) return true // ISIN
  if (/%/.test(v) || /BBSW/.test(v)) return true
  if (/\s/.test(v) && /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-?\d{2}/.test(v)) return true
  return false
}

const BOND_SYSTEM_PROMPT = `You are a fixed income data lookup assistant for Ord Minnett private wealth advisers.
You will be given an identifier for an Australian dollar wholesale (OTC) corporate bond, floating rate note or
subordinated note - either an ISIN (e.g. "AU3CB0326452") or a dealer short name (e.g. "AGL 5.77% Sep-35",
"ANZHNZ +2.95% Oct-30/Perp", "APAAU 6.772% Jul-33/56" - where a second date is the final maturity and the first the
first call date). Use web search (issuer announcements, ASX/Yieldbroker/FIIG/Bloomberg/dealer term sheets, rating
agency releases) to find:
1. shortName: the standard dealer short name in the form "<TICKER> <coupon>% <Mon-YY>" for fixed, or
   "<TICKER> +<margin>% <Mon-YY>" for floating, adding "/<Mon-YY or Perp>" for the final maturity where callable.
2. isin: the 12-character ISIN.
3. name: the full description, e.g. "AGL Energy Limited 5.770% 30-SEP-2035" or
   "Ampol Limited BBSW + 2.500% 11-DEC-2054".
4. sector: the issuer's GICS-style sector (e.g. "Utilities", "Financials", "Industrials", "Energy").
5. yield: the expected RUNNING INCOME yield over the next 12 months, as a percent - used to project client income.
   Fixed rate: the coupon rate. Floating rate: current 3-month BBSW plus the margin. Do not return yield to maturity here.
6. yieldNote: one short line an adviser can rely on - coupon type (fixed/floating), the call date and final maturity,
   the issue rating if found (e.g. "BBB"), any indicative yield to maturity found and its date, and the BBSW level assumed
   for floaters. E.g. "Fixed 5.77%; matures 30 Sep 2035; rated BBB; indicative YTM ~5.4% (Nov 2026)".
7. frankingPct: 0 for bonds and notes (interest is never franked) unless the security is in fact a franked hybrid.

This is a data lookup only - never provide investment advice or commentary beyond the requested facts.

Respond with ONLY a JSON object and nothing else - no markdown fences, no preamble:
{
  "shortName": string | null,
  "isin": string | null,
  "name": string | null,
  "sector": string | null,
  "yield": number | null,
  "yieldNote": string | null,
  "frankingPct": number | null
}
If you cannot find a field confidently, return null for it rather than guessing.`

const SYSTEM_PROMPT = `You are a market data lookup assistant for Ord Minnett private wealth advisers.
Given a single ticker code (bare ASX codes have no suffix - e.g. "FMG" not "FMG.ASX" or "FMG.AX" - if a suffix is present it has already been stripped before reaching you), use web search to find:
1. The company/fund's full legal or common trading name.
2. Its primary GICS-style sector (e.g. "Financials", "Materials", "Consumer Staples").
3. Its FORWARD (prospective/estimated) distribution or dividend yield for the current Australian financial year (FY2026/27, i.e. 1 July 2026 - 30 June 2027), as a percent. This must be forward-looking, not trailing/historical - advisers need what the investor is expected to earn over the year ahead, not what was paid last year. Prefer, in this order: (a) analyst consensus forward yield estimates for FY27 if available, (b) the company's own guidance on upcoming distributions/dividends for FY27, (c) if neither is available, the most recent trailing yield clearly flagged as such via yieldNote rather than presented as forward. Grossed-up/franked figures not required - use the plain (unfranked) forward yield most commonly quoted.
4. The expected FRANKING level of those distributions, as a percent from 0 to 100 (e.g. 100 for fully franked
   Australian bank dividends, 0 for unfranked REIT/infrastructure distributions or international securities,
   a partial figure where that's the stated or typical level). Base it on the company's or fund's most recent
   declared distributions. Return null if it genuinely can't be established.

This is a data lookup only - never provide investment advice or commentary beyond the requested facts.

After searching, respond with ONLY a JSON object and nothing else - no markdown fences, no preamble:
{
  "name": string | null,
  "sector": string | null,
  "yield": number | null,
  "yieldNote": string | null,
  "frankingPct": number | null
}
If you cannot find a field confidently, return null for it rather than guessing. yieldNote must always state whether the yield figure is forward (FY27 estimate) or trailing, and its source/timing - e.g. "FY27 consensus forward yield, as at Aug 2026" or "Trailing yield only - no FY27 estimate found" - or null if yield itself is null.`

function extractJsonObject(text: string): string {
  const withoutFences = text.replace(/```json|```/g, '').trim()
  const firstBrace = withoutFences.indexOf('{')
  const lastBrace = withoutFences.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return withoutFences
  return withoutFences.slice(firstBrace, lastBrace + 1)
}

async function lookupBond(client: Anthropic, input: string): Promise<SecurityLookupResult> {
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 2000,
    system: BOND_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Bond identifier: ${input.trim()}. Look it up and return the JSON.`,
      },
    ],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: SEARCH_LIMITS.securityLookup }],
  })

  const textBlocks = response.content.filter(
    (block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text',
  )
  const rawText = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '{}'

  let parsed: {
    shortName?: string | null
    isin?: string | null
    name?: string | null
    sector?: string | null
    yield?: number | null
    yieldNote?: string | null
    frankingPct?: number | null
  }
  try {
    parsed = JSON.parse(extractJsonObject(rawText))
  } catch {
    parsed = {}
  }

  const isin = typeof parsed.isin === 'string' && /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(parsed.isin.trim().toUpperCase())
    ? parsed.isin.trim().toUpperCase()
    : null
  const shortName = typeof parsed.shortName === 'string' && parsed.shortName.trim() ? parsed.shortName.trim() : null
  // The short name is what advisers read in lists; fall back to what was typed.
  const code = (shortName ?? input.trim()).toUpperCase()
  const noteParts = [parsed.yieldNote ?? null, isin ? `ISIN ${isin}` : null].filter(Boolean)

  return {
    code,
    name: parsed.name ?? null,
    sector: parsed.sector ?? null,
    yield: typeof parsed.yield === 'number' ? parsed.yield : null,
    yieldNote: noteParts.length > 0 ? noteParts.join(' · ') : null,
    frankingPct:
      typeof parsed.frankingPct === 'number' && parsed.frankingPct >= 0 && parsed.frankingPct <= 100
        ? parsed.frankingPct
        : 0,
    holdingType: 'direct_bond',
    isin,
  }
}

export async function lookupSecurity(code: string): Promise<SecurityLookupResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.')
  }

  const trimmedCode = stripExchangeSuffix(code)
  if (!trimmedCode) {
    throw new Error('No ticker code supplied.')
  }

  const client = new Anthropic({ apiKey })

  if (looksLikeBond(code)) {
    return lookupBond(client, code)
  }

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Ticker: ${trimmedCode}. Assume ASX-listed unless the code is clearly not an ASX code. Look it up and return the JSON.`,
      },
    ],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: SEARCH_LIMITS.securityLookup }],
  })

  const textBlocks = response.content.filter(
    (block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text',
  )
  const rawText = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '{}'
  const cleaned = extractJsonObject(rawText)

  let parsed: {
    name?: string | null
    sector?: string | null
    yield?: number | null
    yieldNote?: string | null
    frankingPct?: number | null
  }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = {}
  }

  return {
    code: trimmedCode,
    name: parsed.name ?? null,
    sector: parsed.sector ?? null,
    yield: typeof parsed.yield === 'number' ? parsed.yield : null,
    yieldNote: parsed.yieldNote ?? null,
    frankingPct:
      typeof parsed.frankingPct === 'number' && parsed.frankingPct >= 0 && parsed.frankingPct <= 100
        ? parsed.frankingPct
        : null,
    holdingType: null,
    isin: null,
  }
}
