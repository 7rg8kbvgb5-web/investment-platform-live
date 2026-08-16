import { getLatestMonitoringAlerts } from '../../../../lib/engines/investment-monitoring'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const alerts = await getLatestMonitoringAlerts()
    return Response.json({ ok: true, alerts })
  } catch (error) {
    console.error('Failed to load monitoring alerts:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
