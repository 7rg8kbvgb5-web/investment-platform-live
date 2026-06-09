import type {
  FundReviewRecommendation,
  FundReviewStatus,
} from './fund-monitoring';

/** A single fund review tracked on the multi-fund review dashboard. */
export type FundReviewDashboardItem = {
  id: string;
  fundName: string;
  assetClass: string;
  recommendation: FundReviewRecommendation;
  status: FundReviewStatus;
  /** Adviser confidence in the review outcome, 0–100. */
  confidenceScore: number;
  /** ISO date (YYYY-MM-DD) when the review is due or was last assessed. */
  reviewDate: string;
  assignedReviewer: string;
  /** House view recommendation id linked to this fund review, if applicable. */
  houseViewLink: string | null;
};

export type FundReviewDashboardInput = {
  reviews: FundReviewDashboardItem[];
};

export type FundReviewDashboardSummary = {
  openReviews: number;
  acceptedReviews: number;
  deferredReviews: number;
  researchRequests: number;
};

export type FundReviewDashboardResult = {
  sortedReviews: FundReviewDashboardItem[];
  summary: FundReviewDashboardSummary;
};
