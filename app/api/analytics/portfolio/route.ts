import { describeAiError } from '../../../../lib/ai-errors'
import { getPortfolioAnalytics } from '../../../../lib/engines/portfolio-analytics'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  try {
    const analytics = await getPortfolioAnalytics()
    return Response.json({ ok: true, analytics })
  } catch (error) {
    console.error('Failed to load portfolio analytics:', error)
    return Response.json(
      { ok: false, error: describeAiError(error, 'Unknown error') },
      { status: 500 },
    )
  }
}
