import type {
  FundReviewDashboardInput,
  FundReviewDashboardItem,
  FundReviewDashboardResult,
} from '../../domain/types/fund-review-dashboard';
import type { HouseViewRecommendation } from '../../domain/types/house-view';
import { MOCK_HOUSE_VIEW_RECOMMENDATIONS } from './house-view-engine';

/** Stable mock fund reviews for local multi-fund dashboard preview. */
export const MOCK_FUND_REVIEW_DASHBOARD_ITEMS: FundReviewDashboardItem[] = [
  {
    id: 'fr-australian-equities',
    fundName: 'Australian Equities Fund',
    assetClass: 'Australian Equities',
    recommendation: 'review_alternative',
    status: 'Open',
    confidenceScore: 74,
    reviewDate: '2026-09-30',
    assignedReviewer: 'J. Mitchell',
    houseViewLink: 'hv-australian-equities',
  },
  {
    id: 'fr-international-equities',
    fundName: 'International Equities Fund',
    assetClass: 'International Equities',
    recommendation: 'retain_current',
    status: 'Under Review',
    confidenceScore: 68,
    reviewDate: '2026-10-15',
    assignedReviewer: 'S. Nguyen',
    houseViewLink: 'hv-international-equities',
  },
  {
    id: 'fr-private-credit',
    fundName: 'Private Credit Fund',
    assetClass: 'Private Credit',
    recommendation: 'review_alternative',
    status: 'Deferred',
    confidenceScore: 71,
    reviewDate: '2026-11-30',
    assignedReviewer: 'A. Patel',
    houseViewLink: 'hv-private-credit',
  },
  {
    id: 'fr-global-quality',
    fundName: 'Global Quality Fund',
    assetClass: 'International Equities',
    recommendation: 'review_alternative',
    status: 'Research Requested',
    confidenceScore: 62,
    reviewDate: '2026-10-15',
    assignedReviewer: 'S. Nguyen',
    houseViewLink: 'hv-international-equities',
  },
  {
    id: 'fr-infrastructure',
    fundName: 'Infrastructure Fund',
    assetClass: 'Infrastructure',
    recommendation: 'retain_current',
    status: 'Accepted',
    confidenceScore: 80,
    reviewDate: '2026-08-31',
    assignedReviewer: 'J. Mitchell',
    houseViewLink: null,
  },
];

const OPEN_STATUSES = new Set<FundReviewDashboardItem['status']>([
  'Open',
  'Under Review',
]);

function compareFundReviews(
  a: FundReviewDashboardItem,
  b: FundReviewDashboardItem
): number {
  const dateDiff =
    new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime();

  if (dateDiff !== 0) {
    return dateDiff;
  }

  return a.fundName.localeCompare(b.fundName);
}

export function formatFundReviewRecommendation(
  recommendation: FundReviewDashboardItem['recommendation']
): string {
  return recommendation === 'review_alternative'
    ? 'Review alternative fund'
    : 'Retain current fund';
}

export function getHouseViewTitleForReview(
  houseViewLink: string | null,
  houseViews: HouseViewRecommendation[] = MOCK_HOUSE_VIEW_RECOMMENDATIONS
): string | null {
  if (!houseViewLink) {
    return null;
  }

  const match = houseViews.find((view) => view.id === houseViewLink);
  return match?.title ?? null;
}

/**
 * Returns stable mock fund reviews for local preview workflows.
 */
export function getMockFundReviewDashboardItems(): FundReviewDashboardItem[] {
  return MOCK_FUND_REVIEW_DASHBOARD_ITEMS.map((review) => ({ ...review }));
}

/**
 * Sorts fund reviews and derives summary metrics for the multi-fund dashboard.
 * Does not mutate the input array.
 */
export function analyzeFundReviewDashboard({
  reviews,
}: FundReviewDashboardInput): FundReviewDashboardResult {
  const sortedReviews = [...reviews].sort(compareFundReviews);

  let openReviews = 0;
  let acceptedReviews = 0;
  let deferredReviews = 0;
  let researchRequests = 0;

  for (const review of sortedReviews) {
    if (OPEN_STATUSES.has(review.status)) {
      openReviews += 1;
    }

    if (review.status === 'Accepted') {
      acceptedReviews += 1;
    }

    if (review.status === 'Deferred') {
      deferredReviews += 1;
    }

    if (review.status === 'Research Requested') {
      researchRequests += 1;
    }
  }

  return {
    sortedReviews,
    summary: {
      openReviews,
      acceptedReviews,
      deferredReviews,
      researchRequests,
    },
  };
}
