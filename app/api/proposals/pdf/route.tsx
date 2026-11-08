import { describeAiError } from '../../../../lib/ai-errors'
import { renderToBuffer } from '@react-pdf/renderer'
import { fetchClientReview } from '../../../../lib/engines/client-portfolio-reviews'
import { buildClientAdvice, type AdviceApproach } from '../../../../lib/engines/client-advice'
import { listApprovedSwaps } from '../../../../lib/engines/investment-committee-decisions'
import { getLatestModelVersion } from '../../../../lib/engines/model-versioning'
import { getQuotesForCodes } from '../../../../lib/engines/market-data'
import { ClientProposalDocument } from '../../../../lib/pdf/ClientProposalDocument'
import { cgtForReview } from '../../../../lib/tax/cgt-for-review'
import { getTaxReference } from '../../../../lib/tax/tax-reference'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// The client proposal PDF - computed by the same engine as the Client
// Advice tab, from the client's saved review and the live house model.
// GET builds the proposal under the review reference. POST (from the Client
// Advice form) can also carry a client name to print on the document - it's
// used for this one PDF only and never stored or logged.
export async function GET(request: Request) {
  const url = new URL(request.url)
  return buildPdf(url.searchParams.get('review'), url.searchParams.get('approach'), null)
}

export async function POST(request: Request) {
  const form = await request.formData()
  const str = (k: string) => {
    const v = form.get(k)
    return typeof v === 'string' ? v : null
  }
  return buildPdf(str('review'), str('approach'), str('clientName'))
}

async function buildPdf(reviewId: string | null, approachParam: string | null, clientNameInput: string | null) {
  try {
    if (!reviewId) return Response.json({ ok: false, error: 'Choose a client first.' }, { status: 400 })
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
    // Capital gains page only when the adviser has chosen to include it.
    let capitalGains = null
    if (review.cgtSettings?.includeInProposal && advice.approach === 'rebalance') {
      const reference = await getTaxReference()
      const { result } = cgtForReview(review, advice, reference)
      if (result.lines.length > 0) capitalGains = { result, reference }
    }

    const clientName = clientNameInput?.trim().slice(0, 120) || null
    const displayName = clientName ?? review.clientName
    const buffer = await renderToBuffer(
      <ClientProposalDocument
        advice={{ ...advice, clientName: displayName }}
        adviserNotes={review.adviserNotes}
        preparedOn={preparedOn}
        capitalGains={capitalGains}
      />,
    )
    const filename = `Investment Proposal - ${displayName.replace(/[^\w\s-]/g, '')}.pdf`
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Failed to generate proposal PDF:', error)
    return Response.json(
      { ok: false, error: describeAiError(error, 'Unknown error') },
      { status: 500 },
    )
  }
}
