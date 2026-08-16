import { fetchCoreSecurities, ASSET_CLASSES, fetchModelPortfolio } from './model-portfolio-core'
import { getLatestTacticalAssetClassView } from './tactical-asset-view'
import { listClientReviews } from './client-portfolio-reviews'
import { getLatestMonitoringAlerts } from './investment-monitoring'
import { getLatestFundReviewAlerts, getFundsHeld } from './fund-review'
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
  averageForwardYield: number | null
}

export type ConstructionSummary = {
  reviewsInProgress: number
  mostRecentClientName: string | null
}

export type AlertHeadline = {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  source: 'Monitoring' | 'Fund Reviews'
  generatedAt: string
  href: string
}

export type MonitoringSummary = {
  criticalCount: number
  highCount: number
  totalActive: number
  lastScanAt: string | null
  topAlerts: AlertHeadline[]
}

export type FundReviewSummary = {
  criticalCount: number
  highCount: number
  totalActive: number
  lastScanAt: string | null
  listedFundsHeld: number
  unlistedFundsHeld: number
  topAlerts: AlertHeadline[]
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
  mostRecentKeyRisksCount: number
}

export type DataAnalyticsSummary = {
  topSector: string | null
  topSectorRecommendation: string | null
  worstSector: string | null
  worstSectorRecommendation: string | null
  correlationRating: number | null
}

export type AssetAllocationSlice = {
  assetClass: string
  weight: number
}

export type DashboardSummary = {
  modelPortfolio: ModelPortfolioSummary | null
  construction: ConstructionSummary | null
  monitoring: MonitoringSummary | null
  fundReviews: FundReviewSummary | null
  research: ResearchSummary | null
  investmentCommittee: InvestmentCommitteeSummary | null
  dataAnalytics: DataAnalyticsSummary | null
  assetAllocation: AssetAllocationSlice[]
  newsFeed: AlertHeadline[]
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
    fundsHeldResult,
    weeklyBriefResult,
    researchDocsResult,
    deepDivesResult,
    sectorHealthResult,
    analyticsResult,
    balancedModelResult,
  ] = await Promise.allSettled([
    fetchCoreSecurities(),
    getLatestTacticalAssetClassView(),
    listClientReviews(),
    getLatestMonitoringAlerts(),
    getLatestFundReviewAlerts(),
    getFundsHeld(),
    getLatestWeeklyBrief(),
    listResearchDocuments(),
    listDeepDiveReviews(),
    getLatestSectorHealthScores(),
    getPortfolioAnalytics(),
    fetchModelPortfolio('Balanced'),
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
      averageForwardYield: (() => {
        const withYield = securities.filter((s) => typeof s.yield === 'number')
        if (withYield.length === 0) return null
        const sum = withYield.reduce((total, s) => total + (s.yield ?? 0), 0)
        return Math.round((sum / withYield.length) * 100) / 100
      })(),
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

  const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

  // --- Monitoring ---
  const monitoringAlerts = settled(monitoringResult)
  const monitoringActive = monitoringAlerts?.filter((a) => a.status !== 'dismissed') ?? []
  const monitoringTopAlerts: AlertHeadline[] = [...monitoringActive]
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      category: a.category,
      source: 'Monitoring',
      generatedAt: a.generatedAt,
      href: '/monitoring',
    }))
  const monitoring: MonitoringSummary | null = monitoringAlerts
    ? {
        criticalCount: monitoringActive.filter((a) => a.severity === 'critical').length,
        highCount: monitoringActive.filter((a) => a.severity === 'high').length,
        totalActive: monitoringActive.length,
        lastScanAt: monitoringAlerts.length > 0 ? monitoringAlerts[0].generatedAt : null,
        topAlerts: monitoringTopAlerts,
      }
    : null

  // --- Fund Reviews ---
  const fundAlerts = settled(fundReviewResult)
  const fundsHeld = settled(fundsHeldResult)
  const fundActive = fundAlerts?.filter((a) => a.status !== 'dismissed') ?? []
  const fundTopAlerts: AlertHeadline[] = [...fundActive]
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      category: a.category,
      source: 'Fund Reviews',
      generatedAt: a.generatedAt,
      href: '/fund-reviews',
    }))
  const fundReviews: FundReviewSummary | null = fundAlerts
    ? {
        criticalCount: fundActive.filter((a) => a.severity === 'critical').length,
        highCount: fundActive.filter((a) => a.severity === 'high').length,
        totalActive: fundActive.length,
        lastScanAt: fundAlerts.length > 0 ? fundAlerts[0].generatedAt : null,
        listedFundsHeld: fundsHeld?.filter((f) => f.holdingType === 'listed_fund').length ?? 0,
        unlistedFundsHeld: fundsHeld?.filter((f) => f.holdingType === 'unlisted_fund').length ?? 0,
        topAlerts: fundTopAlerts,
      }
    : null

  // News feed: the most notable active alerts across Monitoring and Fund
  // Reviews together, most severe and most recent first - a real,
  // scannable digest of what's actually going on, not headline counts.
  const newsFeed: AlertHeadline[] = [...monitoringTopAlerts, ...fundTopAlerts]
    .sort((a, b) => {
      const severityDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      if (severityDiff !== 0) return severityDiff
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    })
    .slice(0, 8)

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
        mostRecentKeyRisksCount: deepDives.length > 0 ? deepDives[0].keyRisks.length : 0,
      }
    : null

  // --- Data Analytics ---
  const sectorScores = settled(sectorHealthResult)
  const analytics = settled(analyticsResult)
  const topSector = sectorScores && sectorScores.length > 0 ? sectorScores[0] : null
  const worstSector = sectorScores && sectorScores.length > 0 ? sectorScores[sectorScores.length - 1] : null
  const correlationRating = analytics
    ? Math.max(
        0,
        Math.round(100 - Math.abs(averagePairwiseCorrelation(analytics.assetClassCorrelation.matrix)) * 100),
      )
    : null
  const dataAnalytics: DataAnalyticsSummary = {
    topSector: topSector?.sector ?? null,
    topSectorRecommendation: topSector?.recommendation ?? null,
    worstSector: worstSector && worstSector !== topSector ? worstSector.sector : null,
    worstSectorRecommendation: worstSector && worstSector !== topSector ? worstSector.recommendation : null,
    correlationRating,
  }

  // --- Asset allocation snapshot (Balanced profile, as a representative shape) ---
  const balancedModel = settled(balancedModelResult)
  const assetAllocation: AssetAllocationSlice[] = balancedModel
    ? balancedModel.assetClasses
        .filter((ac) => ac.targetWeight > 0)
        .map((ac) => ({ assetClass: ac.name, weight: ac.targetWeight }))
    : []

  return {
    modelPortfolio,
    construction,
    monitoring,
    fundReviews,
    research,
    investmentCommittee,
    dataAnalytics,
    assetAllocation,
    newsFeed,
  }
}
