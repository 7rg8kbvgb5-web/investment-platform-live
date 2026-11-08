import { describeAiError } from '../../../../lib/ai-errors'
import { downloadStoredPdf, extractJsonFromPdf } from '../../../../lib/ai/read-pdf'

export const runtime = 'nodejs'
export const maxDuration = 120

// Reads an uploaded research PDF (Ord Minnett, Barrenjoey or other) and
// returns a pre-filled record for the adviser to check before saving:
// source, document type, title, date, summary, sectors, and every
// security covered with its rating, recommendation and price target -
// flagging which are on a Top Ideas / preferred list.

const SYSTEM_PROMPT = `You read investment research documents for an Ord Minnett private wealth adviser and extract
structured data. Documents are typically from Ord Minnett or Barrenjoey research: Top Ideas / preferred lists,
company updates, sector reports, research notes, or model portfolio notes.

Extract only what the document actually says - never invent a rating, price target or security. If a field isn't
stated, use null.

- source: "Ord Minnett", "Barrenjoey", or "Other", from the branding/publisher.
- documentType: one of "Top Ideas", "Research Note", "Sector Report", "Company Update", "Model Portfolio Note", "Other".
  Use "Top Ideas" for any preferred/top picks/conviction list or "best ideas" document.
- title: the document's title.
- publishedAt: publication date as YYYY-MM-DD, or null.
- summary: two or three sentences on the document's key message, in plain English.
- sectors: the sectors it covers.
- securities: every individual security the document gives a view on. For each:
    code: the ASX code / ticker as printed (e.g. "CBA", "BHP"); for international stocks the ticker as printed
    name: company or fund name
    rating: the rating exactly as the document states it (e.g. "Buy", "Accumulate", "Hold", "Overweight", "Underweight", "Sell"), or null
    recommendation: any short action wording if different from the rating (e.g. "Upgrade to Buy"), or null
    priceTarget: numeric price target / valuation in the document's currency, or null
    isTopIdea: true if the security is on a top ideas / preferred / high conviction list in this document
    note: one short sentence on the document's view of it, or null
Do not include securities that are only mentioned in passing without a view.

Respond ONLY with a JSON object (no markdown fences, no commentary):
{"source": string, "documentType": string, "title": string, "publishedAt": string|null, "summary": string,
 "sectors": string[], "securities": [{"code": string, "name": string, "rating": string|null, "recommendation": string|null,
 "priceTarget": number|null, "isTopIdea": boolean, "note": string|null}], "warnings": string[]}
Use "warnings" for anything you're unsure about (e.g. a table that was hard to read).`

type Extracted = {
  source?: string
  documentType?: string
  title?: string
  publishedAt?: string | null
  summary?: string
  sectors?: string[]
  securities?: {
    code?: string
    name?: string
    rating?: string | null
    recommendation?: string | null
    priceTarget?: number | null
    isTopIdea?: boolean
    note?: string | null
  }[]
  warnings?: string[]
}

const SOURCES = ['Ord Minnett', 'Barrenjoey', 'Other']
const TYPES = ['Top Ideas', 'Research Note', 'Sector Report', 'Company Update', 'Model Portfolio Note', 'Other']

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const storagePath = typeof body?.storagePath === 'string' ? body.storagePath : ''
    if (!storagePath) return Response.json({ ok: false, error: 'No document provided.' }, { status: 400 })

    const base64 = await downloadStoredPdf(storagePath)
    const parsed = await extractJsonFromPdf<Extracted>({
      base64,
      system: SYSTEM_PROMPT,
      instruction: 'Extract the structured research data from this document.',
    })

    const seen = new Set<string>()
    const securities = (parsed.securities ?? [])
      .map((s) => ({
        code: (s.code ?? '').trim().toUpperCase(),
        name: s.name?.trim() || null,
        rating: s.rating?.trim() || null,
        recommendation: s.recommendation?.trim() || null,
        priceTarget: typeof s.priceTarget === 'number' && Number.isFinite(s.priceTarget) ? s.priceTarget : null,
        isTopIdea: !!s.isTopIdea,
        note: s.note?.trim() || null,
      }))
      .filter((s) => s.code && !seen.has(s.code) && (seen.add(s.code), true))

    return Response.json({
      ok: true,
      extracted: {
        source: SOURCES.includes(parsed.source ?? '') ? parsed.source : 'Other',
        documentType: TYPES.includes(parsed.documentType ?? '') ? parsed.documentType : 'Research Note',
        title: parsed.title?.trim() || null,
        publishedAt: parsed.publishedAt && /^\d{4}-\d{2}-\d{2}$/.test(parsed.publishedAt) ? parsed.publishedAt : null,
        summary: parsed.summary?.trim() || null,
        sectors: (parsed.sectors ?? []).map((s) => s.trim()).filter(Boolean),
        securities,
      },
      warnings: parsed.warnings ?? [],
    })
  } catch (error) {
    console.error('Research extraction failed:', error)
    return Response.json({ ok: false, error: describeAiError(error, 'Failed to read the document.') }, { status: 500 })
  }
}
