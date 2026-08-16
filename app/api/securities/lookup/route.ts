import { lookupSecurity } from '../../../../lib/engines/security-lookup'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const code = typeof body?.code === 'string' ? body.code : ''
    if (!code.trim()) {
      return Response.json({ ok: false, error: 'No ticker code supplied.' }, { status: 400 })
    }

    const result = await lookupSecurity(code)
    return Response.json({ ok: true, result })
  } catch (error) {
    console.error('Security lookup failed:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
