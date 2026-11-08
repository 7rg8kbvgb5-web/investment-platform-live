import { describeAiError } from '../../../../lib/ai-errors'
import { recordDecision } from '../../../../lib/engines/investment-committee-decisions'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const id = typeof body?.id === 'string' ? body.id : ''
    const status = body?.status
    if (!id || !['approved', 'rejected', 'deferred'].includes(status)) {
      return Response.json({ ok: false, error: 'Invalid id or decision.' }, { status: 400 })
    }
    const decision = await recordDecision({
      id,
      status,
      rationale: typeof body?.rationale === 'string' ? body.rationale : '',
      decidedBy: typeof body?.decidedBy === 'string' ? body.decidedBy : '',
      tiltPp: typeof body?.tiltPp === 'number' ? body.tiltPp : null,
      offsetAssetClass: typeof body?.offsetAssetClass === 'string' ? body.offsetAssetClass : null,
    })
    return Response.json({ ok: true, decision })
  } catch (error) {
    console.error('Failed to record decision:', error)
    return Response.json(
      { ok: false, error: describeAiError(error, 'Unknown error') },
      { status: 500 },
    )
  }
}
