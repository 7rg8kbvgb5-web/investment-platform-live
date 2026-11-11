import { buildSmallCapTracker } from '../../../lib/engines/small-cap-tracker'
import { selectedModelIdFromCookies } from '../../../lib/model-context-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const tracker = await buildSmallCapTracker(await selectedModelIdFromCookies())
    return Response.json({ ok: true, tracker })
  } catch (error) {
    console.error('Failed to build market tracker:', error)
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
