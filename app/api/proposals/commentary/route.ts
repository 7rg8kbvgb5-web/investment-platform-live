import Anthropic from '@anthropic-ai/sdk'
import { describeAiError } from '../../../../lib/ai-errors'
import { getSignedInAdviser } from '../../../../lib/adviser-identity'
import { fetchHouseViews, houseViewSentence } from '../../../../lib/engines/house-view'
import {
  fetchCommentary,
  saveCommentary,
  type CommentaryItem,
  type CommentaryKind,
} from '../../../../lib/engines/security-commentary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// GET  ?codes=A,B      saved commentary for those codes
// POST {action:'save', entries:[{code,kind,text}]}  save adviser-approved text
// POST {action:'draft', items: CommentaryItem[]}     AI drafts for the adviser to review (not saved)

export async function GET(request: Request) {
  try {
    const codes = (new URL(request.url).searchParams.get('codes') ?? '').split(',').filter(Boolean)
    return Response.json({ ok: true, commentary: await fetchCommentary(codes) })
  } catch (error) {
    return Response.json({ ok: false, error: describeAiError(error, 'Unknown error') }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (body?.action === 'save') {
      const entries = (Array.isArray(body.entries) ? body.entries : []).filter(
        (e: { code?: unknown; kind?: unknown; text?: unknown }) =>
          typeof e?.code === 'string' && ['buy', 'sell', 'exposure'].includes(e?.kind as string) && typeof e?.text === 'string',
      ) as { code: string; kind: CommentaryKind; text: string }[]
      const adviser = await getSignedInAdviser()
      await saveCommentary(entries, adviser.firstName ?? adviser.email)
      return Response.json({ ok: true })
    }
    if (body?.action === 'draft') {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 30) as CommentaryItem[]
      if (items.length === 0) return Response.json({ ok: true, drafts: {} })
      return Response.json({ ok: true, drafts: await draft(items) })
    }
    return Response.json({ ok: false, error: 'Unknown action.' }, { status: 400 })
  } catch (error) {
    return Response.json({ ok: false, error: describeAiError(error, 'Unknown error') }, { status: 500 })
  }
}

const SYSTEM = `You write short client-facing commentary for an Ord Minnett private wealth investment proposal, read by affluent Australian investors.

For each item write:
- kind "buy": 1-2 sentences (max 45 words) on why we recommend buying this new position - what it is, the role it plays in the portfolio, and the investment case.
- kind "sell": 1-2 sentences (max 45 words) on why we recommend selling it outright - e.g. it sits outside our house model, a better-quality alternative, concentration, or the research view.
- kind "exposure": ONE sentence (max 25 words) on the exposure this ETF or fund gives the portfolio (what it holds / tracks / invests in and why that helps).

Rules:
- Use the facts provided. You may use web search to confirm what a fund or company does and what an ETF tracks; never invent figures, returns, fees or ratings.
- If an Ord Minnett research view is provided, you may refer to it (e.g. "Ord Minnett rates it a Buy"). Don't quote price targets or percentages unless given.
- Calm, confident, plain English. Australian spelling. No hype, no guarantees, no "we're excited". Don't start with the security name or code; don't repeat the word "recommend" in every line.
- Write as the adviser team ("we").

Respond ONLY with a JSON object mapping "CODE:kind" to the text, e.g. {"VAS:exposure": "...", "XYZ:sell": "..."}.`

async function draft(items: CommentaryItem[]): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.')

  const views = await fetchHouseViews(items.map((i) => i.code)).catch(() => new Map())
  const lines = items.map((i) => {
    const v = views.get(i.code)
    return [
      `- ${i.code}:${i.kind} | ${i.name} | asset class: ${i.assetClass}`,
      i.fundType ? ` | ${i.fundType}` : '',
      i.context ? ` | platform notes: ${i.context}` : '',
      v ? ` | research: ${houseViewSentence(v)}` : '',
    ].join('')
  })

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: 'user', content: `Write commentary for these items:\n${lines.join('\n')}` }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: Math.min(8, items.length + 2) }],
  })
  const texts = response.content.filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
  const raw = texts.length ? texts[texts.length - 1].text : ''
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first === -1 || last <= first) throw new Error('Could not read the drafted commentary - try again.')
  const parsed = JSON.parse(raw.slice(first, last + 1)) as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const i of items) {
    const key = `${i.code}:${i.kind}`
    const text = parsed[key]
    if (typeof text === 'string' && text.trim()) out[key] = text.trim()
  }
  return out
}
