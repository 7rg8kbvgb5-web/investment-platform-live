import type {
  FundResearchLifecycleBottleneck,
  FundResearchLifecycleInput,
  FundResearchLifecycleResult,
  FundResearchLifecycleStageCounts,
  FundResearchLifecycleSummary,
  OverallLifecycleStatus,
} from '../../domain/types/fund-research-lifecycle';
import type { MonitoredFund } from '../../domain/types/fund-monitoring';
import type { FundMonitoringDecision } from '../../domain/types/fund-monitoring';
import type { FundReviewAuditEvent } from '../../domain/types/fund-monitoring';
import type { ResearchRequest } from '../../domain/types/research-request';
import { PREVIEW_DATE, PREVIEW_TIMESTAMP } from '../format-timestamp';
import {
  assessMonitoredFunds,
  getMockMonitoredFunds,
} from './fund-monitoring';
import {
  getLatestDecisionForFund,
  getMockFundReviewDecisions,
  summariseFundReviewDecisions,
} from './fund-review-decisions';
import {
  getMockFundReviewAuditTrail,
  summariseFundReviewAuditTrail,
} from './fund-review-audit-trail';
import {
  analyzeResearchInbox,
  getCombinedResearchInboxItems,
} from './research-inbox';
import {
  getMockResearchRequests,
  summariseResearchRequests,
} from './research-request';


function countPendingInboxItems(
  newItems: number,
  inReviewItems: number
): number {
  return newItems + inReviewItems;
}

function countDeferredItems(
  inboxDeferred: number,
  auditDeferred: number
): number {
  return inboxDeferred + auditDeferred;
}

function isResearchOverdue(request: ResearchRequest, currentDate: string): boolean {
  if (request.status === 'Completed' || request.status === 'Cancelled') {
    return false;
  }

  return request.dueDate < currentDate;
}

function fundNeedsPendingDecision(
  fund: MonitoredFund,
  decisions: FundMonitoringDecision[]
): boolean {
  if (fund.status === 'Current' || fund.status === 'Archived') {
    return false;
  }

  const latestDecision = getLatestDecisionForFund(decisions, fund.fundId);

  if (!latestDecision) {
    return (
      fund.status === 'Review Required' ||
      fund.status === 'Replacement Candidate'
    );
  }

  if (
    fund.status === 'Review Required' ||
    fund.status === 'Replacement Candidate'
  ) {
    return (
      latestDecision.action === 'defer' ||
      latestDecision.action === 'request_more_research' ||
      latestDecision.action === 'watch'
    );
  }

  return false;
}

function countPendingDecisions(
  funds: MonitoredFund[],
  decisions: FundMonitoringDecision[]
): number {
  return funds.filter((fund) => fundNeedsPendingDecision(fund, decisions))
    .length;
}

function buildOverdueResearchBottlenecks(
  requests: ResearchRequest[],
  currentDate: string
): FundResearchLifecycleBottleneck[] {
  return requests
    .filter((request) => isResearchOverdue(request, currentDate))
    .map((request) => ({
      type: 'overdue_research' as const,
      label: request.title,
      detail: `Due ${request.dueDate} — status: ${request.status}`,
    }));
}

function buildDeferredReviewBottlenecks(
  auditEvents: FundReviewAuditEvent[]
): FundResearchLifecycleBottleneck[] {
  return auditEvents
    .filter((event) => event.eventType === 'Review Deferred')
    .map((event) => ({
      type: 'deferred_review' as const,
      label: event.fundName,
      detail: event.rationale,
    }));
}

function buildUnresolvedDecisionBottlenecks(
  funds: MonitoredFund[],
  decisions: FundMonitoringDecision[]
): FundResearchLifecycleBottleneck[] {
  return funds
    .filter((fund) => fundNeedsPendingDecision(fund, decisions))
    .map((fund) => ({
      type: 'unresolved_decision' as const,
      label: fund.fundName,
      detail: `${fund.status} — ${fund.reviewReason}`,
    }));
}

/**
 * Derives overall lifecycle status from aggregated monitoring and workflow metrics.
 */
export function determineOverallLifecycleStatus(
  input: FundResearchLifecycleInput
): OverallLifecycleStatus {
  const {
    fundMonitoringSummary,
    researchRequestSummary,
    researchInboxSummary,
    pendingDecisions,
    bottlenecks,
  } = input;

  const overdueResearchCount = bottlenecks.filter(
    (item) => item.type === 'overdue_research'
  ).length;

  if (
    fundMonitoringSummary.criticalPriorityReviews > 0 ||
    researchRequestSummary.criticalPriorityCount > 0 ||
    researchInboxSummary.criticalPriority > 0
  ) {
    return 'Critical';
  }

  if (
    fundMonitoringSummary.reviewRequired > 0 ||
    fundMonitoringSummary.replacementCandidates > 0 ||
    pendingDecisions > 0 ||
    overdueResearchCount > 0 ||
    researchRequestSummary.highPriorityCount > 0
  ) {
    return 'Action Required';
  }

  if (
    fundMonitoringSummary.fundsOnWatch > 0 ||
    input.researchInboxSummary.deferredItems > 0 ||
    input.auditTrailSummary.deferredReviews > 0
  ) {
    return 'Watch';
  }

  return 'Stable';
}

function buildStageCounts(
  input: FundResearchLifecycleInput
): FundResearchLifecycleStageCounts {
  return {
    fundMonitoring: input.fundMonitoringSummary.totalMonitoredFunds,
    researchRequest: input.researchRequestSummary.totalRequests,
    researchInbox: input.researchInboxSummary.totalItems,
    adviserDecision: input.decisionSummary.totalDecisions,
    auditTrail: input.auditTrailSummary.totalEvents,
  };
}

/**
 * Builds unified fund research lifecycle summary from existing engine outputs.
 * Does not mutate inputs.
 */
export function summariseFundResearchLifecycle(
  input: FundResearchLifecycleInput
): FundResearchLifecycleResult {
  const overallLifecycleStatus = determineOverallLifecycleStatus(input);

  const summary: FundResearchLifecycleSummary = {
    totalMonitoredFunds: input.fundMonitoringSummary.totalMonitoredFunds,
    fundsOnWatch: input.fundMonitoringSummary.fundsOnWatch,
    reviewRequiredFunds: input.fundMonitoringSummary.reviewRequired,
    replacementCandidates: input.fundMonitoringSummary.replacementCandidates,
    activeResearchRequests:
      input.researchRequestSummary.submittedCount +
      input.researchRequestSummary.inProgressCount +
      input.researchRequestSummary.waitingOnExternalCount,
    pendingInboxItems: countPendingInboxItems(
      input.researchInboxSummary.newItems,
      input.researchInboxSummary.inReviewItems
    ),
    deferredItems: countDeferredItems(
      input.researchInboxSummary.deferredItems,
      input.auditTrailSummary.deferredReviews
    ),
    completedReviews: input.auditTrailSummary.reviewCompleted,
    pendingDecisions: input.pendingDecisions,
    overallLifecycleStatus,
    asOfTimestamp: PREVIEW_TIMESTAMP,
  };

  return {
    summary,
    stageCounts: buildStageCounts(input),
    bottlenecks: input.bottlenecks,
  };
}

/**
 * Convenience helper that aggregates mock/local lifecycle data from existing engines.
 */
export function getCombinedFundResearchLifecycle(): FundResearchLifecycleResult {
  const funds = getMockMonitoredFunds();
  const decisions = getMockFundReviewDecisions();
  const requests = getMockResearchRequests();
  const auditEvents = getMockFundReviewAuditTrail();
  const inboxItems = getCombinedResearchInboxItems();

  const fundMonitoringSummary = assessMonitoredFunds(funds).summary;
  const researchRequestSummary = summariseResearchRequests(requests);
  const researchInboxSummary = analyzeResearchInbox({ items: inboxItems })
    .summary;
  const decisionSummary = summariseFundReviewDecisions(decisions);
  const auditTrailSummary = summariseFundReviewAuditTrail(auditEvents);
  const pendingDecisions = countPendingDecisions(funds, decisions);

  const bottlenecks: FundResearchLifecycleBottleneck[] = [
    ...buildOverdueResearchBottlenecks(requests, PREVIEW_DATE),
    ...buildDeferredReviewBottlenecks(auditEvents),
    ...buildUnresolvedDecisionBottlenecks(funds, decisions),
  ];

  return summariseFundResearchLifecycle({
    fundMonitoringSummary,
    researchRequestSummary,
    researchInboxSummary,
    decisionSummary,
    auditTrailSummary,
    pendingDecisions,
    bottlenecks,
  });
}

export function formatOverallLifecycleStatus(
  status: OverallLifecycleStatus
): string {
  return status;
}
