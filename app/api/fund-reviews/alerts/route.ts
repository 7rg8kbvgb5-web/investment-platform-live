import { updateFundReviewAlertStatus, type FundReviewStatus } from '../../../../lib/engines/fund-review'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const id = typeof body?.id === 'string' ? body.id : ''
    const status = body?.status as FundReviewStatus
    if (!id || !['new', 'reviewed', 'dismissed'].includes(status)) {
      return Response.json({ ok: false, error: 'Invalid id or status.' }, { status: 400 })
    }
    await updateFundReviewAlertStatus(id, status)
    return Response.json({ ok: true })
  } catch (error) {
    console.error('Failed to update fund review alert:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
