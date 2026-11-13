import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../supabase'
import { AI_MODEL } from '../ai/models'
import { resolveModelId } from '../model-context'
import { GICS_SECTORS, normaliseSector } from './sector-names'

// Fills in the sector for model holdings that don't have one. Single
// companies get their GICS sector; ETFs and managed funds get a short
// exposure label. No web search - the 11 GICS sectors for listed companies
// are stable, well-known facts, so one quick call covers the whole model.

const SYSTEM_PROMPT = `You classify securities held in an Australian private wealth model portfolio by sector.

For each security:
- A single listed company: its GICS sector, exactly one of: ${GICS_SECTORS.join(', ')}.
- An ETF, LIC or managed fund: a short exposure label instead - "Diversified" for a broad share-market fund, otherwise what it holds, e.g. "Global Equities", "Infrastructure", "Property", "Fixed Income", "Credit", "Alternatives", "Cash".
- A bond: "Fixed Income". Cash: "Cash".
If you genuinely don't recognise a security, return null for it rather than guessing.

Respond ONLY with JSON, no markdown fences: {"sectors": [{"code": string, "sector": string | null}]} - one entry per security given, same order.`

function extractJsonObject(text: string): string {
  const s = text.replace(/```json|```/g, '').trim()
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  return a === -1 || b < a ? s : s.slice(a, b + 1)
}

/** Classifies every holding in the model with no sector yet. Returns how many were filled in. */
export async function classifyMissingSectors(modelId?: string | null): Promise<{ classified: number; unknown: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.')
  const model = resolveModelId(modelId)

  const { data, error } = await supabase
    .from('model_portfolio_securities')
    .select('id, code, name, asset_class, sector, model_id')
    .eq('model_id', model)
  if (error) throw new Error(`Failed to load the model: ${error.message}`)

  const missing = ((data ?? []) as { id: string; code: string; name: string; asset_class: string; sector: string | null }[]).filter(
    (r) => !r.sector || !r.sector.trim(),
  )
  if (missing.length === 0) return { classified: 0, unknown: [] }

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: missing.map((r) => `${r.code} - ${r.name} (held as ${r.asset_class})`).join('\n'),
      },
    ],
  })
  const text = response.content.filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text').map((b) => b.text).join('')
  let parsed: { sectors?: { code?: string; sector?: string | null }[] }
  try {
    parsed = JSON.parse(extractJsonObject(text))
  } catch {
    throw new Error('The sector classification came back in an unexpected format - try again.')
  }

  const byCode = new Map((parsed.sectors ?? []).map((s) => [String(s.code ?? '').toUpperCase(), normaliseSector(s.sector)]))
  let classified = 0
  const unknown: string[] = []
  const now = new Date().toISOString()
  for (const row of missing) {
    const sector = byCode.get(row.code.toUpperCase()) ?? null
    if (!sector) {
      unknown.push(row.code)
      continue
    }
    const { error: updateError } = await supabase
      .from('model_portfolio_securities')
      .update({ sector, updated_at: now })
      .eq('id', row.id)
    if (!updateError) classified++
  }
  return { classified, unknown }
}
