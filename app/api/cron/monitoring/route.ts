import { NextRequest } from 'next/server'
import { runInvestmentMonitoringScan } from '../../../../lib/engines/investment-monitoring'
import { runFundReviewScan } from '../../../../lib/engines/fund-review'
import { runTacticalAssetClassScan } from '../../../../lib/engines/tactical-asset-view'
import { runSectorHealthScan } from '../../../../lib/engines/sector-health-live'
import { syncProposals } from '../../../../lib/engines/investment-committee-decisions'

export const runtime = 'nodejs'
export const maxDuration = 300

// Daily job (vercel.json). Every day: Monitoring. Then one of the slower
// scans on a weekly rotation, so each runs once a week without needing
// extra cron slots on the Vercel plan:
//   Monday    - Fund Reviews
//   Wednesday - Tactical Asset Class View
//   Friday    - Sector Health
// Finally, everything the scans raised is pulled into the Investment
// Committee queue. Each step is independent - one failing doesn't stop
// the rest.

const WEEKLY_ROTATION: Record<string, { name: string; run: () => Promise<unknown> }> = {
  Mon: { name: 'fund-reviews', run: runFundReviewScan },
  Wed: { name: 'tactical-view', run: runTacticalAssetClassScan },
  Fri: { name: 'sector-health', run: runSectorHealthScan },
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const results: Record<string, string> = {}

  async function step(name: string, fn: () => Promise<unknown>) {
    try {
      await fn()
      results[name] = 'ok'
    } catch (error) {
      console.error(`Daily job step ${name} failed:`, error)
      results[name] = error instanceof Error ? error.message : 'failed'
    }
  }

  await step('monitoring', runInvestmentMonitoringScan)

  const weekday = new Intl.DateTimeFormat('en-AU', { weekday: 'short', timeZone: 'Australia/Sydney' }).format(new Date())
  const rotation = WEEKLY_ROTATION[weekday]
  if (rotation) await step(rotation.name, rotation.run)

  await step('investment-committee-sync', () => syncProposals())

  const ok = Object.values(results).every((r) => r === 'ok')
  return Response.json({ ok, results }, { status: ok ? 200 : 207 })
}
