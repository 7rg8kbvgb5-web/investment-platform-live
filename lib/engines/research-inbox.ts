import type { Alert, AlertOrigin } from '../../domain/types/alert';
import type {
  ResearchInboxItem,
  ResearchInboxInput,
  ResearchInboxItemOrigin,
  ResearchInboxItemType,
  ResearchInboxPriority,
  ResearchInboxResult,
  ResearchInboxSourceType,
  ResearchInboxStatus,
} from '../../domain/types/research-inbox';
import {
  convertAlertToResearchInboxItem,
  generateCombinedAlerts,
} from './alert-engine';
import {
  convertResearchRequestToInboxItem,
  getMockResearchRequests,
} from './research-request';
import type { ResearchRequest } from '../../domain/types/research-request';

/** Stable mock research inbox items for local preview. */
export const MOCK_RESEARCH_INBOX_ITEMS: ResearchInboxItem[] = [
  {
    id: 'ri-global-quality-alternative',
    title: 'Global Quality Fund — alternative review',
    summary:
      'Fund monitor flagged a lower-cost alternative with comparable risk metrics. Review before next model portfolio rebalance.',
    itemType: 'Fund Monitoring Alert',
    status: 'New',
    priority: 'High',
    sourceType: 'Fund Monitor',
    origin: 'manual',
    receivedAt: '2026-06-09T08:30:00.000Z',
    relatedEntityId: 'fr-global-quality',
    assignedTo: 'S. Nguyen',
    sourceAlertId: 'alert-global-quality-underperformance',
  },
  {
    id: 'ri-private-credit-liquidity',
    title: 'Private Credit Fund — liquidity stress report',
    summary:
      'External manager research received on updated liquidity stress testing. Required before deferred review can close.',
    itemType: 'Incoming Research',
    status: 'In Review',
    priority: 'Critical',
    sourceType: 'External Research',
    origin: 'manual',
    receivedAt: '2026-06-08T14:00:00.000Z',
    relatedEntityId: 'fr-private-credit',
    assignedTo: 'A. Patel',
  },
  {
    id: 'ri-australian-equities-house-view',
    title: 'Australian Equities — house view review due',
    summary:
      'House view review date approaching. Confirm Positive stance and supporting rationale before committee sign-off.',
    itemType: 'House View Update',
    status: 'In Review',
    priority: 'Medium',
    sourceType: 'Investment Committee',
    origin: 'manual',
    receivedAt: '2026-06-07T10:00:00.000Z',
    relatedEntityId: 'hv-australian-equities',
    assignedTo: 'Investment Committee',
    sourceAlertId: 'alert-australian-equities-house-view',
  },
  {
    id: 'ri-infra-capacity-dd',
    title: 'Infrastructure Fund — capacity due diligence',
    summary:
      'Adviser requested additional capacity and ESG analysis on the current infrastructure mandate.',
    itemType: 'Adviser Review Task',
    status: 'Deferred',
    priority: 'Medium',
    sourceType: 'Adviser Request',
    origin: 'manual',
    receivedAt: '2026-06-05T11:45:00.000Z',
    relatedEntityId: 'fr-infrastructure',
    assignedTo: 'J. Mitchell',
  },
  {
    id: 'ri-gold-macro-note',
    title: 'Gold — macro thematic research note',
    summary:
      'Manual entry: external macro research on gold as a defensive hedge under current rate environment.',
    itemType: 'Incoming Research',
    status: 'New',
    priority: 'Low',
    sourceType: 'Manual Entry',
    origin: 'manual',
    receivedAt: '2026-06-04T09:15:00.000Z',
    relatedEntityId: 'hv-gold',
    assignedTo: null,
    sourceAlertId: 'alert-research-note-pending',
  },
  {
    id: 'ri-intl-equities-overlay',
    title: 'International Equities overlay — guardrail follow-up',
    summary:
      'Adviser review task linked to expiring tactical overlay and soft growth guardrail warning.',
    itemType: 'Adviser Review Task',
    status: 'Resolved',
    priority: 'High',
    sourceType: 'Fund Monitor',
    origin: 'manual',
    receivedAt: '2026-06-02T16:20:00.000Z',
    relatedEntityId: 'overlay-intl-equities',
    assignedTo: 'J. Mitchell',
  },
  {
    id: 'ri-rejected-alt-fund',
    title: 'Australian Equities Fund — alternative rejected',
    summary:
      'Committee rejected switch to proposed alternative after cost-benefit review; retain current fund.',
    itemType: 'Fund Monitoring Alert',
    status: 'Rejected',
    priority: 'Medium',
    sourceType: 'Investment Committee',
    origin: 'manual',
    receivedAt: '2026-05-30T13:00:00.000Z',
    relatedEntityId: 'fr-australian-equities',
    assignedTo: 'Investment Committee',
  },
];

function compareItemsNewestFirst(
  a: ResearchInboxItem,
  b: ResearchInboxItem
): number {
  return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
}

function priorityRank(priority: ResearchInboxPriority): number {
  switch (priority) {
    case 'Critical':
      return 0;
    case 'High':
      return 1;
    case 'Medium':
      return 2;
    case 'Low':
      return 3;
  }
}

export function getMockResearchInboxItems(): ResearchInboxItem[] {
  return MOCK_RESEARCH_INBOX_ITEMS.map((item) => ({ ...item }));
}

function collectCoveredAlertIds(items: ResearchInboxItem[]): Set<string> {
  const covered = new Set<string>();

  for (const item of items) {
    if (item.sourceAlertId) {
      covered.add(item.sourceAlertId);
    }
  }

  return covered;
}

function collectCoveredResearchRequestIds(
  items: ResearchInboxItem[]
): Set<string> {
  const covered = new Set<string>();

  for (const item of items) {
    if (item.sourceResearchRequestId) {
      covered.add(item.sourceResearchRequestId);
    }
  }

  return covered;
}

/**
 * Merges manual inbox items with alert-generated items.
 * Skips alerts already represented by a manual item via sourceAlertId.
 * Does not mutate inputs.
 */
export function mergeAlertsIntoResearchInbox(
  manualItems: ResearchInboxItem[],
  alerts: Alert[]
): ResearchInboxItem[] {
  const coveredAlertIds = collectCoveredAlertIds(manualItems);
  const alertItems = alerts
    .filter((alert) => !coveredAlertIds.has(alert.id))
    .map((alert) => convertAlertToResearchInboxItem(alert));

  return [...manualItems.map((item) => ({ ...item })), ...alertItems];
}

/**
 * Merges research-request-generated items into the inbox.
 * Skips requests already represented by a manual item via sourceResearchRequestId.
 * Excludes completed and cancelled requests from active inbox flow.
 * Does not mutate inputs.
 */
export function mergeResearchRequestsIntoResearchInbox(
  items: ResearchInboxItem[],
  requests: ResearchRequest[]
): ResearchInboxItem[] {
  const coveredRequestIds = collectCoveredResearchRequestIds(items);
  const requestItems = requests
    .filter(
      (request) =>
        request.status !== 'Completed' &&
        request.status !== 'Cancelled' &&
        !coveredRequestIds.has(request.id)
    )
    .map((request) => convertResearchRequestToInboxItem(request));

  return [...items.map((item) => ({ ...item })), ...requestItems];
}

/**
 * Returns mock manual items combined with alert-engine and research-request
 * generated inbox items.
 */
export function getCombinedResearchInboxItems(): ResearchInboxItem[] {
  const withAlerts = mergeAlertsIntoResearchInbox(
    getMockResearchInboxItems(),
    generateCombinedAlerts()
  );

  return mergeResearchRequestsIntoResearchInbox(
    withAlerts,
    getMockResearchRequests()
  );
}

export function formatResearchInboxStatus(status: ResearchInboxStatus): string {
  return status;
}

export function formatResearchInboxPriority(
  priority: ResearchInboxPriority
): string {
  return priority;
}

export function formatResearchInboxSourceType(
  sourceType: ResearchInboxSourceType
): string {
  return sourceType;
}

export function formatResearchInboxItemType(
  itemType: ResearchInboxItemType
): string {
  return itemType;
}

export function formatResearchInboxItemOrigin(
  origin: ResearchInboxItemOrigin,
  sourceAlertOrigin?: AlertOrigin | null,
  sourceResearchRequestId?: string | null
): string {
  if (origin === 'manual') {
    return 'Manual';
  }

  if (sourceResearchRequestId) {
    return 'Research Request';
  }

  if (sourceAlertOrigin === 'fund_monitoring') {
    return 'Fund Monitoring';
  }

  if (sourceAlertOrigin === 'rule_generated') {
    return 'Rule-Generated Alert';
  }

  return 'Alert Engine';
}

/**
 * Builds a read-only research inbox view from inbox items.
 * Sorts by priority then received date (newest first). Does not mutate input.
 */
export function analyzeResearchInbox({
  items,
}: ResearchInboxInput): ResearchInboxResult {
  const sortedItems = [...items].sort((a, b) => {
    const priorityDiff =
      priorityRank(a.priority) - priorityRank(b.priority);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return compareItemsNewestFirst(a, b);
  });

  return {
    sortedItems,
    summary: {
      totalItems: sortedItems.length,
      newItems: sortedItems.filter((item) => item.status === 'New').length,
      inReviewItems: sortedItems.filter((item) => item.status === 'In Review')
        .length,
      deferredItems: sortedItems.filter((item) => item.status === 'Deferred')
        .length,
      resolvedItems: sortedItems.filter((item) => item.status === 'Resolved')
        .length,
      rejectedItems: sortedItems.filter((item) => item.status === 'Rejected')
        .length,
      criticalPriority: sortedItems.filter(
        (item) => item.priority === 'Critical'
      ).length,
      highPriority: sortedItems.filter((item) => item.priority === 'High')
        .length,
      systemGeneratedItems: sortedItems.filter((item) => item.origin === 'system')
        .length,
      manualItems: sortedItems.filter((item) => item.origin === 'manual')
        .length,
      researchRequestItems: sortedItems.filter(
        (item) => item.sourceResearchRequestId != null
      ).length,
    },
  };
}
