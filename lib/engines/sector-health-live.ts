import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../supabase'
import { fetchCoreSecurities } from './model-portfolio-core'
import { calculateSectorHealthScore, type SectorHealthScore } from './sector-intelligence'

const TABLE = 'sector_health_scores'

export type LiveSectorHealthScore = SectorHealthScore & {
  id: string
  scanId: string
  rationale: string | null
  generatedAt: string
}

type RawSectorScore = {
  sector?: string
  earningsRevisionMomentum?: number
  earningsBreadth?: number
  relativeStrength?: number
  valuationOpportunity?: number
  houseViewOverlay?: number
  rationale?: string
}

const SYSTEM_PROMPT = `You are a sector research assistant for Ord Minnett private wealth advisers.
Given a list of GICS-style sectors actually represented in the house model portfolio, use web search to
score each sector (0-100 for each dimension) on:
- earningsRevisionMomentum: are analyst earnings estimates for this sector being revised up or down recently
- earningsBreadth: how broad-based is earnings strength across companies in the sector (not just a few names)
- relativeStrength: recent price performance relative to the broader market
- valuationOpportunity: how attractive current valuations look relative to history/peers (higher = cheaper/more attractive)
- houseViewOverlay: broad sell-side/market consensus stance on the sector right now

Base every score on what you can actually find via search for that specific sector right now - do not
default to a generic mid-range score. Give a one-sentence rationale per sector citing the specific reason
for the scores.

After searching, your FINAL message must contain ONLY a JSON object and nothing else - no markdown
fences, no preamble, no commentary before or after it. Respond with exactly this shape:
{
  "sectors": [{ "sector": string, "earningsRevisionMomentum": number, "earningsBreadth": number, "relativeStrength": number, "valuationOpportunity": number, "houseViewOverlay": number, "rationale": string }]
}
Include exactly one entry per sector given, in the same order.`

function extractJsonObject(text: string): string {
  const withoutFences = text.replace(/```json|```/g, '').trim()
  const firstBrace = withoutFences.indexOf('{')
  const lastBrace = withoutFences.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return withoutFences
  return withoutFences.slice(firstBrace, lastBrace + 1)
}

/** Distinct sectors actually represented among the live model portfolio's holdings. */
export async function getSectorsHeld(): Promise<string[]> {
  const securities = await fetchCoreSecurities()
  const sectors = new Set<string>()
  for (const s of securities) {
    sectors.add(s.sector ?? s.assetClass)
  }
  return Array.from(sectors)
}

function mapRow(row: {
  id: string
  scan_id: string
  sector: string
  earnings_revision_momentum: number
  earnings_breadth: number
  relative_strength: number
  valuation_opportunity: number
  house_view_overlay: number
  total_score: number
  recommendation: SectorHealthScore['recommendation']
  rationale: string | null
  generated_at: string
}): LiveSectorHealthScore {
  return {
    id: row.id,
    scanId: row.scan_id,
    sector: row.sector,
    earningsRevisionMomentum: Number(row.earnings_revision_momentum),
    earningsBreadth: Number(row.earnings_breadth),
    relativeStrength: Number(row.relative_strength),
    valuationOpportunity: Number(row.valuation_opportunity),
    houseViewOverlay: Number(row.house_view_overlay),
    totalScore: Number(row.total_score),
    recommendation: row.recommendation,
    rationale: row.rationale,
    generatedAt: row.generated_at,
  }
}

export async function runSectorHealthScan(): Promise<LiveSectorHealthScore[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.')
  }

  const sectors = await getSectorsHeld()
  if (sectors.length === 0) {
    throw new Error('The model portfolio has no securities yet - add some on the Model Portfolio tab first.')
  }

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Sectors currently held in the model portfolio: ${sectors.join(', ')}. Run the scan and return the JSON.`,
      },
    ],
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  })

  const textBlocks = response.content.filter(
    (block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text',
  )
  const rawText = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '{}'
  const cleaned = extractJsonObject(rawText)

  let parsed: { sectors?: RawSectorScore[] }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = { sectors: [] }
  }

  const scanId = crypto.randomUUID()
  const rows: Record<string, unknown>[] = []

  for (const raw of parsed.sectors ?? []) {
    if (!raw.sector) continue
    const clamp = (v: number | undefined) => Math.min(100, Math.max(0, v ?? 50))
    const scored = calculateSectorHealthScore(
      raw.sector,
      clamp(raw.earningsRevisionMomentum),
      clamp(raw.earningsBreadth),
      clamp(raw.relativeStrength),
      clamp(raw.valuationOpportunity),
      clamp(raw.houseViewOverlay),
    )
    rows.push({
      scan_id: scanId,
      sector: scored.sector,
      earnings_revision_momentum: scored.earningsRevisionMomentum,
      earnings_breadth: scored.earningsBreadth,
      relative_strength: scored.relativeStrength,
      valuation_opportunity: scored.valuationOpportunity,
      house_view_overlay: scored.houseViewOverlay,
      total_score: scored.totalScore,
      recommendation: scored.recommendation,
      rationale: raw.rationale ?? null,
    })
  }

  if (rows.length === 0) return []

  const { data, error } = await supabase.from(TABLE).insert(rows).select('*')
  if (error) {
    throw new Error(`Failed to save sector health scores: ${error.message}`)
  }

  return (data ?? []).map(mapRow).sort((a, b) => b.totalScore - a.totalScore)
}

export async function getLatestSectorHealthScores(): Promise<LiveSectorHealthScore[]> {
  const { data: latest, error: latestError } = await supabase
    .from(TABLE)
    .select('scan_id')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    throw new Error(`Failed to load sector health scores: ${latestError.message}`)
  }
  if (!latest) return []

  const { data, error } = await supabase.from(TABLE).select('*').eq('scan_id', latest.scan_id)

  if (error) {
    throw new Error(`Failed to load sector health scores: ${error.message}`)
  }

  return (data ?? []).map(mapRow).sort((a, b) => b.totalScore - a.totalScore)
}
