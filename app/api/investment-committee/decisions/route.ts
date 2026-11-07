import {
  listCommitteeDecisions,
  syncProposals,
  createManualProposal,
} from '../../../../lib/engines/investment-committee-decisions'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/** The full queue. Pass ?sync=1 to pull any new scan-flagged swaps in first. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    let added = 0
    let warnings: string[] = []
    if (url.searchParams.get('sync') === '1') {
      const result = await syncProposals({ includeConviction: url.searchParams.get('conviction') !== '0' })
      added = result.added
      warnings = result.warnings
    }
    const decisions = await listCommitteeDecisions()
    return Response.json({ ok: true, decisions, added, warnings })
  } catch (error) {
    console.error('Failed to load Investment Committee queue:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

/** Raise a swap manually. */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const currentCode = typeof body?.currentCode === 'string' ? body.currentCode.trim() : ''
    const proposedCode = typeof body?.proposedCode === 'string' ? body.proposedCode.trim() : ''
    const reasoning = typeof body?.reasoning === 'string' ? body.reasoning.trim() : ''
    if (!currentCode || !proposedCode || !reasoning) {
      return Response.json(
        { ok: false, error: 'Current holding, proposed replacement and reasoning are all required.' },
        { status: 400 },
      )
    }
    const decision = await createManualProposal({
      currentCode,
      proposedCode,
      proposedName: typeof body?.proposedName === 'string' ? body.proposedName : null,
      reasoning,
      severity: ['critical', 'high', 'medium', 'low'].includes(body?.severity) ? body.severity : 'medium',
    })
    return Response.json({ ok: true, decision })
  } catch (error) {
    console.error('Failed to add manual proposal:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
