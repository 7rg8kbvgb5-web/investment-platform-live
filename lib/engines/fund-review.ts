import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../supabase'
import { fetchCoreSecurities, type HoldingType } from './model-portfolio-core'

const TABLE = 'fund_review_alerts'

export type FundReviewCategory = 'manager' | 'performance' | 'structural' | 'alternative'
export type FundReviewSeverity = 'critical' | 'high' | 'medium' | 'low'
export type FundReviewStatus = 'new' | 'reviewed' | 'dismissed'

export type FundHeld = {
  code: string
  name: string
  assetClass: string
  holdingType: HoldingType
  inClassWeight: number
}

export type FundReviewAlert = {
  id: string
  scanId: string
  fundCode: string
  fundName: string
  holdingType: HoldingType
  category: FundReviewCategory
  severity: FundReviewSeverity
  title: string
  summary: string
  sourceNote: string | null
  status: FundReviewStatus
  generatedAt: string
  /** Only populated for category === 'alternative'. */
  suggestedAlternativeCode: string | null
  suggestedAlternativeName: string | null
}

type RawAlert = {
  fundCode?: string
  fundName?: string
  category?: string
  severity?: string
  title?: string
  summary?: string
  sourceNote?: string | null
  suggestedAlternativeCode?: string | null
  suggestedAlternativeName?: string | null
}

// This engine only ever produces adviser-facing recommendations for
// review - it never redeems, switches, or flags a fund as removed on
// its own. Any change to fund selection goes to the Investment
// Committee, same as every other monitoring engine in this platform.
const SYSTEM_PROMPT = `You are a fund due diligence assistant for Ord Minnett private wealth advisers.
You are given the actual listed and unlisted managed funds currently held in the house model portfolio.
Use web search to check each fund against three categories, drawing on standard fund due diligence practice:

1. MANAGER & TEAM - portfolio manager or CIO departures, key-person risk, ownership changes at the
   management company, notable growth in funds under management (capacity risk for the strategy).

2. PERFORMANCE & RATINGS - recent performance versus benchmark and peer group, and any ratings agency
   moves (e.g. Morningstar, Zenith, Lonsec, SQM Research upgrading or downgrading the fund).

3. STRUCTURAL & LIQUIDITY - for a LISTED fund (LIC, listed trust): NTA premium/discount level and
   direction, gearing/leverage changes, distribution sustainability, on-market liquidity. For an
   UNLISTED fund: redemption terms, any gates or freezes, changes to application/redemption frequency,
   valuation methodology concerns, fee changes, related-party issues.

4. BETTER RISK-ADJUSTED ALTERNATIVE - for a fund below, flag if a SPECIFIC, NAMED alternative fund
   (same asset class/strategy) now appears to offer a better risk-adjusted return - based on recent
   performance, fees, manager change, or ratings moves. You must name a real, specific, investable fund
   as the alternative (with its own code/ticker/APIR code) - a vague "this fund may be underperforming,
   worth reviewing" flag with no concrete replacement named is NOT acceptable for this category and
   should be omitted rather than included half-formed. This is a flag for Investment Committee review
   only - never phrase it as advice to redeem or switch, or as a completed decision.

Every alert must be specific to the actual fund named - do not invent generic commentary with no
specific tie to that fund. If nothing notable turns up for a fund in a category, simply don't include an
entry for it - do not pad with invented content.

After searching, your FINAL message must contain ONLY a JSON object and nothing else - no markdown
fences, no preamble, no commentary before or after it. Respond with exactly this shape:
{
  "alerts": [{ "fundCode": string, "fundName": string, "category": "manager"|"performance"|"structural"|"alternative", "severity": "critical"|"high"|"medium"|"low", "title": string, "summary": string, "sourceNote": string, "suggestedAlternativeCode": string, "suggestedAlternativeName": string }]
}
For "alternative" items, "suggestedAlternativeCode"/"suggestedAlternativeName" must both be filled in
with the specific named replacement fund - never leave these null or omit them for an item in that
category. Other categories should leave them out entirely.
"summary" should be 2-4 sentences: what happened, and specifically why it matters for that fund.
"sourceNote" is a short (under 15 words) plain-text note on where this came from, e.g.
"Morningstar, 10 Aug 2026" - not a URL. "severity" should reflect genuine relevance to an adviser
holding this fund for clients - critical/high only for things warranting near-term attention.`

function extractJsonObject(text: string): string {
  const withoutFences = text.replace(/```json|```/g, '').trim()
  const firstBrace = withoutFences.indexOf('{')
  const lastBrace = withoutFences.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return withoutFences
  return withoutFences.slice(firstBrace, lastBrace + 1)
}

function mapRow(row: {
  id: string
  scan_id: string
  fund_code: string
  fund_name: string
  holding_type: HoldingType
  category: FundReviewCategory
  severity: FundReviewSeverity
  title: string
  summary: string
  source_note: string | null
  status: FundReviewStatus
  generated_at: string
  suggested_alternative_code: string | null
  suggested_alternative_name: string | null
}): FundReviewAlert {
  return {
    id: row.id,
    scanId: row.scan_id,
    fundCode: row.fund_code,
    fundName: row.fund_name,
    holdingType: row.holding_type,
    category: row.category,
    severity: row.severity,
    title: row.title,
    summary: row.summary,
    sourceNote: row.source_note,
    status: row.status,
    generatedAt: row.generated_at,
    suggestedAlternativeCode: row.suggested_alternative_code,
    suggestedAlternativeName: row.suggested_alternative_name,
  }
}

/** Every fund currently held in the model portfolio - listed or unlisted only. */
export async function getFundsHeld(): Promise<FundHeld[]> {
  const securities = await fetchCoreSecurities()
  return securities
    .filter((s) => s.holdingType === 'listed_fund' || s.holdingType === 'unlisted_fund')
    .map((s) => ({
      code: s.code,
      name: s.name,
      assetClass: s.assetClass,
      holdingType: s.holdingType,
      inClassWeight: s.inClassWeight,
    }))
}

export async function runFundReviewScan(): Promise<FundReviewAlert[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.')
  }

  const funds = await getFundsHeld()
  if (funds.length === 0) {
    throw new Error(
      'No holdings are tagged as a listed or unlisted fund yet - set a holding\'s type on the Model Portfolio tab first.',
    )
  }

  const fundListing = funds
    .map((f) => `${f.code} — ${f.name} (${f.holdingType === 'listed_fund' ? 'Listed' : 'Unlisted'}, ${f.assetClass})`)
    .join('\n')

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Funds currently held:\n\n${fundListing}\n\nRun the review and produce the JSON.`,
      },
    ],
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  })

  const textBlocks = response.content.filter(
    (block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text',
  )
  const rawText = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '{}'
  const cleaned = extractJsonObject(rawText)

  let parsed: { alerts?: RawAlert[] }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = { alerts: [] }
  }

  const fundByCode = new Map(funds.map((f) => [f.code, f]))
  const scanId = crypto.randomUUID()
  const rows: Record<string, unknown>[] = []

  for (const alert of parsed.alerts ?? []) {
    if (!alert.fundCode || !alert.title || !alert.summary) continue
    const fund = fundByCode.get(alert.fundCode)
    if (!fund) continue
    const category: FundReviewCategory =
      alert.category === 'manager' ||
      alert.category === 'performance' ||
      alert.category === 'structural' ||
      alert.category === 'alternative'
        ? alert.category
        : 'performance'
    // An 'alternative' item without a named replacement doesn't meet the
    // bar - drop it rather than show a vague underperformance flag.
    if (category === 'alternative' && (!alert.suggestedAlternativeCode || !alert.suggestedAlternativeName)) {
      continue
    }
    const severity: FundReviewSeverity =
      alert.severity === 'critical' || alert.severity === 'high' || alert.severity === 'low'
        ? alert.severity
        : 'medium'
    rows.push({
      scan_id: scanId,
      fund_code: fund.code,
      fund_name: fund.name,
      holding_type: fund.holdingType,
      category,
      severity,
      title: alert.title,
      summary: alert.summary,
      source_note: alert.sourceNote ?? null,
      suggested_alternative_code: alert.suggestedAlternativeCode ?? null,
      suggested_alternative_name: alert.suggestedAlternativeName ?? null,
      raw_model_output: rawText,
    })
  }

  if (rows.length === 0) return []

  const { data, error } = await supabase.from(TABLE).insert(rows).select('*')
  if (error) {
    throw new Error(`Failed to save fund review alerts: ${error.message}`)
  }

  return (data ?? []).map(mapRow)
}

export async function getLatestFundReviewAlerts(): Promise<FundReviewAlert[]> {
  const { data: latest, error: latestError } = await supabase
    .from(TABLE)
    .select('scan_id')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    throw new Error(`Failed to load fund review alerts: ${latestError.message}`)
  }
  if (!latest) return []

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('scan_id', latest.scan_id)
    .order('severity', { ascending: true })

  if (error) {
    throw new Error(`Failed to load fund review alerts: ${error.message}`)
  }

  return (data ?? []).map(mapRow)
}

export async function updateFundReviewAlertStatus(id: string, status: FundReviewStatus): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ status }).eq('id', id)
  if (error) {
    throw new Error(`Failed to update alert status: ${error.message}`)
  }
}
