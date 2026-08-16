import { getLatestSectorHealthScores } from '../../../../lib/engines/sector-health-live'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const scores = await getLatestSectorHealthScores()
    return Response.json({ ok: true, scores })
  } catch (error) {
    console.error('Failed to load sector health scores:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
