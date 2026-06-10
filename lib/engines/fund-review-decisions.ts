import type {
  FundMonitoringDecision,
  FundMonitoringDecisionAction,
  FundMonitoringDecisionSummary,
} from '../../domain/types/fund-monitoring';
import { PREVIEW_DATE, PREVIEW_TIMESTAMP } from '../format-timestamp';

export const FUND_MONITORING_DECISION_ACTIONS: FundMonitoringDecisionAction[] = [
  'keep',
  'watch',
  'replace',
  'defer',
  'request_more_research',
];

export const MOCK_FUND_MONITORING_DECISIONS: FundMonitoringDecision[] = [
  {
    id: 'decision-emerging-markets-1',
    fundId: 'monitored-emerging-markets',
    fundName: 'Emerging Markets Fund',
    action: 'keep',
    rationale:
      'Fund remains aligned with model portfolio mandate after quarterly review.',
    decidedBy: 'Adviser (mock)',
    decidedAt: '2026-05-01T09:00:00.000Z',
  },
  {
    id: 'decision-aus-equities-1',
    fundId: 'monitored-aus-equities-active',
    fundName: 'Australian Equities Active Fund',
    action: 'watch',
    rationale:
      'Style drift noted on placeholder metrics; continue monitoring at next review cycle.',
    decidedBy: 'Adviser (mock)',
    decidedAt: '2026-05-15T10:30:00.000Z',
    nextReviewDate: '2026-07-20',
  },
  {
    id: 'decision-alternatives-1',
    fundId: 'monitored-alternatives',
    fundName: 'Alternatives Fund',
    action: 'replace',
    rationale:
      'Better alternative identified on cost and risk-adjusted placeholder scores; subject to IC approval before implementation.',
    decidedBy: 'Adviser (mock)',
    decidedAt: '2026-05-20T14:00:00.000Z',
    replacementFundId: 'candidate-alternatives-plus',
    replacementFundName: 'Alternatives Plus Fund',
  },
];

export type CreateFundReviewDecisionInput = {
  fundId: string;
  fundName: string;
  action: FundMonitoringDecisionAction;
  rationale: string;
  decidedBy?: string;
  decidedAt?: string;
  nextReviewDate?: string | null;
  replacementFundId?: string | null;
  replacementFundName?: string | null;
  /** Used to derive stable sequential timestamps in local mock state. */
  decisionIndex?: number;
};

function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function decisionTimestamp(decisionIndex: number): string {
  const base = new Date(PREVIEW_TIMESTAMP);
  base.setUTCMinutes(base.getUTCMinutes() + decisionIndex);
  return base.toISOString();
}

function defaultNextReviewDate(
  action: FundMonitoringDecisionAction
): string | null {
  switch (action) {
    case 'watch':
      return addDaysToIsoDate(PREVIEW_DATE, 90);
    case 'defer':
      return addDaysToIsoDate(PREVIEW_DATE, 180);
    case 'request_more_research':
      return addDaysToIsoDate(PREVIEW_DATE, 30);
    case 'keep':
    case 'replace':
      return null;
  }
}

export function formatFundMonitoringDecisionAction(
  action: FundMonitoringDecisionAction
): string {
  switch (action) {
    case 'keep':
      return 'Keep';
    case 'watch':
      return 'Watch';
    case 'replace':
      return 'Replace';
    case 'defer':
      return 'Defer';
    case 'request_more_research':
      return 'Request More Research';
  }
}

function sortDecisionsChronologically(
  decisions: FundMonitoringDecision[]
): FundMonitoringDecision[] {
  return [...decisions].sort(
    (left, right) =>
      new Date(left.decidedAt).getTime() - new Date(right.decidedAt).getTime()
  );
}

export function getLatestDecisionForFund(
  decisions: FundMonitoringDecision[],
  fundId: string
): FundMonitoringDecision | null {
  const fundDecisions = decisions.filter(
    (decision) => decision.fundId === fundId
  );

  if (fundDecisions.length === 0) {
    return null;
  }

  return sortDecisionsChronologically(fundDecisions).at(-1) ?? null;
}

export function getDecisionsForFund(
  decisions: FundMonitoringDecision[],
  fundId: string
): FundMonitoringDecision[] {
  return sortDecisionsChronologically(
    decisions.filter((decision) => decision.fundId === fundId)
  );
}

/**
 * Creates a governed fund monitoring decision record.
 * Does not mutate portfolio holdings — adviser review workflow only.
 */
export function createFundReviewDecision({
  fundId,
  fundName,
  action,
  rationale,
  decidedBy = 'Adviser (mock)',
  decidedAt,
  nextReviewDate,
  replacementFundId = null,
  replacementFundName = null,
  decisionIndex = 0,
}: CreateFundReviewDecisionInput): FundMonitoringDecision | null {
  const trimmedRationale = rationale.trim();

  if (!trimmedRationale) {
    return null;
  }

  if (action === 'replace' && !replacementFundId?.trim()) {
    return null;
  }

  const resolvedTimestamp = decidedAt ?? decisionTimestamp(decisionIndex);
  const resolvedNextReviewDate =
    nextReviewDate !== undefined
      ? nextReviewDate
      : defaultNextReviewDate(action);

  return {
    id: `decision-${fundId}-${decisionIndex}`,
    fundId,
    fundName,
    action,
    rationale: trimmedRationale,
    decidedBy,
    decidedAt: resolvedTimestamp,
    nextReviewDate: resolvedNextReviewDate,
    replacementFundId: action === 'replace' ? replacementFundId : null,
    replacementFundName:
      action === 'replace' ? replacementFundName ?? null : null,
  };
}

export function summariseFundReviewDecisions(
  decisions: FundMonitoringDecision[]
): FundMonitoringDecisionSummary {
  const fundIds = new Set(decisions.map((decision) => decision.fundId));

  return {
    totalDecisions: decisions.length,
    keepCount: decisions.filter((decision) => decision.action === 'keep').length,
    watchCount: decisions.filter((decision) => decision.action === 'watch')
      .length,
    replaceCount: decisions.filter((decision) => decision.action === 'replace')
      .length,
    deferCount: decisions.filter((decision) => decision.action === 'defer')
      .length,
    requestMoreResearchCount: decisions.filter(
      (decision) => decision.action === 'request_more_research'
    ).length,
    fundsWithDecisions: fundIds.size,
  };
}

export function getMockFundReviewDecisions(): FundMonitoringDecision[] {
  return MOCK_FUND_MONITORING_DECISIONS.map((decision) => ({ ...decision }));
}
