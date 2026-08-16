import { NextRequest } from 'next/server'
import { runInvestmentMonitoringScan } from '../../../../lib/engines/investment-monitoring'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  try {
    const alerts = await runInvestmentMonitoringScan()
    return Response.json({ ok: true, alerts })
  } catch (error) {
    console.error('Investment monitoring cron scan failed:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
