import { describeAiError } from '../../../../lib/ai-errors'
import { runTacticalAssetClassScan } from '../../../../lib/engines/tactical-asset-view'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST() {
  try {
    const view = await runTacticalAssetClassScan()
    return Response.json({ ok: true, view })
  } catch (error) {
    console.error('Tactical asset class scan failed:', error)
    return Response.json(
      { ok: false, error: describeAiError(error, 'Unknown error') },
      { status: 500 },
    )
  }
}
