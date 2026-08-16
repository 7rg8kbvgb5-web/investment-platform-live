import { getRecommendedPortfolioAnalytics } from '../../../../lib/engines/portfolio-analytics'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  try {
    const result = await getRecommendedPortfolioAnalytics()
    return Response.json({ ok: true, ...result })
  } catch (error) {
    console.error('Failed to load recommended portfolio analytics:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
