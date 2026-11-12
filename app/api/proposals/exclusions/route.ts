import Anthropic from '@anthropic-ai/sdk'
import { describeAiError } from '../../../../lib/ai-errors'
import { AI_MODEL, SEARCH_LIMITS } from '../../../../lib/ai/models'
import { normaliseCode } from '../../../../lib/engines/codes'
import {
  EXCLUSIONS_SYSTEM,
  holdingKey,
  type ExclusionCheck,
  type ExclusionConflict,
} from '../../../../lib/engines/exclusions-check'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// POST {constraints, holdings:[{code,name,assetClass,holdingType}]}
// Checks the recommended holdings against the client's stated exclusions.
// Returns the check; the Client Advice tab saves it with the objectives.

type HoldingIn = { code: string; name: string; assetClass: string; holdingType?: string | null }

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const constraints = typeof body?.constraints === 'string' ? body.constraints.trim().slice(0, 2000) : ''
    const holdings = (Array.isArray(body?.holdings) ? body.holdings : [])
      .filter((h: Partial<HoldingIn>) => typeof h?.code === 'string' && h.code.trim())
      .slice(0, 80) as HoldingIn[]
    if (!constraints) return Response.json({ ok: false, error: 'No client constraints recorded to check against.' }, { status: 400 })
    if (holdings.length === 0) return Response.json({ ok: false, error: 'No recommended holdings to check.' }, { status: 400 })
    return Response.json({ ok: true, check: await runCheck(constraints, holdings) })
  } catch (error) {
    return Response.json({ ok: false, error: describeAiError(error, 'Unknown error') }, { status: 500 })
  }
}

async function runCheck(constraints: string, holdings: HoldingIn[]): Promise<ExclusionCheck> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.')
  const lines = holdings.map(
    (h) => `- ${normaliseCode(h.code)} | ${h.name} | ${h.assetClass}${h.holdingType ? ` | ${h.holdingType.replace('_', ' ')}` : ''}`,
  )
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 3000,
    system: EXCLUSIONS_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Client constraints:\n"""${constraints}"""\n\nRecommended holdings:\n${lines.join('\n')}`,
      },
    ],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: SEARCH_LIMITS.exclusions }],
  })
  const texts = response.content.filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
  const raw = texts.length ? texts[texts.length - 1].text : ''
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first === -1 || last <= first) throw new Error('Could not read the exclusions check - try again.')
  const parsed = JSON.parse(raw.slice(first, last + 1)) as {
    exclusions?: unknown
    conflicts?: unknown
    unknown?: unknown
  }

  const nameByCode = new Map(holdings.map((h) => [normaliseCode(h.code), h.name]))
  const exclusions = (Array.isArray(parsed.exclusions) ? parsed.exclusions : [])
    .filter((e): e is string => typeof e === 'string' && !!e.trim())
    .map((e) => e.trim())
  const conflicts: ExclusionConflict[] = []
  if (exclusions.length > 0) {
    for (const c of Array.isArray(parsed.conflicts) ? parsed.conflicts : []) {
      const code = typeof c?.code === 'string' ? normaliseCode(c.code) : ''
      if (!nameByCode.has(code)) continue
      conflicts.push({
        code,
        name: nameByCode.get(code) ?? code,
        exclusion: typeof c.exclusion === 'string' ? c.exclusion : 'stated exclusion',
        reason: typeof c.reason === 'string' ? c.reason : '',
        severity: c.severity === 'conflict' ? 'conflict' : 'possible',
      })
    }
    // Holdings the check couldn't identify are flagged for a manual look rather than passed.
    for (const u of Array.isArray(parsed.unknown) ? parsed.unknown : []) {
      const code = typeof u === 'string' ? normaliseCode(u) : ''
      if (!nameByCode.has(code) || conflicts.some((c) => c.code === code)) continue
      conflicts.push({
        code,
        name: nameByCode.get(code) ?? code,
        exclusion: 'not identified',
        reason: 'Couldn’t confirm what this holding invests in - check it manually against the client’s exclusions.',
        severity: 'possible',
      })
    }
  }
  return {
    checkedAt: new Date().toISOString(),
    constraints,
    exclusions,
    codes: holdingKey(holdings.map((h) => h.code)),
    conflicts,
  }
}
