import { runSectorHealthScan } from '../../../../lib/engines/sector-health-live'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST() {
  try {
    const scores = await runSectorHealthScan()
    return Response.json({ ok: true, scores })
  } catch (error) {
    console.error('Sector health scan failed:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
