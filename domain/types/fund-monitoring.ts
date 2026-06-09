/** Placeholder scoring dimensions for best-in-class fund comparison (no live data). */
export type FundScoreProfile = {
  performanceScore: number;
  costScore: number;
  riskScore: number;
  liquidityScore: number;
  qualitativeScore: number;
};

export type FundHolding = FundScoreProfile & {
  fundId: string;
  fundName: string;
  assetClass: string;
  /** Portfolio weight attributed to this fund, if known. */
  weight?: number;
  /** Identifier of the model portfolio this holding belongs to, if applicable. */
  modelPortfolioId?: string;
};

export type FundAlternative = FundScoreProfile & {
  fundId: string;
  fundName: string;
  assetClass: string;
};

export type FundReviewRecommendation = 'retain_current' | 'review_alternative';

export type FundReviewAction =
  | 'accept'
  | 'reject'
  | 'defer'
  | 'request_more_research';

export type FundReviewStatus =
  | 'Open'
  | 'Under Review'
  | 'Deferred'
  | 'Accepted'
  | 'Rejected'
  | 'Research Requested'
  | 'Closed';

export type FundReviewDecision = {
  action: FundReviewAction;
  rationale: string;
  decidedAt: string;
  status: FundReviewStatus;
  decidedBy?: string | null;
};

/** Tracks adviser decision lifecycle for a single fund monitoring review. */
export type FundReviewLifecycle = {
  currentStatus: FundReviewStatus;
  decisions: FundReviewDecision[];
  lastUpdatedAt: string;
};

export type FundMonitoringReview = {
  currentFund: FundHolding;
  alternatives: FundAlternative[];
  recommendation: FundReviewRecommendation;
  /** Set when recommendation is review_alternative. */
  recommendedAlternativeId: string | null;
  recommendedAlternativeName: string | null;
  reason: string;
  /** Adviser sign-off required before any fund change is implemented. */
  requiresAdviserReview: boolean;
  currentCompositeScore: number;
  bestAlternativeCompositeScore: number | null;
  timestamp: string;
};

export type FundMonitoringReviewInput = {
  currentFund: FundHolding;
  alternatives: FundAlternative[];
  /** Minimum composite score lead required to flag an alternative for review. */
  reviewThreshold?: number;
  timestamp?: string;
};

export type DeferredReviewStatus =
  | 'Deferred'
  | 'Due Soon'
  | 'Overdue'
  | 'Completed';

/** A fund review deferred by an adviser for follow-up at a later date. */
export type DeferredReview = {
  id: string;
  reviewTitle: string;
  fundOrRecommendationName: string;
  deferralReason: string;
  deferredDate: string;
  reviewAgainDate: string;
  status: DeferredReviewStatus;
};
