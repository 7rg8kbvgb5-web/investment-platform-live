import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../supabase'

const TABLE = 'investment_deep_dive_reviews'

export type SubjectType = 'ipo_listed' | 'unlisted_fund' | 'other'

export type DeepDiveSection = {
  heading: string
  body: string
  /** Specific concerns/red flags within this section - empty array if none found. */
  flags: string[]
}

export type DeepDiveReview = {
  id: string
  subjectName: string
  subjectType: SubjectType
  summary: string
  sections: DeepDiveSection[]
  keyRisks: string[]
  generatedAt: string
}

type RawSection = {
  heading?: string
  body?: string
  flags?: string[]
}

// This engine only ever produces a due-diligence dossier for a human
// adviser/Investment Committee to weigh - never a recommendation to
// invest, and never a claim that the review is exhaustive or a
// substitute for formal due diligence, legal review, or a PDS/IM read.
const SYSTEM_PROMPT = `You are a due-diligence research assistant for the Ord Minnett Investment Committee,
producing a deep-dive dossier on a NEW investment being considered for the Approved List - this could be
an IPO / newly listed company, or a new unlisted fund (credit, alternatives, hedge, infrastructure, private
equity, etc). This is materially different from reviewing something already held - the point is to surface
everything a committee would want to know BEFORE deciding to bring it in.

Use web search extensively and cover, tailoring depth and which sections apply based on whether this is a
listed company/IPO or an unlisted fund:

- MANAGEMENT TEAM: key executives/portfolio managers, their tenure and track record, any past controversies,
  departures from previous roles and why, credibility of guidance/communication history.
- BOARD & GOVERNANCE: directors (or trustee/responsible entity for a fund), independence, any director with
  a history of governance issues, regulatory action, or involvement in a prior corporate failure - name
  the specific person and specific past issue if one exists, don't gesture vaguely at "some concerns".
- GEOGRAPHIC / REGIONAL EXPOSURE: which regions the business or fund's underlying exposure operates in or
  is exposed to, and what regulatory, political, or currency risk that carries.
- EARNINGS & FINANCIAL QUALITY (for a listed company) or STRATEGY & FEE STRUCTURE (for a fund): for a
  company - guidance history, any accounting red flags, one-off items propping up earnings, anything
  flagged by analysts as a concern AND anything that looks like it should be flagged but isn't yet being
  widely discussed. For a fund - the actual strategy/process, fee structure vs peers, and liquidity terms
  (redemption frequency, gates, lock-ups for alts/PE/infrastructure).
- TRACK RECORD & PAST BEHAVIOUR: prior controversies, restatements, regulatory findings, reputational
  issues - for the entity itself or its key people at previous ventures.
- MACRO CONSIDERATIONS: macro factors this specific investment is genuinely sensitive to (rates, a
  commodity price, a specific region's growth, sector-specific regulatory change) - not generic market
  commentary.

You may add further sections beyond this list if something else is clearly relevant (e.g. a competitive
moat concern, a customer concentration risk). Every section should be specific to the actual subject - do
not produce generic boilerplate. If a section genuinely has nothing notable, say so briefly rather than
padding it.

This is a research dossier only - never recommend investing or not investing, and note in your summary
that this doesn't replace a formal PDS/prospectus/IM review or legal due diligence.

After searching, your FINAL message must contain ONLY a JSON object and nothing else - no markdown
fences, no preamble, no commentary before or after it. Respond with exactly this shape:
{
  "subjectType": "ipo_listed" | "unlisted_fund" | "other",
  "summary": string,
  "sections": [{ "heading": string, "body": string, "flags": string[] }],
  "keyRisks": string[]
}
"summary" is a 3-5 sentence executive overview. "flags" within a section lists specific, named concerns
found in that section - an empty array if none. "keyRisks" is a short top-level list (3-6 items) of the
single most important things the committee should weigh, pulled from across all sections.`

function extractJsonObject(text: string): string {
  const withoutFences = text.replace(/```json|```/g, '').trim()
  const firstBrace = withoutFences.indexOf('{')
  const lastBrace = withoutFences.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return withoutFences
  return withoutFences.slice(firstBrace, lastBrace + 1)
}

function mapRow(row: {
  id: string
  subject_name: string
  subject_type: SubjectType
  summary: string
  sections: DeepDiveSection[]
  key_risks: string[]
  generated_at: string
}): DeepDiveReview {
  return {
    id: row.id,
    subjectName: row.subject_name,
    subjectType: row.subject_type,
    summary: row.summary,
    sections: row.sections ?? [],
    keyRisks: row.key_risks ?? [],
    generatedAt: row.generated_at,
  }
}

export async function runInvestmentDeepDive(
  subjectName: string,
  subjectTypeHint: SubjectType | null,
  requestedBy?: string,
): Promise<DeepDiveReview> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.')
  }
  if (!subjectName.trim()) {
    throw new Error('No investment name supplied.')
  }

  const client = new Anthropic({ apiKey })

  const hintLine = subjectTypeHint
    ? `The adviser has flagged this as: ${
        subjectTypeHint === 'ipo_listed' ? 'an IPO / newly listed company' : 'an unlisted fund'
      }.`
    : "The adviser hasn't specified the type - determine it yourself from research."

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Subject: ${subjectName.trim()}. ${hintLine} Run the deep dive and return the JSON.`,
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
    subjectType?: string
    summary?: string
    sections?: RawSection[]
    keyRisks?: string[]
  }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = {}
  }

  const subjectType: SubjectType =
    parsed.subjectType === 'ipo_listed' || parsed.subjectType === 'unlisted_fund'
      ? parsed.subjectType
      : subjectTypeHint ?? 'other'

  const sections: DeepDiveSection[] = (parsed.sections ?? [])
    .filter((s) => s.heading && s.body)
    .map((s) => ({
      heading: s.heading as string,
      body: s.body as string,
      flags: s.flags ?? [],
    }))

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      subject_name: subjectName.trim(),
      subject_type: subjectType,
      summary: parsed.summary ?? 'No summary produced.',
      sections,
      key_risks: parsed.keyRisks ?? [],
      raw_model_output: rawText,
      requested_by: requestedBy ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to save deep dive review: ${error.message}`)
  }

  return mapRow(data)
}

export async function listDeepDiveReviews(): Promise<DeepDiveReview[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(50)

  if (error) {
    throw new Error(`Failed to load deep dive reviews: ${error.message}`)
  }

  return (data ?? []).map(mapRow)
}

export async function getDeepDiveReview(id: string): Promise<DeepDiveReview | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) {
    throw new Error(`Failed to load deep dive review: ${error.message}`)
  }
  return data ? mapRow(data) : null
}
