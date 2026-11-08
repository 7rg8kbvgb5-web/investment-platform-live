import { fetchClientReview, type ClientPortfolioReview } from './client-portfolio-reviews'
import { buildClientAdvice, type AdviceApproach, type ClientAdvice } from './client-advice'
import { getLatestModelVersion } from './model-versioning'
import type { CommitteeDecision } from './investment-committee-decisions'

// Browser-side: loads a saved review and builds its advice with live
// prices, approved IC swaps and the current model version - shared by the
// Client Advice and Capital Gains tabs so both see identical figures.
export async function loadAdviceForReview(
  id: string,
  approachChoice: AdviceApproach | null,
): Promise<{ review: ClientPortfolioReview; advice: ClientAdvice }> {
  const review = await fetchClientReview(id)
  const [version, approvedRes] = await Promise.all([
    getLatestModelVersion().catch(() => null),
    fetch('/api/investment-committee/approved-swaps')
      .then((res) => res.json())
      .catch(() => ({ swaps: [] })),
  ])
  const approved = (approvedRes?.swaps ?? []) as CommitteeDecision[]
  const approach = approachChoice ?? review.adviceApproach ?? undefined
  const base = { approvedDecisions: approved, currentModelVersion: version?.version ?? null }

  const preliminary = await buildClientAdvice(review, base, approach)
  const codes = new Set<string>()
  for (const ac of preliminary.model.assetClasses) for (const h of ac.holdings) codes.add(h.code)
  for (const h of review.state.holdings) codes.add(h.code)

  let prices: Record<string, number | null> = {}
  if (codes.size > 0) {
    try {
      const res = await fetch('/api/market-data/quote-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: Array.from(codes) }),
      })
      const data = await res.json()
      if (data.ok) {
        prices = Object.fromEntries(
          Object.entries(data.quotes as Record<string, { price: number | null }>).map(([k, v]) => [k, v.price]),
        )
      }
    } catch {
      prices = {}
    }
  }
  const advice = await buildClientAdvice(review, { ...base, prices }, approach)
  return { review, advice }
}
