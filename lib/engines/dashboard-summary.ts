import { fetchCoreSecurities, ASSET_CLASSES } from './model-portfolio-core'
import { getLatestTacticalAssetClassView } from './tactical-asset-view'
import { listClientReviews } from './client-portfolio-reviews'
import { getLatestMonitoringAlerts } from './investment-monitoring'
import { getLatestFundReviewAlerts } from './fund-review'
import { getLatestWeeklyBrief } from './weekly-brief'
import { listResearchDocuments } from './research-library'
import { listDeepDiveReviews } from './investment-deep-dive'
import { getLatestSectorHealthScores } from './sector-health-live'
import { getPortfolioAnalytics } from './portfolio-analytics'
import { averagePairwiseCorrelation } from './portfolio-statistics'

// One aggregation point for the dashboard's live summary cards - each
// card reads from the same real engines the actual pages use, not a
// separate mock dataset. Every source is fetched independently
// (Promise.allSettled) so one missing migration or empty table can't
// take down the whole dashboard - a card just shows its own "nothing
// yet" state instead.

export type ModelPortfolioSummary = {
  securitiesCount: number
  assetClassesCovered: number
  weightIssues: number
  tacticalOverweight: number
  tacticalUnderweight: number
}

export type ConstructionSummary = {
  reviewsInProgress: number
  mostRecentClientName: string | null
}

export type MonitoringSummary = {
  criticalCount: number
  highCount: number
  totalActive: number
  lastScanAt: string | null
}

export type FundReviewSummary = {
  criticalCount: number
  highCount: number
  totalActive: number
  lastScanAt: string | null
}

export type ResearchSummary = {
  weeklyBriefDate: string | null
  weeklyBriefHeadline: string | null
  currentTopIdeasCount: number
}

export type InvestmentCommitteeSummary = {
  totalReviews: number
  mostRecentSubject: string | null
  mostRecentAt: string | null
}

export type DataAnalyticsSummary = {
  topSector: string | null
  topSectorRecommendation: string | null
  correlationRating: number | null
}

export type DashboardSummary = {
  modelPortfolio: ModelPortfolioSummary | null
  construction: ConstructionSummary | null
  monitoring: MonitoringSummary | null
  fundReviews: FundReviewSummary | null
  research: ResearchSummary | null
  investmentCommittee: InvestmentCommitteeSummary | null
  dataAnalytics: DataAnalyticsSummary | null
}

function settled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    securitiesResult,
    tacticalResult,
    reviewsResult,
    monitoringResult,
    fundReviewResult,
    weeklyBriefResult,
    researchDocsResult,
    deepDivesResult,
    sectorHealthResult,
    analyticsResult,
  ] = await Promise.allSettled([
    fetchCoreSecurities(),
    getLatestTacticalAssetClassView(),
    listClientReviews(),
    getLatestMonitoringAlerts(),
    getLatestFundReviewAlerts(),
    getLatestWeeklyBrief(),
    listResearchDocuments(),
    listDeepDiveReviews(),
    getLatestSectorHealthScores(),
    getPortfolioAnalytics(),
  ])

  // --- Model Portfolio ---
  const securities = settled(securitiesResult)
  const tacticalView = settled(tacticalResult)
  let modelPortfolio: ModelPortfolioSummary | null = null
  if (securities) {
    const byAssetClass = ASSET_CLASSES.map((ac) => ({
      name: ac.name,
      holdings: securities.filter((s) => s.assetClass === ac.name),
    }))
    const weightIssues = byAssetClass.filter((ac) => {
      if (ac.holdings.length === 0) return false
      const total = Math.round(ac.holdings.reduce((sum, h) => sum + h.inClassWeight, 0) * 100) / 100
      return Math.abs(total - 100) >= 0.15
    }).length

    modelPortfolio = {
      securitiesCount: securities.length,
      assetClassesCovered: byAssetClass.filter((ac) => ac.holdings.length > 0).length,
      weightIssues,
      tacticalOverweight: tacticalView?.calls.filter((c) => c.stance === 'OW').length ?? 0,
      tacticalUnderweight: tacticalView?.calls.filter((c) => c.stance === 'UW').length ?? 0,
    }
  }

  // --- Construction ---
  const reviews = settled(reviewsResult)
  const construction: ConstructionSummary | null = reviews
    ? {
        reviewsInProgress: reviews.length,
        mostRecentClientName: reviews.length > 0 ? reviews[0].clientName : null,
      }
    : null

  // --- Monitoring ---
  const monitoringAlerts = settled(monitoringResult)
  const monitoring: MonitoringSummary | null = monitoringAlerts
    ? {
        criticalCount: monitoringAlerts.filter((a) => a.severity === 'critical' && a.status !== 'dismissed').length,
        highCount: monitoringAlerts.filter((a) => a.severity === 'high' && a.status !== 'dismissed').length,
        totalActive: monitoringAlerts.filter((a) => a.status !== 'dismissed').length,
        lastScanAt: monitoringAlerts.length > 0 ? monitoringAlerts[0].generatedAt : null,
      }
    : null

  // --- Fund Reviews ---
  const fundAlerts = settled(fundReviewResult)
  const fundReviews: FundReviewSummary | null = fundAlerts
    ? {
        criticalCount: fundAlerts.filter((a) => a.severity === 'critical' && a.status !== 'dismissed').length,
        highCount: fundAlerts.filter((a) => a.severity === 'high' && a.status !== 'dismissed').length,
        totalActive: fundAlerts.filter((a) => a.status !== 'dismissed').length,
        lastScanAt: fundAlerts.length > 0 ? fundAlerts[0].generatedAt : null,
      }
    : null

  // --- Research ---
  const brief = settled(weeklyBriefResult)
  const researchDocs = settled(researchDocsResult)
  const currentTopIdeasCount = researchDocs
    ? researchDocs.filter((d) => d.documentType === 'Top Ideas' && d.isCurrent).length
    : 0
  const research: ResearchSummary = {
    weeklyBriefDate: brief?.weekOf ?? null,
    weeklyBriefHeadline: brief?.macroSummary ? brief.macroSummary.slice(0, 140) : null,
    currentTopIdeasCount,
  }

  // --- Investment Committee ---
  const deepDives = settled(deepDivesResult)
  const investmentCommittee: InvestmentCommitteeSummary | null = deepDives
    ? {
        totalReviews: deepDives.length,
        mostRecentSubject: deepDives.length > 0 ? deepDives[0].subjectName : null,
        mostRecentAt: deepDives.length > 0 ? deepDives[0].generatedAt : null,
      }
    : null

  // --- Data Analytics ---
  const sectorScores = settled(sectorHealthResult)
  const analytics = settled(analyticsResult)
  const topSector = sectorScores && sectorScores.length > 0 ? sectorScores[0] : null
  const correlationRating = analytics
    ? Math.max(
        0,
        Math.round(100 - Math.abs(averagePairwiseCorrelation(analytics.assetClassCorrelation.matrix)) * 100),
      )
    : null
  const dataAnalytics: DataAnalyticsSummary = {
    topSector: topSector?.sector ?? null,
    topSectorRecommendation: topSector?.recommendation ?? null,
    correlationRating,
  }

  return {
    modelPortfolio,
    construction,
    monitoring,
    fundReviews,
    research,
    investmentCommittee,
    dataAnalytics,
  }
}
