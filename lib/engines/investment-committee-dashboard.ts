import type { DeferredReview } from '../../domain/types/fund-monitoring';
import type { FundReviewDashboardItem } from '../../domain/types/fund-review-dashboard';
import type { GovernanceAuditEntry } from '../../domain/types/governance-audit';
import type { HouseViewRecommendation } from '../../domain/types/house-view';
import { analyzeDeferredReviewQueue } from './deferred-review-queue';
import { analyzeFundReviewDashboard } from './fund-review-dashboard';
import { analyzeGovernanceAuditTrail } from './governance-audit-trail';
import { analyzeHouseViews } from './house-view-engine';
import { PREVIEW_DATE } from '../format-timestamp';

const GOVERNANCE_EVENT_WINDOW_DAYS = 30;
const HOUSE_VIEW_REVIEW_HORIZON_DAYS = 90;
const EXPIRING_OVERLAY_HORIZON_DAYS = 30;

const ACTIONABLE_REVIEW_STATUSES = new Set<FundReviewDashboardItem['status']>([
  'Open',
  'Under Review',
  'Research Requested',
]);

export type PortfolioGovernanceWorkflowItem = {
  id: string;
  riskProfileName: string;
  scenarioName: string;
  status: 'draft' | 'reviewed' | 'approved';
  warningCount: number;
  errorCount: number;
  approvalRequired: boolean;
  hasHardBreaches: boolean;
};

export type ExpiringTacticalOverlayItem = {
  id: string;
  riskProfileName: string;
  assetClass: string;
  expiryDate: string;
  daysUntilExpiry: number;
};

export type PortfolioGovernanceWorkflowSummary = {
  activeWorkflows: PortfolioGovernanceWorkflowItem[];
  expiringOverlays: ExpiringTacticalOverlayItem[];
  guardrailWarningCount: number;
};

export type InvestmentCommitteePriorityItem = {
  id: string;
  title: string;
  subtitle: string;
  confidenceScore: number;
  reviewDate: string;
  source: 'fund_review' | 'house_view' | 'deferred_review' | 'research_request';
};

export type InvestmentCommitteeActionItem = {
  id: string;
  title: string;
  detail: string;
  source:
    | 'fund_review'
    | 'research_request'
    | 'house_view'
    | 'portfolio_workflow';
};

export type InvestmentCommitteeDashboardSummary = {
  openReviews: number;
  deferredReviews: number;
  researchRequests: number;
  acceptedRecommendations: number;
  rejectedRecommendations: number;
  activeHouseViews: number;
  governanceEventsLast30Days: number;
};

export type InvestmentCommitteeDashboardInput = {
  fundReviews: FundReviewDashboardItem[];
  houseViews: HouseViewRecommendation[];
  auditEntries: GovernanceAuditEntry[];
  deferredReviews: DeferredReview[];
  portfolioGovernance: PortfolioGovernanceWorkflowSummary;
  referenceDate?: string;
};

export type InvestmentCommitteeDashboardResult = {
  summary: InvestmentCommitteeDashboardSummary;
  priorities: {
    highestConfidenceRecommendations: InvestmentCommitteePriorityItem[];
    overdueReviews: InvestmentCommitteePriorityItem[];
    outstandingResearchRequests: InvestmentCommitteePriorityItem[];
    houseViewsApproachingReview: InvestmentCommitteePriorityItem[];
  };
  governanceHealth: {
    openItems: number;
    deferredItems: number;
    expiringTacticalOverlays: number;
    guardrailWarnings: number;
  };
  committeeActions: {
    reviewsRequiringAction: InvestmentCommitteeActionItem[];
    researchRequestsAwaitingCompletion: InvestmentCommitteeActionItem[];
    houseViewsRequiringReview: InvestmentCommitteeActionItem[];
  };
  generatedAt: string;
};

/** Stable mock deferred reviews aligned with multi-fund dashboard preview data. */
export const MOCK_IC_DEFERRED_REVIEWS: DeferredReview[] = [
  {
    id: 'deferred-private-credit',
    reviewTitle: 'Private Credit Fund — alternative review',
    fundOrRecommendationName: 'Private Credit Fund',
    deferralReason: 'Awaiting Q2 liquidity report from the manager.',
    deferredDate: '2026-05-05',
    reviewAgainDate: '2026-06-01',
    status: 'Overdue',
  },
  {
    id: 'deferred-australian-equities',
    reviewTitle: 'Australian Equities Fund — cost comparison',
    fundOrRecommendationName: 'Australian Equities Fund',
    deferralReason: 'Committee requested updated fee disclosure before decision.',
    deferredDate: '2026-05-20',
    reviewAgainDate: '2026-06-20',
    status: 'Due Soon',
  },
];

/** Stable mock portfolio governance workflow items for IC executive summary. */
export const MOCK_PORTFOLIO_GOVERNANCE_SUMMARY: PortfolioGovernanceWorkflowSummary =
  {
    activeWorkflows: [
      {
        id: 'workflow-balanced-draft',
        riskProfileName: 'Balanced',
        scenarioName: 'Tactical overlay preview — Australian Equities',
        status: 'draft',
        warningCount: 2,
        errorCount: 0,
        approvalRequired: true,
        hasHardBreaches: false,
      },
      {
        id: 'workflow-growth-reviewed',
        riskProfileName: 'Growth',
        scenarioName: 'Reset to strategic allocation',
        status: 'reviewed',
        warningCount: 0,
        errorCount: 0,
        approvalRequired: false,
        hasHardBreaches: false,
      },
    ],
    expiringOverlays: [
      {
        id: 'overlay-intl-equities',
        riskProfileName: 'Balanced',
        assetClass: 'International Equities',
        expiryDate: '2026-06-25',
        daysUntilExpiry: 16,
      },
      {
        id: 'overlay-fixed-income',
        riskProfileName: 'Conservative',
        assetClass: 'Fixed Income',
        expiryDate: '2026-07-08',
        daysUntilExpiry: 29,
      },
    ],
    guardrailWarningCount: 3,
  };

function toDateOnly(value: string): Date | null {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((to.getTime() - from.getTime()) / msPerDay);
}

function isWithinLastDays(
  isoTimestamp: string,
  referenceDate: string,
  days: number
): boolean {
  const eventDate = new Date(isoTimestamp);
  const reference = toDateOnly(referenceDate);

  if (Number.isNaN(eventDate.getTime()) || !reference) {
    return false;
  }

  const windowStart = new Date(reference);
  windowStart.setDate(windowStart.getDate() - days);

  return eventDate.getTime() >= windowStart.getTime();
}

function isReviewDateOverdue(reviewDate: string, referenceDate: string): boolean {
  const review = toDateOnly(reviewDate);
  const today = toDateOnly(referenceDate);

  if (!review || !today) {
    return false;
  }

  return review.getTime() < today.getTime();
}

function isHouseViewApproachingReview(
  reviewDate: string,
  referenceDate: string,
  horizonDays: number
): boolean {
  const review = toDateOnly(reviewDate);
  const today = toDateOnly(referenceDate);

  if (!review || !today) {
    return false;
  }

  const daysUntilReview = daysBetween(today, review);

  return daysUntilReview >= 0 && daysUntilReview <= horizonDays;
}

function buildFundReviewPriority(
  review: FundReviewDashboardItem,
  source: InvestmentCommitteePriorityItem['source']
): InvestmentCommitteePriorityItem {
  return {
    id: review.id,
    title: review.fundName,
    subtitle: `${review.assetClass} · ${review.assignedReviewer}`,
    confidenceScore: review.confidenceScore,
    reviewDate: review.reviewDate,
    source,
  };
}

function buildDeferredReviewPriority(
  review: DeferredReview
): InvestmentCommitteePriorityItem {
  return {
    id: review.id,
    title: review.fundOrRecommendationName,
    subtitle: review.deferralReason,
    confidenceScore: 0,
    reviewDate: review.reviewAgainDate,
    source: 'deferred_review',
  };
}

function buildHouseViewPriority(
  view: HouseViewRecommendation
): InvestmentCommitteePriorityItem {
  return {
    id: view.id,
    title: view.title,
    subtitle: `${view.area} · ${view.category}`,
    confidenceScore: view.confidenceScore,
    reviewDate: view.reviewDate,
    source: 'house_view',
  };
}

export function getMockDeferredReviewsForIC(): DeferredReview[] {
  return MOCK_IC_DEFERRED_REVIEWS.map((review) => ({ ...review }));
}

export function getMockPortfolioGovernanceSummary(): PortfolioGovernanceWorkflowSummary {
  return {
    activeWorkflows: MOCK_PORTFOLIO_GOVERNANCE_SUMMARY.activeWorkflows.map(
      (workflow) => ({ ...workflow })
    ),
    expiringOverlays: MOCK_PORTFOLIO_GOVERNANCE_SUMMARY.expiringOverlays.map(
      (overlay) => ({ ...overlay })
    ),
    guardrailWarningCount:
      MOCK_PORTFOLIO_GOVERNANCE_SUMMARY.guardrailWarningCount,
  };
}

/**
 * Aggregates house views, fund reviews, audit trail, deferred queue, and
 * portfolio governance into an executive investment committee dashboard view.
 */
export function analyzeInvestmentCommitteeDashboard({
  fundReviews,
  houseViews,
  auditEntries,
  deferredReviews,
  portfolioGovernance,
  referenceDate = PREVIEW_DATE,
}: InvestmentCommitteeDashboardInput): InvestmentCommitteeDashboardResult {
  const fundReviewAnalysis = analyzeFundReviewDashboard({ reviews: fundReviews });
  const houseViewAnalysis = analyzeHouseViews({ recommendations: houseViews });
  const auditAnalysis = analyzeGovernanceAuditTrail({ entries: auditEntries });
  const deferredQueue = analyzeDeferredReviewQueue({
    reviews: deferredReviews,
    currentDate: referenceDate,
  });

  const rejectedRecommendations = fundReviewAnalysis.sortedReviews.filter(
    (review) => review.status === 'Rejected'
  ).length;

  const governanceEventsLast30Days = auditAnalysis.sortedEntries.filter(
    (entry) =>
      isWithinLastDays(entry.timestamp, referenceDate, GOVERNANCE_EVENT_WINDOW_DAYS)
  ).length;

  const actionableFundReviews = fundReviewAnalysis.sortedReviews.filter(
    (review) => ACTIONABLE_REVIEW_STATUSES.has(review.status)
  );

  const researchRequestReviews = fundReviewAnalysis.sortedReviews.filter(
    (review) => review.status === 'Research Requested'
  );

  const highestConfidenceRecommendations = [...actionableFundReviews]
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 3)
    .map((review) => buildFundReviewPriority(review, 'fund_review'));

  const overdueFundReviews = fundReviewAnalysis.sortedReviews.filter(
    (review) =>
      ACTIONABLE_REVIEW_STATUSES.has(review.status) &&
      isReviewDateOverdue(review.reviewDate, referenceDate)
  );

  const overdueDeferredReviews = deferredQueue.openReviews.filter(
    (review) => review.status === 'Overdue'
  );

  const overdueReviews = [
    ...overdueFundReviews.map((review) =>
      buildFundReviewPriority(review, 'fund_review')
    ),
    ...overdueDeferredReviews.map((review) => buildDeferredReviewPriority(review)),
  ].sort(
    (a, b) =>
      new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime()
  );

  const outstandingResearchRequests = researchRequestReviews.map((review) =>
    buildFundReviewPriority(review, 'research_request')
  );

  const houseViewsApproachingReview = houseViewAnalysis.sortedRecommendations
    .filter((view) =>
      isHouseViewApproachingReview(
        view.reviewDate,
        referenceDate,
        HOUSE_VIEW_REVIEW_HORIZON_DAYS
      )
    )
    .map((view) => buildHouseViewPriority(view));

  const draftWorkflowCount = portfolioGovernance.activeWorkflows.filter(
    (workflow) => workflow.status === 'draft' || workflow.status === 'reviewed'
  ).length;

  const openItems =
    fundReviewAnalysis.summary.openReviews +
    researchRequestReviews.length +
    draftWorkflowCount;

  const deferredItems =
    fundReviewAnalysis.summary.deferredReviews +
    deferredQueue.openReviews.length;

  const expiringOverlays = portfolioGovernance.expiringOverlays.filter(
    (overlay) => overlay.daysUntilExpiry <= EXPIRING_OVERLAY_HORIZON_DAYS
  );

  const reviewsRequiringAction: InvestmentCommitteeActionItem[] =
    actionableFundReviews.map((review) => ({
      id: review.id,
      title: review.fundName,
      detail: `${review.status} · ${review.recommendation === 'review_alternative' ? 'Review alternative fund' : 'Retain current fund'}`,
      source: 'fund_review',
    }));

  const researchRequestsAwaitingCompletion: InvestmentCommitteeActionItem[] =
    researchRequestReviews.map((review) => ({
      id: review.id,
      title: review.fundName,
      detail: `Assigned to ${review.assignedReviewer} · confidence ${review.confidenceScore}/100`,
      source: 'research_request',
    }));

  const houseViewsRequiringReview: InvestmentCommitteeActionItem[] =
    houseViewsApproachingReview.map((view) => ({
      id: view.id,
      title: view.title,
      detail: `Review by ${view.reviewDate} · confidence ${view.confidenceScore}/100`,
      source: 'house_view',
    }));

  const portfolioWorkflowActions: InvestmentCommitteeActionItem[] =
    portfolioGovernance.activeWorkflows
      .filter((workflow) => workflow.approvalRequired)
      .map((workflow) => ({
        id: workflow.id,
        title: workflow.scenarioName,
        detail: `${workflow.riskProfileName} · ${workflow.status} · approval required`,
        source: 'portfolio_workflow',
      }));

  return {
    summary: {
      openReviews: fundReviewAnalysis.summary.openReviews,
      deferredReviews: deferredItems,
      researchRequests: fundReviewAnalysis.summary.researchRequests,
      acceptedRecommendations: fundReviewAnalysis.summary.acceptedReviews,
      rejectedRecommendations,
      activeHouseViews: houseViewAnalysis.sortedRecommendations.length,
      governanceEventsLast30Days,
    },
    priorities: {
      highestConfidenceRecommendations,
      overdueReviews,
      outstandingResearchRequests,
      houseViewsApproachingReview,
    },
    governanceHealth: {
      openItems,
      deferredItems,
      expiringTacticalOverlays: expiringOverlays.length,
      guardrailWarnings: portfolioGovernance.guardrailWarningCount,
    },
    committeeActions: {
      reviewsRequiringAction: [
        ...reviewsRequiringAction,
        ...portfolioWorkflowActions,
      ],
      researchRequestsAwaitingCompletion,
      houseViewsRequiringReview,
    },
    generatedAt: `${referenceDate}T12:00:00.000Z`,
  };
}
