import type {
  FundMonitoringDecision,
  FundMonitoringDecisionAction,
  FundReviewAuditEvent,
  FundReviewAuditEventType,
  FundReviewAuditTrailSummary,
} from '../../domain/types/fund-monitoring';
import { PREVIEW_TIMESTAMP } from '../format-timestamp';
import { formatFundMonitoringDecisionAction } from './fund-review-decisions';

/** Stable mock audit trail aligned with mock fund review decisions. */
export const MOCK_FUND_REVIEW_AUDIT_EVENTS: FundReviewAuditEvent[] = [
  {
    id: 'audit-emerging-markets-kept',
    fundId: 'monitored-emerging-markets',
    fundName: 'Emerging Markets Fund',
    eventType: 'Fund Kept',
    action: 'keep',
    rationale:
      'Fund remains aligned with model portfolio mandate after quarterly review.',
    createdBy: 'Adviser (mock)',
    createdAt: '2026-05-01T09:00:00.000Z',
    relatedDecisionId: 'decision-emerging-markets-1',
  },
  {
    id: 'audit-aus-equities-watch',
    fundId: 'monitored-aus-equities-active',
    fundName: 'Australian Equities Active Fund',
    eventType: 'Fund Placed On Watch',
    action: 'watch',
    rationale:
      'Style drift noted on placeholder metrics; continue monitoring at next review cycle.',
    createdBy: 'Adviser (mock)',
    createdAt: '2026-05-15T10:30:00.000Z',
    relatedDecisionId: 'decision-aus-equities-1',
  },
  {
    id: 'audit-alternatives-replace',
    fundId: 'monitored-alternatives',
    fundName: 'Alternatives Fund',
    eventType: 'Replacement Recommended',
    action: 'replace',
    rationale:
      'Better alternative identified on cost and risk-adjusted placeholder scores; subject to IC approval before implementation.',
    createdBy: 'Adviser (mock)',
    createdAt: '2026-05-20T14:00:00.000Z',
    relatedDecisionId: 'decision-alternatives-1',
  },
  {
    id: 'audit-global-quality-research',
    fundId: 'monitored-global-quality',
    fundName: 'Global Quality ETF',
    eventType: 'More Research Requested',
    action: 'request_more_research',
    rationale:
      'Awaiting updated manager due diligence and capacity analysis before alternative review.',
    createdBy: 'S. Nguyen',
    createdAt: '2026-06-02T11:15:00.000Z',
    relatedDecisionId: 'decision-global-quality-research-1',
  },
  {
    id: 'audit-fixed-income-deferred',
    fundId: 'monitored-fixed-income',
    fundName: 'Fixed Income Fund',
    eventType: 'Review Deferred',
    action: 'defer',
    rationale:
      'Review deferred pending updated liquidity stress testing from the manager.',
    createdBy: 'A. Patel',
    createdAt: '2026-06-05T09:00:00.000Z',
    relatedDecisionId: 'decision-fixed-income-defer-1',
  },
  {
    id: 'audit-small-companies-completed',
    fundId: 'monitored-small-companies',
    fundName: 'Small Companies Fund',
    eventType: 'Review Completed',
    action: 'keep',
    rationale:
      'Scheduled annual review completed; fund remains current with no action required.',
    createdBy: 'J. Mitchell',
    createdAt: '2026-06-08T14:30:00.000Z',
    relatedDecisionId: 'decision-small-companies-complete-1',
  },
];

export type CreateFundReviewAuditEventInput = {
  fundId: string;
  fundName: string;
  action: FundMonitoringDecisionAction;
  rationale: string;
  createdBy?: string;
  createdAt?: string;
  relatedDecisionId?: string | null;
  /** Used to derive stable sequential timestamps in local mock state. */
  eventIndex?: number;
  /** Override mapped event type when needed (e.g. Review Completed). */
  eventType?: FundReviewAuditEventType;
};

function auditEventTimestamp(eventIndex: number): string {
  const base = new Date(PREVIEW_TIMESTAMP);
  base.setUTCMinutes(base.getUTCMinutes() + eventIndex);
  return base.toISOString();
}

export function mapDecisionActionToAuditEventType(
  action: FundMonitoringDecisionAction
): FundReviewAuditEventType {
  switch (action) {
    case 'keep':
      return 'Fund Kept';
    case 'watch':
      return 'Fund Placed On Watch';
    case 'replace':
      return 'Replacement Recommended';
    case 'defer':
      return 'Review Deferred';
    case 'request_more_research':
      return 'More Research Requested';
  }
}

export function formatFundReviewAuditEventType(
  eventType: FundReviewAuditEventType
): string {
  return eventType;
}

function compareEventsNewestFirst(
  left: FundReviewAuditEvent,
  right: FundReviewAuditEvent
): number {
  return (
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

/**
 * Creates an immutable audit event from a fund monitoring decision.
 * Does not mutate portfolio holdings — governance record only.
 */
export function createFundReviewAuditEvent({
  fundId,
  fundName,
  action,
  rationale,
  createdBy = 'Adviser (mock)',
  createdAt,
  relatedDecisionId = null,
  eventIndex = 0,
  eventType,
}: CreateFundReviewAuditEventInput): FundReviewAuditEvent | null {
  const trimmedRationale = rationale.trim();

  if (!trimmedRationale) {
    return null;
  }

  const resolvedEventType = eventType ?? mapDecisionActionToAuditEventType(action);
  const resolvedTimestamp = createdAt ?? auditEventTimestamp(eventIndex);

  return {
    id: `audit-${fundId}-${eventIndex}`,
    fundId,
    fundName,
    eventType: resolvedEventType,
    action,
    rationale: trimmedRationale,
    createdBy,
    createdAt: resolvedTimestamp,
    relatedDecisionId,
  };
}

/**
 * Creates an audit event directly from an existing fund monitoring decision record.
 */
export function createFundReviewAuditEventFromDecision(
  decision: FundMonitoringDecision,
  eventIndex = 0,
  eventType?: FundReviewAuditEventType
): FundReviewAuditEvent {
  return {
    id: `audit-${decision.id}`,
    fundId: decision.fundId,
    fundName: decision.fundName,
    eventType: eventType ?? mapDecisionActionToAuditEventType(decision.action),
    action: decision.action,
    rationale: decision.rationale,
    createdBy: decision.decidedBy,
    createdAt: decision.decidedAt,
    relatedDecisionId: decision.id,
  };
}

export function getMockFundReviewAuditTrail(): FundReviewAuditEvent[] {
  return MOCK_FUND_REVIEW_AUDIT_EVENTS.map((event) => ({ ...event }));
}

export function sortFundReviewAuditEvents(
  events: FundReviewAuditEvent[]
): FundReviewAuditEvent[] {
  return [...events].sort(compareEventsNewestFirst);
}

export function summariseFundReviewAuditTrail(
  events: FundReviewAuditEvent[]
): FundReviewAuditTrailSummary {
  return {
    totalEvents: events.length,
    replacementRecommendations: events.filter(
      (event) => event.eventType === 'Replacement Recommended'
    ).length,
    deferredReviews: events.filter(
      (event) => event.eventType === 'Review Deferred'
    ).length,
    moreResearchRequests: events.filter(
      (event) => event.eventType === 'More Research Requested'
    ).length,
    fundsKept: events.filter((event) => event.eventType === 'Fund Kept').length,
    fundsOnWatch: events.filter(
      (event) => event.eventType === 'Fund Placed On Watch'
    ).length,
    reviewCompleted: events.filter(
      (event) => event.eventType === 'Review Completed'
    ).length,
  };
}

export function formatAuditEventActionLabel(
  action: FundMonitoringDecisionAction
): string {
  return formatFundMonitoringDecisionAction(action);
}
