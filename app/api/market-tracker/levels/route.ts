import { addAdviserLevel, removeAdviserLevel } from '../../../../lib/engines/small-cap-tracker'
import { getSignedInAdviser } from '../../../../lib/adviser-identity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Add a level to watch: { level, label }. */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const level = Number(body?.level)
    const label = typeof body?.label === 'string' ? body.label.trim() : ''
    if (!Number.isFinite(level) || level <= 0) return Response.json({ ok: false, error: 'Enter a level in index points.' }, { status: 400 })
    const adviser = await getSignedInAdviser()
    await addAdviserLevel(level, label || `Level ${level}`, adviser.firstName ?? adviser.email)
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

/** Stop watching a level: ?id= */
export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return Response.json({ ok: false, error: 'Missing id.' }, { status: 400 })
    await removeAdviserLevel(id)
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
