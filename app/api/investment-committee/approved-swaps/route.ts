import { listApprovedSwaps } from '../../../../lib/engines/investment-committee-decisions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const swaps = await listApprovedSwaps()
    return Response.json({ ok: true, swaps })
  } catch (error) {
    // The table may not exist until migration 0016 is run - fail quietly
    // so the Construction tab isn't affected.
    return Response.json({ ok: false, swaps: [], error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
