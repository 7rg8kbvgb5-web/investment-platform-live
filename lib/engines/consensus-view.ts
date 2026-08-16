import Anthropic from '@anthropic-ai/sdk'
import { stripExchangeSuffix } from './security-lookup'

export type BrokerRecommendation = {
  institution: string
  rating: string
  priceTarget: number | null
  yieldEstimate: number | null
  asOf: string | null
}

export type ConsensusView = {
  code: string
  name: string | null
  currentPrice: number | null
  recommendations: BrokerRecommendation[]
  consensusRating: string | null
  averagePriceTarget: number | null
  averageYield: number | null
  generatedAt: string
}

type RawBroker = {
  institution?: string
  rating?: string
  priceTarget?: number | null
  yieldEstimate?: number | null
  asOf?: string | null
}

// This is compiled from web search, not a licensed broker-consensus feed
// (unlike FN Arena, which licenses individual broker notes directly) - it
// is a best-effort aggregation of what's publicly findable, for an
// adviser's own reference, and should be treated accordingly.
const SYSTEM_PROMPT = `You are a research aggregation assistant for Ord Minnett private wealth advisers.
Given a single ASX ticker code, use web search to find current sell-side analyst/broker recommendations for
that company - the kind of thing FN Arena or a Bloomberg consensus page aggregates. Look for individual
broker notes or consensus summaries from sources such as Morgans, Macquarie, UBS, Citi, Morgan Stanley,
Ord Minnett, Barrenjoey, Bell Potter, Jarden, Goldman Sachs, JP Morgan, or similar - and general consensus
aggregator pages if a specific broker's own number isn't directly findable.

For each broker/institution you can find a specific recommendation for, capture:
- institution name
- rating (use whatever label that broker actually uses - Buy/Overweight/Accumulate/Hold/Neutral/
  Underweight/Sell/Reduce etc. - do not normalise to a different scale)
- price target in AUD if stated
- forward yield estimate (percent) if stated
- a short note on how current the figure is (e.g. "Aug 2026 note")

Only include a broker recommendation you found with reasonable confidence via search - do not invent or
estimate a broker's rating or price target if you couldn't actually find one. If you can find very few or
no individual broker recommendations, still return whatever you did find (even one) rather than nothing,
and be honest about limited coverage via an empty or short list - do not pad the list with invented entries.

Also try to find the company's current/recent share price for context, and provide one overall consensus
rating label (e.g. "Buy", "Hold", "Sell", or "Mixed" if brokers are split) based on the individual
recommendations found.

This is a data compilation task only - never provide personal investment advice or a recommendation of
your own beyond compiling what other institutions have published.

After searching, your FINAL message must contain ONLY a JSON object and nothing else - no markdown fences,
no preamble, no commentary before or after it. Respond with exactly this shape:
{
  "name": string | null,
  "currentPrice": number | null,
  "consensusRating": string | null,
  "recommendations": [{ "institution": string, "rating": string, "priceTarget": number | null, "yieldEstimate": number | null, "asOf": string | null }]
}`

function extractJsonObject(text: string): string {
  const withoutFences = text.replace(/```json|```/g, '').trim()
  const firstBrace = withoutFences.indexOf('{')
  const lastBrace = withoutFences.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return withoutFences
  return withoutFences.slice(firstBrace, lastBrace + 1)
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
}

export async function fetchConsensusView(code: string): Promise<ConsensusView> {
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
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Ticker: ${trimmedCode}. Assume ASX-listed unless clearly not. Compile the consensus view and return the JSON.`,
      },
    ],
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  })

  const textBlocks = response.content.filter(
    (block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text',
  )
  const rawText = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '{}'
  const cleaned = extractJsonObject(rawText)

  let parsed: {
    name?: string | null
    currentPrice?: number | null
    consensusRating?: string | null
    recommendations?: RawBroker[]
  }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = { recommendations: [] }
  }

  const recommendations: BrokerRecommendation[] = (parsed.recommendations ?? [])
    .filter((r) => r.institution && r.rating)
    .map((r) => ({
      institution: r.institution as string,
      rating: r.rating as string,
      priceTarget: typeof r.priceTarget === 'number' ? r.priceTarget : null,
      yieldEstimate: typeof r.yieldEstimate === 'number' ? r.yieldEstimate : null,
      asOf: r.asOf ?? null,
    }))

  const priceTargets = recommendations.map((r) => r.priceTarget).filter((v): v is number => v !== null)
  const yields = recommendations.map((r) => r.yieldEstimate).filter((v): v is number => v !== null)

  return {
    code: trimmedCode,
    name: parsed.name ?? null,
    currentPrice: typeof parsed.currentPrice === 'number' ? parsed.currentPrice : null,
    recommendations,
    consensusRating: parsed.consensusRating ?? null,
    averagePriceTarget: average(priceTargets),
    averageYield: average(yields),
    generatedAt: new Date().toISOString(),
  }
}
