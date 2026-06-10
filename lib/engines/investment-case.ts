import type {
  InvestmentCase,
  InvestmentCaseAction,
  InvestmentCaseAuditEntry,
  InvestmentCasePriority,
  InvestmentCaseSource,
  InvestmentCaseStatus,
  InvestmentCaseSummary,
} from '../../domain/types/investment-case';
import { PREVIEW_TIMESTAMP } from '../format-timestamp';

const MOCK_CREATED_AT = '2026-05-28T09:00:00.000Z';
const MOCK_UPDATED_AT = '2026-06-08T14:30:00.000Z';

export const MOCK_INVESTMENT_CASES: InvestmentCase[] = [
  {
    id: 'case-global-quality-replacement',
    title: 'Global Quality Fund — replacement candidate review',
    fundName: 'Global Quality ETF',
    source: 'Fund Monitoring',
    status: 'Committee Review',
    priority: 'High',
    owner: 'Portfolio Manager (mock)',
    summary:
      'Fund monitoring assessment flagged a better alternative on cost and risk scores. Replacement requires committee sign-off before model portfolio update.',
    rationale:
      'Alternatives Plus Global Equity scores higher on placeholder cost and liquidity metrics while maintaining comparable risk profile.',
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-06-07T11:00:00.000Z',
    actions: [
      {
        id: 'case-audit-global-quality-1',
        action: 'Created',
        toStatus: 'New',
        rationale: 'Fund monitoring assessment identified replacement candidate.',
        user: 'Fund Monitoring (mock)',
        timestamp: '2026-05-20T10:00:00.000Z',
      },
      {
        id: 'case-audit-global-quality-2',
        action: 'Escalated to Research',
        fromStatus: 'New',
        toStatus: 'Research',
        rationale: 'Peer comparison and style drift research requested before committee submission.',
        user: 'Adviser (mock)',
        timestamp: '2026-05-22T14:00:00.000Z',
      },
      {
        id: 'case-audit-global-quality-3',
        action: 'Submitted to Committee',
        fromStatus: 'Under Review',
        toStatus: 'Committee Review',
        rationale: 'Research complete. Recommend committee review for model portfolio replacement.',
        user: 'Portfolio Manager (mock)',
        timestamp: '2026-06-07T11:00:00.000Z',
      },
    ],
  },
  {
    id: 'case-aus-equities-underperformance',
    title: 'Australian Equities Active — underperformance alert',
    fundName: 'Australian Equities Active Fund',
    source: 'Alert Engine',
    status: 'Research',
    priority: 'Critical',
    owner: 'Adviser (mock)',
    summary:
      'Rule-generated alert for benchmark-relative underperformance. Structured research underway before fund review decision.',
    rationale:
      'Trailing placeholder performance below benchmark tolerance for two consecutive review periods.',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-05T09:30:00.000Z',
    actions: [
      {
        id: 'case-audit-aus-equities-1',
        action: 'Created',
        toStatus: 'New',
        rationale: 'Alert rule triggered benchmark underperformance threshold.',
        user: 'Alert Engine (mock)',
        timestamp: '2026-06-01T08:00:00.000Z',
      },
      {
        id: 'case-audit-aus-equities-2',
        action: 'Escalated to Research',
        fromStatus: 'New',
        toStatus: 'Research',
        rationale: 'Adviser requested attribution analysis before fund review escalation.',
        user: 'Adviser (mock)',
        timestamp: '2026-06-05T09:30:00.000Z',
      },
    ],
  },
  {
    id: 'case-private-credit-house-view',
    title: 'Private Credit — house view alignment review',
    fundName: 'Private Credit Fund',
    source: 'Investment Committee',
    status: 'Under Review',
    priority: 'Medium',
    owner: 'Investment Committee (mock)',
    summary:
      'House view update prompts review of private credit exposure across model portfolios. No automatic allocation change.',
    rationale:
      'Positive house view on private credit warrants confirmation that current fund line-up remains best-in-class.',
    createdAt: '2026-05-15T13:00:00.000Z',
    updatedAt: '2026-06-03T10:00:00.000Z',
    actions: [
      {
        id: 'case-audit-private-credit-1',
        action: 'Created',
        toStatus: 'New',
        rationale: 'Investment Committee scheduled review following house view update.',
        user: 'Investment Committee (mock)',
        timestamp: '2026-05-15T13:00:00.000Z',
      },
      {
        id: 'case-audit-private-credit-2',
        action: 'Moved to Fund Review',
        fromStatus: 'Research',
        toStatus: 'Under Review',
        rationale: 'Initial research confirms fund remains suitable; formal fund review in progress.',
        user: 'Portfolio Manager (mock)',
        timestamp: '2026-06-03T10:00:00.000Z',
      },
    ],
  },
  {
    id: 'case-small-caps-deferred',
    title: 'Small Companies Fund — capacity concern deferred',
    fundName: 'Small Companies Fund',
    source: 'Fund Review',
    status: 'Deferred',
    priority: 'High',
    owner: 'Adviser (mock)',
    summary:
      'Fund review decision deferred pending manager capacity commentary. Case remains open in governance queue.',
    rationale:
      'Adviser deferred pending Q3 capacity update from fund manager. No portfolio change until review resumes.',
    createdAt: '2026-05-10T11:00:00.000Z',
    updatedAt: '2026-05-25T16:00:00.000Z',
    actions: [
      {
        id: 'case-audit-small-caps-1',
        action: 'Created',
        toStatus: 'New',
        rationale: 'Fund review flagged capacity concern from monitoring assessment.',
        user: 'Fund Review (mock)',
        timestamp: '2026-05-10T11:00:00.000Z',
      },
      {
        id: 'case-audit-small-caps-2',
        action: 'Deferred',
        fromStatus: 'Under Review',
        toStatus: 'Deferred',
        rationale: 'Awaiting manager capacity update before replacement decision.',
        user: 'Adviser (mock)',
        timestamp: '2026-05-25T16:00:00.000Z',
      },
    ],
  },
  {
    id: 'case-emerging-markets-approved',
    title: 'Emerging Markets Fund — fee reduction approved',
    fundName: 'Emerging Markets Fund',
    source: 'Governance',
    status: 'Approved',
    priority: 'Medium',
    owner: 'Governance Officer (mock)',
    summary:
      'Committee approved switch to lower-cost share class following governance review. Implementation checklist pending.',
    rationale:
      'Fee reduction improves net-of-fee outcome with no material change to investment process or risk profile.',
    createdAt: '2026-04-20T09:00:00.000Z',
    updatedAt: '2026-05-18T15:00:00.000Z',
    actions: [
      {
        id: 'case-audit-emerging-markets-1',
        action: 'Created',
        toStatus: 'New',
        rationale: 'Governance review initiated from portfolio drift guardrail warning.',
        user: 'Governance (mock)',
        timestamp: '2026-04-20T09:00:00.000Z',
      },
      {
        id: 'case-audit-emerging-markets-2',
        action: 'Approved',
        fromStatus: 'Committee Review',
        toStatus: 'Approved',
        rationale: 'Investment Committee approved share class switch subject to implementation checklist.',
        user: 'Investment Committee (mock)',
        timestamp: '2026-05-18T15:00:00.000Z',
      },
    ],
  },
  {
    id: 'case-research-inbox-infrastructure',
    title: 'Infrastructure Fund — research inbox escalation',
    fundName: 'Infrastructure Fund',
    source: 'Research Inbox',
    status: 'New',
    priority: 'Low',
    owner: 'Research Team (mock)',
    summary:
      'Research inbox item escalated to unified investment case for cross-workflow tracking.',
    rationale:
      'Incoming external research note suggests reviewing liquidity profile at current allocation weights.',
    createdAt: MOCK_CREATED_AT,
    updatedAt: MOCK_CREATED_AT,
    actions: [
      {
        id: 'case-audit-infrastructure-1',
        action: 'Created',
        toStatus: 'New',
        rationale: 'Research inbox item converted to investment case for lifecycle tracking.',
        user: 'Research Team (mock)',
        timestamp: MOCK_CREATED_AT,
      },
    ],
  },
  {
    id: 'case-fixed-income-rejected',
    title: 'Fixed Income Fund — replacement rejected',
    fundName: 'Fixed Income Fund',
    source: 'Fund Monitoring',
    status: 'Rejected',
    priority: 'High',
    owner: 'Investment Committee (mock)',
    summary:
      'Committee rejected passive replacement proposal. Current fund retained with enhanced monitoring.',
    rationale:
      'Active management value-add and credit selection process deemed sufficient despite higher fees.',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-04-10T12:00:00.000Z',
    actions: [
      {
        id: 'case-audit-fixed-income-1',
        action: 'Created',
        toStatus: 'New',
        rationale: 'Fund monitoring flagged fee concern and passive alternative.',
        user: 'Fund Monitoring (mock)',
        timestamp: '2026-03-01T10:00:00.000Z',
      },
      {
        id: 'case-audit-fixed-income-2',
        action: 'Rejected',
        fromStatus: 'Committee Review',
        toStatus: 'Rejected',
        rationale: 'Committee rejected replacement; fund placed on enhanced watch list.',
        user: 'Investment Committee (mock)',
        timestamp: '2026-04-10T12:00:00.000Z',
      },
      {
        id: 'case-audit-fixed-income-3',
        action: 'Closed',
        fromStatus: 'Rejected',
        toStatus: 'Closed',
        rationale: 'Case closed after audit trail recorded and monitoring watch applied.',
        user: 'Governance Officer (mock)',
        timestamp: '2026-04-11T09:00:00.000Z',
      },
    ],
  },
];

const OPEN_STATUSES: InvestmentCaseStatus[] = [
  'New',
  'Research',
  'Under Review',
  'Committee Review',
  'Deferred',
];

export type CreateInvestmentCaseInput = {
  title: string;
  fundName: string;
  source: InvestmentCaseSource;
  priority: InvestmentCasePriority;
  owner: string;
  summary: string;
  rationale: string;
  id?: string;
  createdAt?: string;
  createdBy?: string;
};

export type RecordInvestmentCaseActionInput = {
  investmentCase: InvestmentCase;
  action: InvestmentCaseAction;
  rationale: string;
  user: string;
  toStatus: InvestmentCaseStatus;
  timestamp?: string;
  auditEntryId?: string;
};

function sortCasesChronologically(cases: InvestmentCase[]): InvestmentCase[] {
  return [...cases].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

function sortAuditEntriesChronologically(
  entries: InvestmentCaseAuditEntry[]
): InvestmentCaseAuditEntry[] {
  return [...entries].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  );
}

export function getMockInvestmentCases(): InvestmentCase[] {
  return MOCK_INVESTMENT_CASES.map((investmentCase) => ({
    ...investmentCase,
    actions: investmentCase.actions.map((entry) => ({ ...entry })),
  }));
}

export function sortInvestmentCases(cases: InvestmentCase[]): InvestmentCase[] {
  return sortCasesChronologically(cases);
}

export function summariseInvestmentCases(
  cases: InvestmentCase[]
): InvestmentCaseSummary {
  return {
    totalCases: cases.length,
    newCount: cases.filter((investmentCase) => investmentCase.status === 'New')
      .length,
    researchCount: cases.filter(
      (investmentCase) => investmentCase.status === 'Research'
    ).length,
    underReviewCount: cases.filter(
      (investmentCase) => investmentCase.status === 'Under Review'
    ).length,
    committeeReviewCount: cases.filter(
      (investmentCase) => investmentCase.status === 'Committee Review'
    ).length,
    approvedCount: cases.filter(
      (investmentCase) => investmentCase.status === 'Approved'
    ).length,
    rejectedCount: cases.filter(
      (investmentCase) => investmentCase.status === 'Rejected'
    ).length,
    deferredCount: cases.filter(
      (investmentCase) => investmentCase.status === 'Deferred'
    ).length,
    closedCount: cases.filter(
      (investmentCase) => investmentCase.status === 'Closed'
    ).length,
    criticalPriorityCount: cases.filter(
      (investmentCase) => investmentCase.priority === 'Critical'
    ).length,
    highPriorityCount: cases.filter(
      (investmentCase) => investmentCase.priority === 'High'
    ).length,
    openCount: cases.filter((investmentCase) =>
      OPEN_STATUSES.includes(investmentCase.status)
    ).length,
  };
}

export function getLatestInvestmentCaseAction(
  investmentCase: InvestmentCase
): InvestmentCaseAuditEntry | null {
  const sorted = sortAuditEntriesChronologically(investmentCase.actions);
  return sorted[0] ?? null;
}

export function isInvestmentCaseOpen(investmentCase: InvestmentCase): boolean {
  return OPEN_STATUSES.includes(investmentCase.status);
}

/**
 * Creates a new investment case with an initial audit entry.
 * Does not mutate existing cases or persist to Supabase.
 */
export function createInvestmentCase({
  title,
  fundName,
  source,
  priority,
  owner,
  summary,
  rationale,
  id,
  createdAt = PREVIEW_TIMESTAMP,
  createdBy,
}: CreateInvestmentCaseInput): InvestmentCase {
  const slug = fundName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const caseId = id ?? `case-${slug}-${createdAt.slice(0, 10)}`;

  const initialAudit: InvestmentCaseAuditEntry = {
    id: `${caseId}-audit-created`,
    action: 'Created',
    toStatus: 'New',
    rationale,
    user: createdBy ?? owner,
    timestamp: createdAt,
  };

  return {
    id: caseId,
    title,
    fundName,
    source,
    status: 'New',
    priority,
    owner,
    summary,
    rationale,
    createdAt,
    updatedAt: createdAt,
    actions: [initialAudit],
  };
}

/**
 * Records an audit action against an investment case and returns an updated copy.
 * Does not mutate the input case.
 */
export function recordInvestmentCaseAction({
  investmentCase,
  action,
  rationale,
  user,
  toStatus,
  timestamp = PREVIEW_TIMESTAMP,
  auditEntryId,
}: RecordInvestmentCaseActionInput): InvestmentCase {
  const auditEntry: InvestmentCaseAuditEntry = {
    id: auditEntryId ?? `${investmentCase.id}-audit-${investmentCase.actions.length + 1}`,
    action,
    fromStatus: investmentCase.status,
    toStatus,
    rationale,
    user,
    timestamp,
  };

  return {
    ...investmentCase,
    status: toStatus,
    updatedAt: timestamp,
    actions: [...investmentCase.actions, auditEntry],
  };
}

export function formatInvestmentCaseSource(source: InvestmentCaseSource): string {
  return source;
}

export function formatInvestmentCaseStatus(status: InvestmentCaseStatus): string {
  return status;
}

export function formatInvestmentCasePriority(
  priority: InvestmentCasePriority
): string {
  return priority;
}

export function formatInvestmentCaseAction(action: InvestmentCaseAction): string {
  return action;
}
