import { describeAiError } from '../../../../lib/ai-errors'
import { getFundsHeld } from '../../../../lib/engines/fund-review'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const funds = await getFundsHeld()
    return Response.json({ ok: true, funds })
  } catch (error) {
    console.error('Failed to load funds held:', error)
    return Response.json(
      { ok: false, error: describeAiError(error, 'Unknown error') },
      { status: 500 },
    )
  }
}
