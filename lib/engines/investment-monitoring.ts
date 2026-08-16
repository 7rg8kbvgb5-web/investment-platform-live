import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../supabase'
import { fetchCoreSecurities, ASSET_CLASSES } from './model-portfolio-core'

const TABLE = 'investment_monitoring_alerts'

export type AlertCategory = 'macro' | 'investment' | 'alternative'
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'
export type AlertStatus = 'new' | 'reviewed' | 'dismissed'

export type MonitoringAlert = {
  id: string
  scanId: string
  category: AlertCategory
  severity: AlertSeverity
  title: string
  summary: string
  affectedAssetClass: string | null
  affectedCodes: string[]
  sourceNote: string | null
  status: AlertStatus
  generatedAt: string
  /** Only populated for category === 'alternative'. */
  suggestedAlternativeCode: string | null
  suggestedAlternativeName: string | null
}

type RawAlert = {
  category?: string
  severity?: string
  title?: string
  summary?: string
  affectedAssetClass?: string | null
  affectedCodes?: string[]
  sourceNote?: string | null
  suggestedAlternativeCode?: string | null
  suggestedAlternativeName?: string | null
}

// This engine only ever produces adviser-facing recommendations for review
// - it never places trades, swaps holdings, or updates the model portfolio
// directly. Any flagged alternative goes to the Investment Committee before
// anything changes in a client portfolio.
const SYSTEM_PROMPT = `You are a live investment monitoring assistant for Ord Minnett private wealth advisers.
You are given the actual securities that currently make up the house model portfolio, grouped by asset class.
Use web search to scan for anything from roughly the past 7 days across three categories:

1. MACRO INFLUENCES - a macro, geopolitical, or commodity event that could materially affect one or more of
   the asset classes represented below. Examples: a sharp gold price move (relevant to Alternatives/gold
   exposure), an escalation between major oil-producing nations or a conflict in an oil-relevant region
   (relevant to energy/oil exposure), a major central bank rate decision (relevant to Fixed Interest), a
   currency shock (relevant to International Equities/Global Fixed Interest). Only include events with a
   plausible, explainable link to one of the asset classes below - state that link explicitly.

2. SPECIFIC INVESTMENT INFLUENCES - news specific to one of the actual securities listed below: a CIO or
   key portfolio manager departing a fund, a ratings agency or research house change, a major corporate
   action (M&A, capital raise, guidance downgrade), a regulatory or governance issue, or anything else that
   could specifically affect that holding's suitability or performance. Tag the specific ticker(s) involved.

3. BETTER RISK-ADJUSTED ALTERNATIVES - for an asset class below, flag if a SPECIFIC, NAMED alternative
   security now appears to offer a better risk-adjusted return than what the model currently holds in that
   class, based on recent developments (performance, fees, manager change, sector positioning). You must
   name a real, specific, investable security as the alternative (with its own ticker) - a vague "this
   holding may be underperforming, worth reviewing" flag with no concrete replacement named is NOT
   acceptable for this category and should be omitted rather than included half-formed. Name the specific
   existing holding(s) it would replace or be compared against. This is a flag for Investment Committee
   review only - never phrase it as advice to trade or as a completed decision.

Every alert must have a plausible, well-reasoned link to one of the actual asset classes or securities
provided - do not invent generic market commentary with no specific tie to the portfolio below. If nothing
notable turns up in a category, return an empty array for it rather than inventing content.

After searching, your FINAL message must contain ONLY a JSON object and nothing else - no markdown fences,
no preamble, no commentary before or after it. Respond with exactly this shape:
{
  "macro": [{ "title": string, "summary": string, "severity": "critical"|"high"|"medium"|"low", "affectedAssetClass": string, "affectedCodes": string[], "sourceNote": string }],
  "investment": [{ "title": string, "summary": string, "severity": "critical"|"high"|"medium"|"low", "affectedAssetClass": string, "affectedCodes": string[], "sourceNote": string }],
  "alternative": [{ "title": string, "summary": string, "severity": "critical"|"high"|"medium"|"low", "affectedAssetClass": string, "affectedCodes": string[], "sourceNote": string, "suggestedAlternativeCode": string, "suggestedAlternativeName": string }]
}
For "alternative" items, "affectedCodes" must contain the existing holding(s) being compared against, and
"suggestedAlternativeCode"/"suggestedAlternativeName" must both be filled in with the specific named
replacement - never leave these null or omit them for an item in the "alternative" array.
"summary" should be 2-4 sentences: what happened, and specifically why it matters for this asset class or
security. "sourceNote" is a short (under 15 words) plain-text note on where this came from, e.g.
"Reuters, 12 Aug 2026" - not a URL. "severity" should reflect genuine portfolio relevance: critical/high
only for things that plausibly warrant near-term adviser attention, medium/low for things worth knowing but
not urgent.`

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
  category: AlertCategory
  severity: AlertSeverity
  title: string
  summary: string
  affected_asset_class: string | null
  affected_codes: string[]
  source_note: string | null
  status: AlertStatus
  generated_at: string
  suggested_alternative_code: string | null
  suggested_alternative_name: string | null
}): MonitoringAlert {
  return {
    id: row.id,
    scanId: row.scan_id,
    category: row.category,
    severity: row.severity,
    title: row.title,
    summary: row.summary,
    affectedAssetClass: row.affected_asset_class,
    affectedCodes: row.affected_codes ?? [],
    sourceNote: row.source_note,
    status: row.status,
    generatedAt: row.generated_at,
    suggestedAlternativeCode: row.suggested_alternative_code,
    suggestedAlternativeName: row.suggested_alternative_name,
  }
}

/**
 * Runs a live scan of the actual model portfolio (not a mock list) across
 * the three categories, and saves every alert produced to Supabase under
 * one shared scan_id. Returns the newly-created alerts.
 */
export async function runInvestmentMonitoringScan(): Promise<MonitoringAlert[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.')
  }

  const securities = await fetchCoreSecurities()
  if (securities.length === 0) {
    throw new Error('The model portfolio has no securities yet - add some on the Model Portfolio tab first.')
  }

  const byAssetClass = ASSET_CLASSES.map((meta) => ({
    name: meta.name,
    holdings: securities.filter((s) => s.assetClass === meta.name),
  })).filter((ac) => ac.holdings.length > 0)

  const portfolioListing = byAssetClass
    .map(
      (ac) =>
        `${ac.name}:\n` +
        ac.holdings.map((h) => `  - ${h.code} — ${h.name}${h.sector ? ` (${h.sector})` : ''}`).join('\n'),
    )
    .join('\n\n')

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Current model portfolio, by asset class:\n\n${portfolioListing}\n\nRun the scan and produce the JSON.`,
      },
    ],
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  })

  const textBlocks = response.content.filter(
    (block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text',
  )
  const rawText = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '{}'
  const cleaned = extractJsonObject(rawText)

  let parsed: { macro?: RawAlert[]; investment?: RawAlert[]; alternative?: RawAlert[] }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = { macro: [], investment: [], alternative: [] }
  }

  const scanId = crypto.randomUUID()
  const rows: Record<string, unknown>[] = []

  const categories: AlertCategory[] = ['macro', 'investment', 'alternative']
  for (const category of categories) {
    const alerts = parsed[category] ?? []
    for (const alert of alerts) {
      if (!alert.title || !alert.summary) continue
      // An 'alternative' item without a named replacement doesn't meet the
      // bar - drop it rather than show a vague underperformance flag.
      if (category === 'alternative' && (!alert.suggestedAlternativeCode || !alert.suggestedAlternativeName)) {
        continue
      }
      const severity: AlertSeverity =
        alert.severity === 'critical' || alert.severity === 'high' || alert.severity === 'low'
          ? alert.severity
          : 'medium'
      rows.push({
        scan_id: scanId,
        category,
        severity,
        title: alert.title,
        summary: alert.summary,
        affected_asset_class: alert.affectedAssetClass ?? null,
        affected_codes: alert.affectedCodes ?? [],
        source_note: alert.sourceNote ?? null,
        suggested_alternative_code: alert.suggestedAlternativeCode ?? null,
        suggested_alternative_name: alert.suggestedAlternativeName ?? null,
        raw_model_output: rawText,
      })
    }
  }

  if (rows.length === 0) {
    return []
  }

  const { data, error } = await supabase.from(TABLE).insert(rows).select('*')
  if (error) {
    throw new Error(`Failed to save monitoring alerts: ${error.message}`)
  }

  return (data ?? []).map(mapRow)
}

/** Every alert from the most recent scan run, across all three categories. */
export async function getLatestMonitoringAlerts(): Promise<MonitoringAlert[]> {
  const { data: latest, error: latestError } = await supabase
    .from(TABLE)
    .select('scan_id')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    throw new Error(`Failed to load monitoring alerts: ${latestError.message}`)
  }
  if (!latest) return []

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('scan_id', latest.scan_id)
    .order('severity', { ascending: true })

  if (error) {
    throw new Error(`Failed to load monitoring alerts: ${error.message}`)
  }

  return (data ?? []).map(mapRow)
}

export async function updateMonitoringAlertStatus(id: string, status: AlertStatus): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ status }).eq('id', id)
  if (error) {
    throw new Error(`Failed to update alert status: ${error.message}`)
  }
}
