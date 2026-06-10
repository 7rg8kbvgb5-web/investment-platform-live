/** Lifecycle status for a research inbox item. */
export type ResearchInboxStatus =
  | 'New'
  | 'In Review'
  | 'Deferred'
  | 'Resolved'
  | 'Rejected';

/** Priority level for triage and adviser attention. */
export type ResearchInboxPriority = 'Low' | 'Medium' | 'High' | 'Critical';

/** Origin of the research inbox item. */
export type ResearchInboxSourceType =
  | 'Fund Monitor'
  | 'Adviser Request'
  | 'Investment Committee'
  | 'External Research'
  | 'Manual Entry';

/** Category of work represented by the inbox item. */
export type ResearchInboxItemType =
  | 'Incoming Research'
  | 'Fund Monitoring Alert'
  | 'House View Update'
  | 'Adviser Review Task';

import type { AlertOrigin } from './alert';

/** Whether the inbox item was created manually or by the alert engine. */
export type ResearchInboxItemOrigin = 'manual' | 'system';

/** A single research inbox item awaiting adviser or committee action. */
export type ResearchInboxItem = {
  id: string;
  title: string;
  summary: string;
  itemType: ResearchInboxItemType;
  status: ResearchInboxStatus;
  priority: ResearchInboxPriority;
  sourceType: ResearchInboxSourceType;
  /** Manual entry or system-generated via the alert engine. */
  origin: ResearchInboxItemOrigin;
  /** ISO timestamp when the item entered the inbox. */
  receivedAt: string;
  relatedEntityId?: string | null;
  assignedTo?: string | null;
  /** When origin is system, the source alert id from the alert engine. */
  sourceAlertId?: string | null;
  /** When converted from an alert, the alert origin for display (e.g. fund monitoring). */
  sourceAlertOrigin?: AlertOrigin | null;
  /** When converted from a research request, the source research request id. */
  sourceResearchRequestId?: string | null;
};

export type ResearchInboxInput = {
  items: ResearchInboxItem[];
};

export type ResearchInboxSummary = {
  totalItems: number;
  newItems: number;
  inReviewItems: number;
  deferredItems: number;
  resolvedItems: number;
  rejectedItems: number;
  criticalPriority: number;
  highPriority: number;
  systemGeneratedItems: number;
  manualItems: number;
  researchRequestItems: number;
};

export type ResearchInboxResult = {
  sortedItems: ResearchInboxItem[];
  summary: ResearchInboxSummary;
};

/** Adviser action available on a research inbox item. */
export type ResearchInboxAction =
  | 'mark_in_review'
  | 'defer'
  | 'resolve'
  | 'reject'
  | 'request_more_research';

/** A recorded adviser action against a research inbox item. */
export type ResearchInboxActionRecord = {
  id: string;
  itemId: string;
  action: ResearchInboxAction;
  rationale: string | null;
  actedAt: string;
  statusBefore: ResearchInboxStatus;
  statusAfter: ResearchInboxStatus;
  actedBy?: string | null;
};

export type ApplyResearchInboxActionInput = {
  action: ResearchInboxAction;
  rationale?: string | null;
  actedAt?: string;
  actedBy?: string | null;
};
