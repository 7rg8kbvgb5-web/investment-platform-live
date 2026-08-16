import { getLatestFundReviewAlerts } from '../../../../lib/engines/fund-review'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const alerts = await getLatestFundReviewAlerts()
    return Response.json({ ok: true, alerts })
  } catch (error) {
    console.error('Failed to load fund review alerts:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
