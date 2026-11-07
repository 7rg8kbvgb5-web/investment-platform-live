import { applySwapToModel } from '../../../../lib/engines/investment-committee-decisions'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return Response.json({ ok: false, error: 'Missing id.' }, { status: 400 })
    const decision = await applySwapToModel(id)
    return Response.json({ ok: true, decision })
  } catch (error) {
    console.error('Failed to apply swap to model:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
