import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../supabase'
import { ASSET_CLASSES } from './model-portfolio-core'

const TABLE = 'tactical_asset_class_view'

export type TacticalStance = 'OW' | 'N' | 'UW'

export type AssetClassCall = {
  assetClass: string
  stance: TacticalStance
  rationale: string
}

export type TacticalAssetClassView = {
  id: string
  calls: AssetClassCall[]
  generatedAt: string
}

type RawCall = {
  assetClass?: string
  stance?: string
  rationale?: string
}

// A market-level tactical read, not the house's own portfolio
// positioning - "is Australian Equities looking rich/cheap/fairly valued
// right now given current conditions", not "are we overweight it in the
// model". Sits above the strategic (target) weights already shown on
// the Risk Profile tab as a live macro overlay.
const SYSTEM_PROMPT = `You are a tactical asset allocation assistant for Ord Minnett private wealth advisers.
Given a list of global asset classes, use web search to read current macro and market conditions (interest
rate outlook, growth/inflation trajectory, valuations, credit spreads, commodity moves, geopolitical
developments) and call a tactical stance for each one:
- OW (Overweight) - conditions currently favour tilting more into this asset class than a neutral strategic
  weight would suggest
- N (Neutral) - no strong current case either way
- UW (Underweight) - conditions currently argue for tilting less into this asset class than neutral

This is a market-level view only - NOT a comment on what Ord Minnett's own model portfolio currently holds.
Never reference the house's own positioning; this call is about market conditions.

After searching, your FINAL message must contain ONLY a JSON object and nothing else - no markdown fences,
no preamble, no commentary before or after it. Respond with exactly this shape:
{
  "calls": [{ "assetClass": string, "stance": "OW"|"N"|"UW", "rationale": string }]
}
"rationale" must be one short sentence (under 20 words) giving the specific current reason for that stance -
never a generic statement. Include exactly one entry per asset class given, in the same order.`

function extractJsonObject(text: string): string {
  const withoutFences = text.replace(/```json|```/g, '').trim()
  const firstBrace = withoutFences.indexOf('{')
  const lastBrace = withoutFences.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return withoutFences
  return withoutFences.slice(firstBrace, lastBrace + 1)
}

export async function runTacticalAssetClassScan(): Promise<TacticalAssetClassView> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.')
  }

  const assetClassNames = ASSET_CLASSES.map((ac) => ac.name)
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Asset classes: ${assetClassNames.join(', ')}. Run the tactical read and return the JSON.`,
      },
    ],
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  })

  const textBlocks = response.content.filter(
    (block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text',
  )
  const rawText = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '{}'
  const cleaned = extractJsonObject(rawText)

  let parsed: { calls?: RawCall[] }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = { calls: [] }
  }

  const calls: AssetClassCall[] = (parsed.calls ?? [])
    .filter((c) => c.assetClass && c.rationale && (c.stance === 'OW' || c.stance === 'N' || c.stance === 'UW'))
    .map((c) => ({
      assetClass: c.assetClass as string,
      stance: c.stance as TacticalStance,
      rationale: c.rationale as string,
    }))

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ asset_class_calls: calls, raw_model_output: rawText })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to save tactical asset class view: ${error.message}`)
  }

  return {
    id: data.id,
    calls: data.asset_class_calls ?? [],
    generatedAt: data.generated_at,
  }
}

export async function getLatestTacticalAssetClassView(): Promise<TacticalAssetClassView | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load tactical asset class view: ${error.message}`)
  }
  if (!data) return null

  return {
    id: data.id,
    calls: data.asset_class_calls ?? [],
    generatedAt: data.generated_at,
  }
}
