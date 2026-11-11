import { listClientReviewsFull, type ClientStatus } from './client-portfolio-reviews'
import { buildClientAdvice, type DriftStatus, type AdviceContext } from './client-advice'
import { listApprovedSwaps } from './investment-committee-decisions'
import { getLatestModelVersion } from './model-versioning'
import { DEFAULT_MODEL_ID } from '../model-context'
import type { RiskProfile } from './model-portfolios'

// The client register: every client on the platform, measured against the
// current house model for their risk profile. This is the ongoing-service
// view - who has drifted outside tolerance, whose advice was built on an
// older model version, and who holds something the Investment Committee
// has approved replacing.

export type ClientRegisterRow = {
  reviewId: string
  clientName: string
  status: ClientStatus
  riskProfile: RiskProfile
  riskProfileAgreed: boolean
  portfolioValue: number | null
  newCash: number
  asAtDate: string | null
  updatedAt: string
  maxDriftPp: number
  driftStatus: DriftStatus
  holdingsOutsideModel: number
  approvedSwapsAffecting: number
  reviewModelVersion: number | null
  staleModel: boolean
  isNewMoney: boolean
  error: string | null
}

export type ClientRegister = {
  rows: ClientRegisterRow[]
  currentModelVersion: number | null
  totals: {
    clients: number
    outsideTolerance: number
    watch: number
    staleModel: number
    affectedBySwaps: number
    totalValue: number
  }
}

export async function getClientRegister(): Promise<ClientRegister> {
  const [reviews, approved] = await Promise.all([
    listClientReviewsFull(),
    listApprovedSwaps(null, { allModels: true }).catch(() => []),
  ])

  // Reviews can be on different advisers' models: share the model cache,
  // but take each review's IC swaps and current version from its own model.
  const modelCache: AdviceContext['modelCache'] = new Map()
  const versionByModel = new Map<string, Promise<number | null>>()
  const versionFor = (modelId: string) => {
    if (!versionByModel.has(modelId))
      versionByModel.set(modelId, getLatestModelVersion(modelId).then((v) => v?.version ?? null).catch(() => null))
    return versionByModel.get(modelId)!
  }

  const rows: ClientRegisterRow[] = await Promise.all(
    reviews.map(async (review): Promise<ClientRegisterRow> => {
      const base = {
        reviewId: review.id,
        clientName: review.clientName,
        status: review.status,
        updatedAt: review.updatedAt,
        asAtDate: review.state.meta.asAtDate,
        isNewMoney: review.state.entryMode === 'new-money',
      }
      try {
        const context: AdviceContext = {
          approvedDecisions: approved.filter((d) => d.modelId === review.modelId),
          currentModelVersion: await versionFor(review.modelId),
          modelCache,
        }
        const advice = await buildClientAdvice(review, context)
        const reviewVersion = review.state.modelVersion ?? null
        return {
          ...base,
          riskProfile: advice.riskProfile,
          riskProfileAgreed: advice.riskProfileSource === 'agreed',
          portfolioValue: advice.isNewMoney ? null : advice.existingValue,
          newCash: advice.newCash,
          maxDriftPp: advice.maxDriftPp,
          driftStatus: advice.driftStatus,
          holdingsOutsideModel: advice.holdingsOutsideModel,
          approvedSwapsAffecting: advice.relevantDecisions.length,
          reviewModelVersion: reviewVersion,
          staleModel: reviewVersion !== null && context.currentModelVersion != null && reviewVersion < context.currentModelVersion,
          error: null,
        }
      } catch (err) {
        return {
          ...base,
          riskProfile: 'Balanced',
          riskProfileAgreed: false,
          portfolioValue: null,
          newCash: 0,
          maxDriftPp: 0,
          driftStatus: 'no-holdings',
          holdingsOutsideModel: 0,
          approvedSwapsAffecting: 0,
          reviewModelVersion: review.state.modelVersion ?? null,
          staleModel: false,
          error: err instanceof Error ? err.message : 'Failed to assess this client.',
        }
      }
    }),
  )

  const driftRank: Record<DriftStatus, number> = { 'outside-tolerance': 0, watch: 1, 'in-tolerance': 2, 'no-holdings': 3 }
  rows.sort((a, b) => driftRank[a.driftStatus] - driftRank[b.driftStatus] || b.maxDriftPp - a.maxDriftPp)

  return {
    rows,
    currentModelVersion: await versionFor(DEFAULT_MODEL_ID),
    totals: {
      clients: rows.length,
      outsideTolerance: rows.filter((r) => r.driftStatus === 'outside-tolerance').length,
      watch: rows.filter((r) => r.driftStatus === 'watch').length,
      staleModel: rows.filter((r) => r.staleModel).length,
      affectedBySwaps: rows.filter((r) => r.approvedSwapsAffecting > 0).length,
      totalValue: Math.round(rows.reduce((sum, r) => sum + (r.portfolioValue ?? 0) + r.newCash, 0)),
    },
  }
}
