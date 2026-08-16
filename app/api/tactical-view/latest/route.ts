import { getLatestTacticalAssetClassView } from '../../../../lib/engines/tactical-asset-view'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const view = await getLatestTacticalAssetClassView()
    return Response.json({ ok: true, view })
  } catch (error) {
    console.error('Failed to load tactical asset class view:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
