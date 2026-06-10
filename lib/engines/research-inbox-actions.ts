import type {
  ApplyResearchInboxActionInput,
  ResearchInboxAction,
  ResearchInboxActionRecord,
  ResearchInboxItem,
  ResearchInboxStatus,
} from '../../domain/types/research-inbox';
import { PREVIEW_TIMESTAMP } from '../format-timestamp';

const TERMINAL_STATUSES: ResearchInboxStatus[] = ['Resolved', 'Rejected'];

export function statusForResearchInboxAction(
  action: ResearchInboxAction
): ResearchInboxStatus {
  switch (action) {
    case 'mark_in_review':
    case 'request_more_research':
      return 'In Review';
    case 'defer':
      return 'Deferred';
    case 'resolve':
      return 'Resolved';
    case 'reject':
      return 'Rejected';
  }
}

export function formatResearchInboxAction(action: ResearchInboxAction): string {
  switch (action) {
    case 'mark_in_review':
      return 'Mark In Review';
    case 'defer':
      return 'Defer';
    case 'resolve':
      return 'Resolve';
    case 'reject':
      return 'Reject';
    case 'request_more_research':
      return 'Request More Research';
  }
}

export function isTerminalResearchInboxStatus(
  status: ResearchInboxStatus
): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function researchInboxActionSupportsRationale(
  action: ResearchInboxAction
): boolean {
  return action !== 'mark_in_review';
}

export function nextResearchInboxActionTimestamp(
  actionCount: number,
  baseTimestamp: string = PREVIEW_TIMESTAMP
): string {
  const base = new Date(baseTimestamp);
  base.setUTCMinutes(base.getUTCMinutes() + actionCount);
  return base.toISOString();
}

export type ApplyResearchInboxActionResult = {
  item: ResearchInboxItem;
  record: ResearchInboxActionRecord;
};

/**
 * Applies an adviser action to a research inbox item without mutating the input.
 */
export function applyResearchInboxAction(
  item: ResearchInboxItem,
  input: ApplyResearchInboxActionInput,
  actionIndex: number
): ApplyResearchInboxActionResult {
  const actedAt =
    input.actedAt ?? nextResearchInboxActionTimestamp(actionIndex);
  const statusAfter = statusForResearchInboxAction(input.action);
  const rationale = input.rationale?.trim() ? input.rationale.trim() : null;

  const record: ResearchInboxActionRecord = {
    id: `${item.id}-action-${actionIndex}`,
    itemId: item.id,
    action: input.action,
    rationale,
    actedAt,
    statusBefore: item.status,
    statusAfter,
    actedBy: input.actedBy ?? null,
  };

  return {
    item: {
      ...item,
      status: statusAfter,
    },
    record,
  };
}

export function getLatestResearchInboxAction(
  records: ResearchInboxActionRecord[]
): ResearchInboxActionRecord | null {
  if (records.length === 0) {
    return null;
  }

  return [...records].sort(
    (a, b) => new Date(b.actedAt).getTime() - new Date(a.actedAt).getTime()
  )[0];
}

export const RESEARCH_INBOX_ACTIONS: ResearchInboxAction[] = [
  'mark_in_review',
  'defer',
  'resolve',
  'reject',
  'request_more_research',
];
