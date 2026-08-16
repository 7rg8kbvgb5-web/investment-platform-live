import { runFundReviewScan } from '../../../../lib/engines/fund-review'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST() {
  try {
    const alerts = await runFundReviewScan()
    return Response.json({ ok: true, alerts })
  } catch (error) {
    console.error('Fund review scan failed:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
