import { cookies } from 'next/headers'
import { describeAiError } from '../../../../lib/ai-errors'
import { MODEL_COOKIE } from '../../../../lib/model-context'
import { classifyMissingSectors } from '../../../../lib/engines/sector-classify'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Fills in the sector for every holding in the selected model that has none. */
export async function POST() {
  try {
    const modelId = (await cookies()).get(MODEL_COOKIE)?.value ?? null
    const result = await classifyMissingSectors(modelId)
    return Response.json({ ok: true, ...result })
  } catch (error) {
    console.error('Sector classification failed:', error)
    return Response.json({ ok: false, error: describeAiError(error, 'Sector classification failed.') }, { status: 500 })
  }
}
