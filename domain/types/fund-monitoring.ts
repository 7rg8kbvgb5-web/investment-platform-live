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

export type FundReviewDecision = {
  action: FundReviewAction;
  rationale: string;
  decidedAt: string;
  decidedBy?: string | null;
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
