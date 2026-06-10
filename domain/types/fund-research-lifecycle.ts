import type {
  FundMonitoringDecisionSummary,
  FundMonitoringSummary,
  FundReviewAuditTrailSummary,
} from './fund-monitoring';
import type { ResearchInboxSummary } from './research-inbox';
import type { ResearchRequestSummary } from './research-request';

/** Overall lifecycle health across fund monitoring, research, and governance. */
export type OverallLifecycleStatus =
  | 'Stable'
  | 'Watch'
  | 'Action Required'
  | 'Critical';

/** Aggregated metrics for the fund research and governance lifecycle. */
export type FundResearchLifecycleSummary = {
  totalMonitoredFunds: number;
  fundsOnWatch: number;
  reviewRequiredFunds: number;
  replacementCandidates: number;
  activeResearchRequests: number;
  pendingInboxItems: number;
  deferredItems: number;
  completedReviews: number;
  pendingDecisions: number;
  overallLifecycleStatus: OverallLifecycleStatus;
  /** Stable preview timestamp for display (SSR-safe). */
  asOfTimestamp: string;
};

/** Category of bottleneck in the fund research lifecycle. */
export type FundResearchLifecycleBottleneckType =
  | 'overdue_research'
  | 'deferred_review'
  | 'unresolved_decision';

/** A single bottleneck item blocking lifecycle progress. */
export type FundResearchLifecycleBottleneck = {
  type: FundResearchLifecycleBottleneckType;
  label: string;
  detail: string;
};

/** Counts for each lifecycle workflow stage. */
export type FundResearchLifecycleStageCounts = {
  fundMonitoring: number;
  researchRequest: number;
  researchInbox: number;
  adviserDecision: number;
  auditTrail: number;
};

export type FundResearchLifecycleInput = {
  fundMonitoringSummary: FundMonitoringSummary;
  researchRequestSummary: ResearchRequestSummary;
  researchInboxSummary: ResearchInboxSummary;
  decisionSummary: FundMonitoringDecisionSummary;
  auditTrailSummary: FundReviewAuditTrailSummary;
  pendingDecisions: number;
  bottlenecks: FundResearchLifecycleBottleneck[];
};

export type FundResearchLifecycleResult = {
  summary: FundResearchLifecycleSummary;
  stageCounts: FundResearchLifecycleStageCounts;
  bottlenecks: FundResearchLifecycleBottleneck[];
};
