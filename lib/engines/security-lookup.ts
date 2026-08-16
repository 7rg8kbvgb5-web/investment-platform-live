import Anthropic from '@anthropic-ai/sdk'

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
}

const SYSTEM_PROMPT = `You are a market data lookup assistant for Ord Minnett private wealth advisers.
Given a single ticker code (bare ASX codes have no suffix - e.g. "FMG" not "FMG.ASX" or "FMG.AX" - if a suffix is present it has already been stripped before reaching you), use web search to find:
1. The company/fund's full legal or common trading name.
2. Its primary GICS-style sector (e.g. "Financials", "Materials", "Consumer Staples").
3. Its FORWARD (prospective/estimated) distribution or dividend yield for the current Australian financial year (FY2026/27, i.e. 1 July 2026 - 30 June 2027), as a percent. This must be forward-looking, not trailing/historical - advisers need what the investor is expected to earn over the year ahead, not what was paid last year. Prefer, in this order: (a) analyst consensus forward yield estimates for FY27 if available, (b) the company's own guidance on upcoming distributions/dividends for FY27, (c) if neither is available, the most recent trailing yield clearly flagged as such via yieldNote rather than presented as forward. Grossed-up/franked figures not required - use the plain (unfranked) forward yield most commonly quoted.

This is a data lookup only - never provide investment advice or commentary beyond the requested facts.

After searching, respond with ONLY a JSON object and nothing else - no markdown fences, no preamble:
{
  "name": string | null,
  "sector": string | null,
  "yield": number | null,
  "yieldNote": string | null
}
If you cannot find a field confidently, return null for it rather than guessing. yieldNote must always state whether the yield figure is forward (FY27 estimate) or trailing, and its source/timing - e.g. "FY27 consensus forward yield, as at Aug 2026" or "Trailing yield only - no FY27 estimate found" - or null if yield itself is null.`

function extractJsonObject(text: string): string {
  const withoutFences = text.replace(/```json|```/g, '').trim()
  const firstBrace = withoutFences.indexOf('{')
  const lastBrace = withoutFences.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return withoutFences
  return withoutFences.slice(firstBrace, lastBrace + 1)
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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Ticker: ${trimmedCode}. Assume ASX-listed unless the code is clearly not an ASX code. Look it up and return the JSON.`,
      },
    ],
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  })

  const textBlocks = response.content.filter(
    (block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text',
  )
  const rawText = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '{}'
  const cleaned = extractJsonObject(rawText)

  let parsed: { name?: string | null; sector?: string | null; yield?: number | null; yieldNote?: string | null }
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
  }
}
