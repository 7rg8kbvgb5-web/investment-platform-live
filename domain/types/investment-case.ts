/** Origin module that raised the investment case. */
export type InvestmentCaseSource =
  | 'Fund Monitoring'
  | 'Alert Engine'
  | 'Research Inbox'
  | 'Fund Review'
  | 'Investment Committee'
  | 'Governance';

/** Lifecycle status for a unified investment case. */
export type InvestmentCaseStatus =
  | 'New'
  | 'Research'
  | 'Under Review'
  | 'Committee Review'
  | 'Approved'
  | 'Rejected'
  | 'Deferred'
  | 'Closed';

export type InvestmentCasePriority = 'Low' | 'Medium' | 'High' | 'Critical';

/** Audit action recorded against an investment case. */
export type InvestmentCaseAction =
  | 'Created'
  | 'Escalated to Research'
  | 'Moved to Fund Review'
  | 'Submitted to Committee'
  | 'Approved'
  | 'Rejected'
  | 'Deferred'
  | 'Closed';

export type InvestmentCaseAuditEntry = {
  id: string;
  action: InvestmentCaseAction;
  fromStatus?: InvestmentCaseStatus;
  toStatus?: InvestmentCaseStatus;
  rationale: string;
  user: string;
  timestamp: string;
};

/** Unified investment case spanning monitoring, research, and committee workflows. */
export type InvestmentCase = {
  id: string;
  title: string;
  fundName: string;
  source: InvestmentCaseSource;
  status: InvestmentCaseStatus;
  priority: InvestmentCasePriority;
  owner: string;
  summary: string;
  rationale: string;
  createdAt: string;
  updatedAt: string;
  actions: InvestmentCaseAuditEntry[];
};

export type InvestmentCaseSummary = {
  totalCases: number;
  newCount: number;
  researchCount: number;
  underReviewCount: number;
  committeeReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  deferredCount: number;
  closedCount: number;
  criticalPriorityCount: number;
  highPriorityCount: number;
  openCount: number;
};
