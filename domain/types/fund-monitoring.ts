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

/** Ongoing suitability status for a fund used in model portfolios. */
export type FundMonitoringStatus =
  | 'Current'
  | 'Watch'
  | 'Review Required'
  | 'Replacement Candidate'
  | 'Archived';

export type FundReviewPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type FundReviewReason =
  | 'Underperformance'
  | 'Manager Change'
  | 'Rating Change'
  | 'Fee Concern'
  | 'Style Drift'
  | 'Capacity Concern'
  | 'Better Alternative Available'
  | 'Scheduled Review'
  | 'Adviser Request';

export type FundReplacementCandidate = {
  fundId: string;
  fundName: string;
  assetClass: string;
  rationale?: string;
};

/** A fund tracked for ongoing best-in-class and suitability monitoring. */
export type MonitoredFund = {
  fundId: string;
  fundName: string;
  assetClass: string;
  status: FundMonitoringStatus;
  reviewPriority: FundReviewPriority;
  reviewReason: FundReviewReason;
  lastReviewed: string;
  nextReview: string;
  replacementCandidate?: FundReplacementCandidate | null;
  modelPortfolioId?: string;
};

export type FundMonitoringAssessment = {
  fund: MonitoredFund;
  assessmentNotes: string;
  isReviewOverdue: boolean;
};

export type FundMonitoringSummary = {
  totalMonitoredFunds: number;
  fundsOnWatch: number;
  reviewRequired: number;
  replacementCandidates: number;
  criticalPriorityReviews: number;
  highPriorityReviews: number;
};

export type FundMonitoringAssessmentResult = {
  assessments: FundMonitoringAssessment[];
  summary: FundMonitoringSummary;
};

/** Adviser decision actions for monitored fund suitability reviews. */
export type FundMonitoringDecisionAction =
  | 'keep'
  | 'watch'
  | 'replace'
  | 'defer'
  | 'request_more_research';

/** Governed adviser decision on a monitored fund assessment. */
export type FundMonitoringDecision = {
  id: string;
  fundId: string;
  fundName: string;
  action: FundMonitoringDecisionAction;
  rationale: string;
  decidedBy: string;
  decidedAt: string;
  nextReviewDate?: string | null;
  replacementFundId?: string | null;
  replacementFundName?: string | null;
};

export type FundMonitoringDecisionSummary = {
  totalDecisions: number;
  keepCount: number;
  watchCount: number;
  replaceCount: number;
  deferCount: number;
  requestMoreResearchCount: number;
  fundsWithDecisions: number;
};

/** Governed audit event types for fund monitoring decision history. */
export type FundReviewAuditEventType =
  | 'Decision Created'
  | 'Fund Kept'
  | 'Fund Placed On Watch'
  | 'Replacement Recommended'
  | 'Review Deferred'
  | 'More Research Requested'
  | 'Review Completed';

/** Immutable audit record for a fund monitoring adviser decision or review outcome. */
export type FundReviewAuditEvent = {
  id: string;
  fundId: string;
  fundName: string;
  eventType: FundReviewAuditEventType;
  action: FundMonitoringDecisionAction;
  rationale: string;
  createdBy: string;
  createdAt: string;
  relatedDecisionId?: string | null;
};

export type FundReviewAuditTrailSummary = {
  totalEvents: number;
  replacementRecommendations: number;
  deferredReviews: number;
  moreResearchRequests: number;
  fundsKept: number;
  fundsOnWatch: number;
  reviewCompleted: number;
};
