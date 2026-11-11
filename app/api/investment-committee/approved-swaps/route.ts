import { describeAiError } from '../../../../lib/ai-errors'
import { listApprovedSwaps } from '../../../../lib/engines/investment-committee-decisions'
import { selectedModelIdFromCookies } from '../../../../lib/model-context-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Approved swaps for one adviser model: ?model= (a client review's model), else the selected model. */
export async function GET(request: Request) {
  try {
    const model = new URL(request.url).searchParams.get('model') || (await selectedModelIdFromCookies())
    const swaps = await listApprovedSwaps(model)
    return Response.json({ ok: true, swaps })
  } catch (error) {
    // The table may not exist until migration 0016 is run - fail quietly
    // so the Construction tab isn't affected.
    return Response.json({ ok: false, swaps: [], error: describeAiError(error, 'Unknown error') })
  }
}
