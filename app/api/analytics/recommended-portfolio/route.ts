import { selectedModelIdFromCookies } from '../../../../lib/model-context-server'
import { describeAiError } from '../../../../lib/ai-errors'
import { getRecommendedPortfolioAnalytics } from '../../../../lib/engines/portfolio-analytics'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  try {
    const result = await getRecommendedPortfolioAnalytics(await selectedModelIdFromCookies())
    return Response.json({ ok: true, ...result })
  } catch (error) {
    console.error('Failed to load recommended portfolio analytics:', error)
    return Response.json(
      { ok: false, error: describeAiError(error, 'Unknown error') },
      { status: 500 },
    )
  }
}
