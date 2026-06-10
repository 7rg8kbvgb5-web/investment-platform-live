import type { FundMonitoringDecision } from '../../domain/types/fund-monitoring';
import type {
  ResearchInboxItem,
  ResearchInboxItemType,
  ResearchInboxPriority,
  ResearchInboxSourceType,
  ResearchInboxStatus,
} from '../../domain/types/research-inbox';
import type {
  ResearchRequest,
  ResearchRequestPriority,
  ResearchRequestSource,
  ResearchRequestStatus,
  ResearchRequestSummary,
} from '../../domain/types/research-request';
import { PREVIEW_DATE, PREVIEW_TIMESTAMP } from '../format-timestamp';

export const MOCK_RESEARCH_REQUESTS: ResearchRequest[] = [
  {
    id: 'research-req-global-quality-1',
    title: 'Global Quality Fund — peer comparison and style drift review',
    description:
      'Compare trailing placeholder performance, cost, and risk scores against top-quartile global equity peers. Confirm whether style drift remains within mandate tolerance.',
    source: 'Fund Review Decision',
    priority: 'High',
    status: 'In Progress',
    relatedFundId: 'monitored-global-quality',
    relatedFundName: 'Global Quality ETF',
    requestedBy: 'Adviser (mock)',
    createdAt: '2026-05-18T10:00:00.000Z',
    dueDate: '2026-06-18',
    relatedDecisionId: 'decision-global-quality-research-1',
  },
  {
    id: 'research-req-small-caps-1',
    title: 'Small Companies Fund — capacity and liquidity assessment',
    description:
      'Assess whether recent capacity constraints affect implementation for model portfolios. Request manager commentary on liquidity profile.',
    source: 'Fund Review Decision',
    priority: 'Critical',
    status: 'Submitted',
    relatedFundId: 'monitored-small-companies',
    relatedFundName: 'Small Companies Fund',
    requestedBy: 'Adviser (mock)',
    createdAt: '2026-05-22T14:30:00.000Z',
    dueDate: '2026-06-05',
    relatedDecisionId: 'decision-small-caps-research-1',
  },
  {
    id: 'research-req-fixed-income-1',
    title: 'Fixed Income Fund — fee structure comparison',
    description:
      'Compare ICR and transaction costs against passive core bond alternatives. No portfolio change until research is complete.',
    source: 'Adviser Request',
    priority: 'Medium',
    status: 'Waiting On External Research',
    relatedFundId: 'monitored-fixed-income',
    relatedFundName: 'Fixed Income Fund',
    requestedBy: 'Portfolio Manager (mock)',
    createdAt: '2026-05-10T09:15:00.000Z',
    dueDate: '2026-06-10',
  },
  {
    id: 'research-req-aus-equities-1',
    title: 'Australian Equities Active — manager tenure and process review',
    description:
      'Investment Committee requested deeper due diligence following placeholder underperformance signal.',
    source: 'Investment Committee',
    priority: 'High',
    status: 'In Progress',
    relatedFundId: 'monitored-aus-equities-active',
    relatedFundName: 'Australian Equities Active Fund',
    requestedBy: 'Investment Committee (mock)',
    createdAt: '2026-05-25T11:00:00.000Z',
    dueDate: '2026-07-01',
  },
  {
    id: 'research-req-emerging-markets-1',
    title: 'Emerging Markets Fund — benchmark and attribution check',
    description:
      'Alert-driven review of relative benchmark underperformance. Confirm whether tactical overlay exposure should be adjusted.',
    source: 'Alert Engine',
    priority: 'High',
    status: 'Submitted',
    relatedFundId: 'monitored-emerging-markets',
    relatedFundName: 'Emerging Markets Fund',
    requestedBy: 'Alert Engine (mock)',
    createdAt: '2026-06-01T08:00:00.000Z',
    dueDate: '2026-06-20',
  },
  {
    id: 'research-req-alternatives-completed',
    title: 'Alternatives Fund — replacement candidate validation',
    description:
      'Completed research validating Alternatives Plus Fund as preferred replacement on cost and risk scores.',
    source: 'Fund Review Decision',
    priority: 'Medium',
    status: 'Completed',
    relatedFundId: 'monitored-alternatives',
    relatedFundName: 'Alternatives Fund',
    requestedBy: 'Adviser (mock)',
    createdAt: '2026-04-15T13:00:00.000Z',
    dueDate: '2026-05-15',
    relatedDecisionId: 'decision-alternatives-research-complete',
  },
];

export type CreateResearchRequestFromFundDecisionInput = {
  decision: FundMonitoringDecision;
  requestIndex?: number;
  priority?: ResearchRequestPriority;
  dueDate?: string;
};

function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function requestTimestamp(requestIndex: number): string {
  const base = new Date(PREVIEW_TIMESTAMP);
  base.setUTCMinutes(base.getUTCMinutes() + requestIndex);
  return base.toISOString();
}

function defaultPriorityForFundDecision(
  decision: FundMonitoringDecision
): ResearchRequestPriority {
  if (decision.replacementFundId) {
    return 'High';
  }

  return 'Medium';
}

function buildResearchRequestTitle(decision: FundMonitoringDecision): string {
  return `${decision.fundName} — additional research required`;
}

function buildResearchRequestDescription(
  decision: FundMonitoringDecision
): string {
  return `Research request raised following fund review decision. Adviser rationale: ${decision.rationale}`;
}

/**
 * Creates a structured research request when an adviser selects
 * "Request More Research" on a fund monitoring decision.
 * Does not mutate portfolio holdings — workflow foundation only.
 */
export function createResearchRequestFromFundDecision({
  decision,
  requestIndex = 0,
  priority,
  dueDate,
}: CreateResearchRequestFromFundDecisionInput): ResearchRequest | null {
  if (decision.action !== 'request_more_research') {
    return null;
  }

  const trimmedRationale = decision.rationale.trim();
  if (!trimmedRationale) {
    return null;
  }

  const resolvedPriority = priority ?? defaultPriorityForFundDecision(decision);
  const resolvedDueDate =
    dueDate ??
    decision.nextReviewDate ??
    addDaysToIsoDate(PREVIEW_DATE, 21);

  return {
    id: `research-req-${decision.fundId}-${requestIndex}`,
    title: buildResearchRequestTitle(decision),
    description: buildResearchRequestDescription(decision),
    source: 'Fund Review Decision',
    priority: resolvedPriority,
    status: 'Submitted',
    relatedFundId: decision.fundId,
    relatedFundName: decision.fundName,
    requestedBy: decision.decidedBy,
    createdAt: decision.decidedAt ?? requestTimestamp(requestIndex),
    dueDate: resolvedDueDate,
    relatedDecisionId: decision.id,
  };
}

export function formatResearchRequestStatus(status: ResearchRequestStatus): string {
  return status;
}

export function formatResearchRequestPriority(
  priority: ResearchRequestPriority
): string {
  return priority;
}

export function formatResearchRequestSource(source: ResearchRequestSource): string {
  return source;
}

function sortResearchRequestsChronologically(
  requests: ResearchRequest[]
): ResearchRequest[] {
  return [...requests].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export function summariseResearchRequests(
  requests: ResearchRequest[]
): ResearchRequestSummary {
  return {
    totalRequests: requests.length,
    submittedCount: requests.filter(
      (request) => request.status === 'Submitted'
    ).length,
    inProgressCount: requests.filter(
      (request) => request.status === 'In Progress'
    ).length,
    waitingOnExternalCount: requests.filter(
      (request) => request.status === 'Waiting On External Research'
    ).length,
    completedCount: requests.filter(
      (request) => request.status === 'Completed'
    ).length,
    criticalPriorityCount: requests.filter(
      (request) => request.priority === 'Critical'
    ).length,
    highPriorityCount: requests.filter(
      (request) => request.priority === 'High'
    ).length,
    fromFundReviewDecisionCount: requests.filter(
      (request) => request.source === 'Fund Review Decision'
    ).length,
  };
}

export function getMockResearchRequests(): ResearchRequest[] {
  return MOCK_RESEARCH_REQUESTS.map((request) => ({ ...request }));
}

export function sortResearchRequests(
  requests: ResearchRequest[]
): ResearchRequest[] {
  return sortResearchRequestsChronologically(requests);
}

function mapResearchRequestStatusToInboxStatus(
  status: ResearchRequestStatus
): ResearchInboxStatus {
  switch (status) {
    case 'Draft':
    case 'Submitted':
      return 'New';
    case 'In Progress':
    case 'Waiting On External Research':
      return 'In Review';
    case 'Completed':
      return 'Resolved';
    case 'Cancelled':
      return 'Rejected';
  }
}

function mapResearchRequestSourceToInboxSourceType(
  source: ResearchRequestSource
): ResearchInboxSourceType {
  switch (source) {
    case 'Fund Review Decision':
    case 'Alert Engine':
      return 'Fund Monitor';
    case 'Adviser Request':
      return 'Adviser Request';
    case 'Investment Committee':
      return 'Investment Committee';
    case 'Manual Entry':
      return 'Manual Entry';
  }
}

function mapResearchRequestSourceToInboxItemType(
  source: ResearchRequestSource
): ResearchInboxItemType {
  switch (source) {
    case 'Fund Review Decision':
    case 'Alert Engine':
      return 'Fund Monitoring Alert';
    case 'Investment Committee':
      return 'Adviser Review Task';
    case 'Adviser Request':
    case 'Manual Entry':
      return 'Incoming Research';
  }
}

function mapResearchRequestPriorityToInboxPriority(
  priority: ResearchRequestPriority
): ResearchInboxPriority {
  return priority;
}

/**
 * Converts a structured research request into a research inbox item.
 * Does not mutate the source request.
 */
export function convertResearchRequestToInboxItem(
  request: ResearchRequest
): ResearchInboxItem {
  const dueDateNote = request.dueDate
    ? ` Due date: ${request.dueDate}.`
    : '';

  return {
    id: `ri-from-${request.id}`,
    title: request.title,
    summary: `${request.description}${dueDateNote}`,
    itemType: mapResearchRequestSourceToInboxItemType(request.source),
    status: mapResearchRequestStatusToInboxStatus(request.status),
    priority: mapResearchRequestPriorityToInboxPriority(request.priority),
    sourceType: mapResearchRequestSourceToInboxSourceType(request.source),
    origin: 'system',
    receivedAt: request.createdAt,
    relatedEntityId: request.relatedFundId,
    assignedTo: request.requestedBy,
    sourceResearchRequestId: request.id,
  };
}
