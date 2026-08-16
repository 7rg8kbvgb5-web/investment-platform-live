import { runInvestmentMonitoringScan } from '../../../../lib/engines/investment-monitoring'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST() {
  try {
    const alerts = await runInvestmentMonitoringScan()
    return Response.json({ ok: true, alerts })
  } catch (error) {
    console.error('Investment monitoring scan failed:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
