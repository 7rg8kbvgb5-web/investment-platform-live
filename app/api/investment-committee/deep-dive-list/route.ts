import { describeAiError } from '../../../../lib/ai-errors'
import { listDeepDiveReviews } from '../../../../lib/engines/investment-deep-dive'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const reviews = await listDeepDiveReviews()
    return Response.json({ ok: true, reviews })
  } catch (error) {
    console.error('Failed to load deep dive reviews:', error)
    return Response.json(
      { ok: false, error: describeAiError(error, 'Unknown error') },
      { status: 500 },
    )
  }
}
