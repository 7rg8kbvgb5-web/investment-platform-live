import { buildClientAdvice, type AdviceApproach, type ClientAdvice } from './client-advice'
import type { ClientPortfolioReview } from './client-portfolio-reviews'
import { listApprovedSwaps } from './investment-committee-decisions'
import { getLatestModelVersion } from './model-versioning'
import { getQuotesForCodes } from './market-data'

// Server-side: a saved review's advice with live prices, approved IC swaps
// and the current model version - the same inputs the Client Advice tab
// uses in the browser (client-advice-loader.ts). Shared by the proposal PDF
// and Data Analytics so every server view of a client is the same portfolio.
export async function buildAdviceWithPrices(
  review: ClientPortfolioReview,
  approach?: AdviceApproach | null,
): Promise<{ advice: ClientAdvice; prices: Record<string, number | null> }> {
  const [approved, version] = await Promise.all([
    listApprovedSwaps(review.modelId).catch(() => []),
    getLatestModelVersion(review.modelId).catch(() => null),
  ])
  const context = { approvedDecisions: approved, currentModelVersion: version?.version ?? null }
  const chosen = approach ?? review.adviceApproach ?? undefined

  const preliminary = await buildClientAdvice(review, context, chosen)
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
  const advice = await buildClientAdvice(review, { ...context, prices }, chosen)
  return { advice, prices }
}
