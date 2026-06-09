import type {
  FundMonitoringReview,
  FundReviewAction,
  FundReviewDecision,
  FundReviewLifecycle,
  FundReviewStatus,
} from '../../domain/types/fund-monitoring';
import { PREVIEW_TIMESTAMP } from '../format-timestamp';

const TERMINAL_STATUSES: FundReviewStatus[] = [
  'Accepted',
  'Rejected',
  'Closed',
];

export function statusForReviewAction(
  action: FundReviewAction
): FundReviewStatus {
  switch (action) {
    case 'accept':
      return 'Accepted';
    case 'reject':
      return 'Rejected';
    case 'defer':
      return 'Deferred';
    case 'request_more_research':
      return 'Research Requested';
  }
}

export function initialReviewStatus(
  review: FundMonitoringReview
): FundReviewStatus {
  if (!review.requiresAdviserReview) {
    return 'Closed';
  }

  return 'Open';
}

export function isTerminalReviewStatus(status: FundReviewStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function formatFundReviewStatus(status: FundReviewStatus): string {
  return status;
}

export function formatFundReviewAction(action: FundReviewAction): string {
  switch (action) {
    case 'accept':
      return 'Accept';
    case 'reject':
      return 'Reject';
    case 'defer':
      return 'Defer';
    case 'request_more_research':
      return 'Request More Research';
  }
}

export function createFundReviewLifecycle(
  review: FundMonitoringReview,
  timestamp?: string
): FundReviewLifecycle {
  const resolvedTimestamp = timestamp ?? review.timestamp ?? PREVIEW_TIMESTAMP;

  return {
    currentStatus: initialReviewStatus(review),
    decisions: [],
    lastUpdatedAt: resolvedTimestamp,
  };
}

export type ApplyFundReviewDecisionInput = {
  action: FundReviewAction;
  rationale: string;
  decidedBy?: string | null;
  timestamp?: string;
};

/**
 * Records an adviser decision and advances the review lifecycle.
 * Does not mutate the input lifecycle — returns a new object.
 */
export function applyFundReviewDecision(
  lifecycle: FundReviewLifecycle,
  { action, rationale, decidedBy = null, timestamp }: ApplyFundReviewDecisionInput
): FundReviewLifecycle {
  const trimmedRationale = rationale.trim();

  if (!trimmedRationale) {
    return lifecycle;
  }

  const nextStatus = statusForReviewAction(action);
  const decidedAt = timestamp ?? PREVIEW_TIMESTAMP;

  const decision: FundReviewDecision = {
    action,
    rationale: trimmedRationale,
    decidedAt,
    status: nextStatus,
    decidedBy,
  };

  return {
    currentStatus: nextStatus,
    decisions: [...lifecycle.decisions, decision],
    lastUpdatedAt: decidedAt,
  };
}
