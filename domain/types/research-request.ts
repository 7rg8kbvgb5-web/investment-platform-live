/** Lifecycle status for a structured research request. */
export type ResearchRequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'In Progress'
  | 'Waiting On External Research'
  | 'Completed'
  | 'Cancelled';

/** Priority for research request triage. */
export type ResearchRequestPriority = 'Low' | 'Medium' | 'High' | 'Critical';

/** Origin of the research request. */
export type ResearchRequestSource =
  | 'Fund Review Decision'
  | 'Adviser Request'
  | 'Investment Committee'
  | 'Alert Engine'
  | 'Manual Entry';

/** Structured research request created from fund review or monitoring workflows. */
export type ResearchRequest = {
  id: string;
  title: string;
  description: string;
  source: ResearchRequestSource;
  priority: ResearchRequestPriority;
  status: ResearchRequestStatus;
  relatedFundId: string;
  relatedFundName: string;
  requestedBy: string;
  /** ISO timestamp when the request was created. */
  createdAt: string;
  /** ISO date (YYYY-MM-DD) when research is due. */
  dueDate: string;
  /** Linked fund review decision id, when created from a decision. */
  relatedDecisionId?: string | null;
};

export type ResearchRequestSummary = {
  totalRequests: number;
  submittedCount: number;
  inProgressCount: number;
  waitingOnExternalCount: number;
  completedCount: number;
  criticalPriorityCount: number;
  highPriorityCount: number;
  fromFundReviewDecisionCount: number;
};
