import { updateMonitoringAlertStatus, type AlertStatus } from '../../../../lib/engines/investment-monitoring'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const id = typeof body?.id === 'string' ? body.id : ''
    const status = body?.status as AlertStatus
    if (!id || !['new', 'reviewed', 'dismissed'].includes(status)) {
      return Response.json({ ok: false, error: 'Invalid id or status.' }, { status: 400 })
    }
    await updateMonitoringAlertStatus(id, status)
    return Response.json({ ok: true })
  } catch (error) {
    console.error('Failed to update monitoring alert:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
