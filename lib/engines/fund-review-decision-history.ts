import type {
  FundReviewAction,
  FundReviewDecision,
  FundReviewStatus,
} from '../../domain/types/fund-monitoring';
import { isTerminalReviewStatus } from './fund-review-lifecycle';

export type FundReviewDecisionHistoryInput = {
  decisions: FundReviewDecision[];
  /** Status before any decisions are recorded. Defaults to Open. */
  initialStatus?: FundReviewStatus;
};

export type FundReviewDecisionHistoryResult = {
  sortedDecisions: FundReviewDecision[];
  latestDecision: FundReviewDecision | null;
  currentStatus: FundReviewStatus;
  isLocked: boolean;
  countsByAction: Record<FundReviewAction, number>;
  countsByStatus: Record<FundReviewStatus, number>;
};

const ALL_ACTIONS: FundReviewAction[] = [
  'accept',
  'reject',
  'defer',
  'request_more_research',
];

const ALL_STATUSES: FundReviewStatus[] = [
  'Open',
  'Under Review',
  'Deferred',
  'Accepted',
  'Rejected',
  'Research Requested',
  'Closed',
];

function emptyActionCounts(): Record<FundReviewAction, number> {
  return {
    accept: 0,
    reject: 0,
    defer: 0,
    request_more_research: 0,
  };
}

function emptyStatusCounts(): Record<FundReviewStatus, number> {
  return {
    Open: 0,
    'Under Review': 0,
    Deferred: 0,
    Accepted: 0,
    Rejected: 0,
    'Research Requested': 0,
    Closed: 0,
  };
}

function compareDecisionsChronologically(
  a: FundReviewDecision,
  b: FundReviewDecision
): number {
  const timeDiff =
    new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime();

  if (timeDiff !== 0) {
    return timeDiff;
  }

  return 0;
}

/**
 * Derives decision history views from a list of adviser decisions.
 * Does not mutate the input array.
 */
export function analyzeFundReviewDecisionHistory({
  decisions,
  initialStatus = 'Open',
}: FundReviewDecisionHistoryInput): FundReviewDecisionHistoryResult {
  const sortedDecisions = [...decisions].sort(compareDecisionsChronologically);
  const latestDecision =
    sortedDecisions.length > 0
      ? sortedDecisions[sortedDecisions.length - 1]
      : null;

  const currentStatus = latestDecision?.status ?? initialStatus;

  const countsByAction = emptyActionCounts();
  const countsByStatus = emptyStatusCounts();

  for (const action of ALL_ACTIONS) {
    countsByAction[action] = sortedDecisions.filter(
      (decision) => decision.action === action
    ).length;
  }

  for (const status of ALL_STATUSES) {
    countsByStatus[status] = sortedDecisions.filter(
      (decision) => decision.status === status
    ).length;
  }

  return {
    sortedDecisions,
    latestDecision,
    currentStatus,
    isLocked: isTerminalReviewStatus(currentStatus),
    countsByAction,
    countsByStatus,
  };
}
