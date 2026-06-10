import type {
  Alert,
  AlertCategory,
  AlertEngineResult,
  AlertInput,
  AlertOrigin,
  AlertSeverity,
  AlertStatus,
  AlertSummary,
} from '../../domain/types/alert';
import type {
  ResearchInboxItem,
  ResearchInboxItemType,
  ResearchInboxPriority,
  ResearchInboxSourceType,
  ResearchInboxStatus,
} from '../../domain/types/research-inbox';
import {
  evaluateAlertRules,
  getMockAlertRules,
} from './alert-rules-engine';

/** Stable mock alerts for local preview. */
export const MOCK_ALERTS: Alert[] = [
  {
    id: 'alert-global-quality-underperformance',
    title: 'Global Quality Fund underperforming benchmark',
    summary:
      'Trailing 12-month performance is 2.1% below benchmark. Fund monitor recommends adviser review before next rebalance.',
    category: 'Fund Performance',
    severity: 'High',
    status: 'Open',
    origin: 'static_mock',
    createdAt: '2026-06-09T07:15:00.000Z',
    relatedEntityId: 'fr-global-quality',
  },
  {
    id: 'alert-australian-equities-house-view',
    title: 'Australian Equities House View review due',
    summary:
      'House view review date is within 14 days. Confirm Positive stance and supporting rationale.',
    category: 'House View Review',
    severity: 'Medium',
    status: 'Open',
    origin: 'static_mock',
    createdAt: '2026-06-08T09:00:00.000Z',
    relatedEntityId: 'hv-australian-equities',
  },
  {
    id: 'alert-portfolio-drift-tolerance',
    title: 'Portfolio drift exceeds tolerance',
    summary:
      'Growth allocation drift of 1.8 percentage points exceeds soft guardrail tolerance for Balanced profile.',
    category: 'Portfolio Drift',
    severity: 'Critical',
    status: 'Open',
    origin: 'static_mock',
    createdAt: '2026-06-08T11:30:00.000Z',
    relatedEntityId: 'portfolio-balanced',
  },
  {
    id: 'alert-ic-review-overdue',
    title: 'Investment Committee review overdue',
    summary:
      'Private Credit Fund review was deferred and is now past the scheduled review-again date.',
    category: 'Governance Review',
    severity: 'High',
    status: 'Open',
    origin: 'static_mock',
    createdAt: '2026-06-07T14:00:00.000Z',
    relatedEntityId: 'fr-private-credit',
  },
  {
    id: 'alert-fund-manager-departure',
    title: 'Fund manager departure detected',
    summary:
      'Lead portfolio manager for Infrastructure Fund announced departure. Research and IC review required.',
    category: 'Fund Manager Change',
    severity: 'Critical',
    status: 'Acknowledged',
    origin: 'static_mock',
    createdAt: '2026-06-06T16:45:00.000Z',
    relatedEntityId: 'fr-infrastructure',
  },
  {
    id: 'alert-compliance-annual-attestation',
    title: 'Annual compliance attestation due',
    summary:
      'Quarterly compliance review checklist incomplete for two active portfolio scenarios.',
    category: 'Compliance Review',
    severity: 'Medium',
    status: 'Open',
    origin: 'static_mock',
    createdAt: '2026-06-05T10:00:00.000Z',
    relatedEntityId: null,
  },
  {
    id: 'alert-research-note-pending',
    title: 'External research note awaiting triage',
    summary:
      'Gold macro thematic research received from external provider; requires inbox triage.',
    category: 'Research Review',
    severity: 'Low',
    status: 'Resolved',
    origin: 'static_mock',
    createdAt: '2026-06-04T08:20:00.000Z',
    relatedEntityId: 'hv-gold',
  },
];

function compareAlertsNewestFirst(a: Alert, b: Alert): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function severityRank(severity: AlertSeverity): number {
  switch (severity) {
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

export function generateMockAlerts(): Alert[] {
  return MOCK_ALERTS.map((alert) => ({ ...alert }));
}

function getAlertDedupKey(alert: Alert): string {
  return `${alert.category}|${alert.relatedEntityId ?? alert.id}`;
}

/**
 * Merges static mock alerts with rule-generated alerts.
 * Skips rule alerts that duplicate an existing static alert by category and entity.
 * Does not mutate inputs.
 */
export function mergeStaticAndRuleGeneratedAlerts(
  staticAlerts: Alert[],
  ruleGeneratedAlerts: Alert[]
): Alert[] {
  const staticKeys = new Set(staticAlerts.map(getAlertDedupKey));
  const uniqueRuleAlerts = ruleGeneratedAlerts.filter(
    (alert) => !staticKeys.has(getAlertDedupKey(alert))
  );

  return [
    ...staticAlerts.map((alert) => ({ ...alert })),
    ...uniqueRuleAlerts.map((alert) => ({ ...alert })),
  ];
}

/**
 * Returns static mock alerts combined with alerts generated from enabled alert rules.
 * Rule output is evaluated via the alert rules engine. Duplicates are excluded.
 */
export function generateCombinedAlerts(): Alert[] {
  const staticAlerts = generateMockAlerts();
  const { generatedAlerts } = evaluateAlertRules({
    rules: getMockAlertRules(),
  });

  return mergeStaticAndRuleGeneratedAlerts(staticAlerts, generatedAlerts);
}

export function formatAlertOrigin(origin: AlertOrigin): string {
  return origin === 'static_mock' ? 'Static Mock Alert' : 'Rule-Generated Alert';
}

export function formatAlertCategory(category: AlertCategory): string {
  return category;
}

export function formatAlertSeverity(severity: AlertSeverity): string {
  return severity;
}

export function formatAlertStatus(status: AlertStatus): string {
  return status;
}

/**
 * Builds alert summary metrics from a list of alerts.
 * Sorts by severity then created date (newest first). Does not mutate input.
 */
export function summariseAlerts({ alerts }: AlertInput): AlertEngineResult {
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityDiff = severityRank(a.severity) - severityRank(b.severity);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return compareAlertsNewestFirst(a, b);
  });

  return {
    sortedAlerts,
    summary: buildAlertSummary(sortedAlerts),
  };
}

function buildAlertSummary(alerts: Alert[]): AlertSummary {
  return {
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter((alert) => alert.severity === 'Critical')
      .length,
    highAlerts: alerts.filter((alert) => alert.severity === 'High').length,
    openAlerts: alerts.filter((alert) => alert.status === 'Open').length,
    acknowledgedAlerts: alerts.filter(
      (alert) => alert.status === 'Acknowledged'
    ).length,
    resolvedAlerts: alerts.filter((alert) => alert.status === 'Resolved')
      .length,
    dismissedAlerts: alerts.filter((alert) => alert.status === 'Dismissed')
      .length,
    staticMockAlerts: alerts.filter((alert) => alert.origin === 'static_mock')
      .length,
    ruleGeneratedAlerts: alerts.filter(
      (alert) => alert.origin === 'rule_generated'
    ).length,
  };
}

function mapAlertCategoryToInboxItemType(
  category: AlertCategory
): ResearchInboxItemType {
  switch (category) {
    case 'Fund Performance':
    case 'Fund Manager Change':
      return 'Fund Monitoring Alert';
    case 'House View Review':
      return 'House View Update';
    case 'Portfolio Drift':
    case 'Governance Review':
    case 'Compliance Review':
      return 'Adviser Review Task';
    case 'Research Review':
      return 'Incoming Research';
  }
}

function mapAlertCategoryToInboxSourceType(
  category: AlertCategory
): ResearchInboxSourceType {
  switch (category) {
    case 'Fund Performance':
    case 'Fund Manager Change':
    case 'Portfolio Drift':
      return 'Fund Monitor';
    case 'House View Review':
    case 'Governance Review':
    case 'Compliance Review':
      return 'Investment Committee';
    case 'Research Review':
      return 'External Research';
  }
}

function mapAlertSeverityToInboxPriority(
  severity: AlertSeverity
): ResearchInboxPriority {
  return severity;
}

function mapAlertStatusToInboxStatus(status: AlertStatus): ResearchInboxStatus {
  switch (status) {
    case 'Open':
      return 'New';
    case 'Acknowledged':
      return 'In Review';
    case 'Resolved':
      return 'Resolved';
    case 'Dismissed':
      return 'Rejected';
  }
}

/**
 * Converts a platform alert into a research inbox item for workflow triage.
 * Does not mutate the source alert.
 */
export function convertAlertToResearchInboxItem(alert: Alert): ResearchInboxItem {
  return {
    id: `ri-from-${alert.id}`,
    title: alert.title,
    summary: alert.summary,
    itemType: mapAlertCategoryToInboxItemType(alert.category),
    status: mapAlertStatusToInboxStatus(alert.status),
    priority: mapAlertSeverityToInboxPriority(alert.severity),
    sourceType: mapAlertCategoryToInboxSourceType(alert.category),
    origin: 'system',
    receivedAt: alert.createdAt,
    relatedEntityId: alert.relatedEntityId ?? null,
    assignedTo: null,
    sourceAlertId: alert.id,
  };
}
