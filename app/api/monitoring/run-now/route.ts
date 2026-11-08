import { describeAiError } from '../../../../lib/ai-errors'
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
      { ok: false, error: describeAiError(error, 'Unknown error') },
      { status: 500 },
    )
  }
}
