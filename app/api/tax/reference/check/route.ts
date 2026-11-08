import { describeAiError } from '../../../../../lib/ai-errors'
import { checkAtoForUpdates } from '../../../../../lib/tax/tax-reference'

export const runtime = 'nodejs'
export const maxDuration = 120

/** Re-reads the ATO and returns proposed rates for the adviser to approve. Saves nothing. */
export async function POST() {
  try {
    const proposed = await checkAtoForUpdates()
    return Response.json({ ok: true, proposed })
  } catch (error) {
    return Response.json({ ok: false, error: describeAiError(error, 'Failed to check the ATO.') }, { status: 500 })
  }
}
