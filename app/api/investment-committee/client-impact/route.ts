import { getClientImpact } from '../../../../lib/engines/client-impact'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const codes = Array.isArray(body?.codes) ? body.codes.filter((c: unknown) => typeof c === 'string') : []
    const impact = await getClientImpact(codes)
    return Response.json({ ok: true, impact })
  } catch (error) {
    console.error('Failed to compute client impact:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
