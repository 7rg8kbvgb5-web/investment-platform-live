import { renderToBuffer } from '@react-pdf/renderer'
import { fetchClientReview } from '../../../../lib/engines/client-portfolio-reviews'
import { buildClientAdvice, type AdviceApproach } from '../../../../lib/engines/client-advice'
import { listApprovedSwaps } from '../../../../lib/engines/investment-committee-decisions'
import { getLatestModelVersion } from '../../../../lib/engines/model-versioning'
import { getQuotesForCodes } from '../../../../lib/engines/market-data'
import { ClientProposalDocument } from '../../../../lib/pdf/ClientProposalDocument'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// The client proposal PDF - computed by the same engine as the Client
// Advice tab, from the client's saved review and the live house model.
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const reviewId = url.searchParams.get('review')
    if (!reviewId) return Response.json({ ok: false, error: 'Choose a client first.' }, { status: 400 })
    const approachParam = url.searchParams.get('approach')
    const approach: AdviceApproach | undefined =
      approachParam === 'rebalance' || approachParam === 'new-cash' ? approachParam : undefined

    const review = await fetchClientReview(reviewId)
    const [approved, version] = await Promise.all([
      listApprovedSwaps().catch(() => []),
      getLatestModelVersion().catch(() => null),
    ])
    const context = { approvedDecisions: approved, currentModelVersion: version?.version ?? null }

    const preliminary = await buildClientAdvice(review, context, approach ?? review.adviceApproach ?? undefined)
    const codes = new Set<string>()
    for (const ac of preliminary.model.assetClasses) for (const h of ac.holdings) codes.add(h.code)
    for (const h of review.state.holdings) codes.add(h.code)
    let prices: Record<string, number | null> = {}
    try {
      const quotes = await getQuotesForCodes(Array.from(codes).slice(0, 200))
      prices = Object.fromEntries(Object.entries(quotes).map(([k, v]) => [k, v.price]))
    } catch {
      prices = {}
    }
    const advice = await buildClientAdvice(review, { ...context, prices }, approach ?? review.adviceApproach ?? undefined)

    const preparedOn = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' })
    const buffer = await renderToBuffer(
      <ClientProposalDocument advice={advice} adviserNotes={review.adviserNotes} preparedOn={preparedOn} />,
    )
    const filename = `Investment Proposal - ${review.clientName.replace(/[^\w\s-]/g, '')}.pdf`
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to generate proposal PDF:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
