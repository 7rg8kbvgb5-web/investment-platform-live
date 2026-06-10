import type {
  MonitoringSummary,
  MonitoringSummaryInput,
  MonitoringSummaryResult,
  OverallMonitoringStatus,
} from '../../domain/types/monitoring-summary';
import { getMockAlertRules, summariseAlertRules } from './alert-rules-engine';
import { generateCombinedAlerts, summariseAlerts } from './alert-engine';
import {
  assessMonitoredFunds,
  getMockMonitoredFunds,
} from './fund-monitoring';
import {
  analyzeResearchInbox,
  getCombinedResearchInboxItems,
} from './research-inbox';

function countOpenResearchItems(summary: MonitoringSummaryInput['researchInboxSummary']): number {
  return summary.newItems + summary.inReviewItems;
}

/**
 * Derives overall monitoring status from alert and research inbox metrics.
 */
export function determineOverallMonitoringStatus(
  input: MonitoringSummaryInput
): OverallMonitoringStatus {
  const { researchInboxSummary, alertSummary } = input;
  const openResearchItems = countOpenResearchItems(researchInboxSummary);

  if (alertSummary.criticalAlerts > 0 || researchInboxSummary.criticalPriority > 0) {
    return 'Critical';
  }

  if (
    alertSummary.highAlerts > 0 ||
    researchInboxSummary.deferredItems > 0 ||
    openResearchItems >= 3
  ) {
    return 'Action Required';
  }

  if (
    alertSummary.openAlerts > 0 ||
    openResearchItems > 0 ||
    input.alertRulesSummary.disabledRules > 0
  ) {
    return 'Watch';
  }

  return 'Stable';
}

function buildActionRequiredSummaryText(
  input: MonitoringSummaryInput,
  status: OverallMonitoringStatus
): string {
  const { researchInboxSummary, alertSummary, alertRulesSummary } = input;
  const openResearchItems = countOpenResearchItems(researchInboxSummary);
  const parts: string[] = [];

  if (status === 'Stable') {
    return 'Monitoring is stable. No critical alerts, high-priority backlog, or deferred follow-ups require immediate attention.';
  }

  if (alertSummary.criticalAlerts > 0) {
    parts.push(
      `${alertSummary.criticalAlerts} critical alert${alertSummary.criticalAlerts === 1 ? '' : 's'}`
    );
  }

  if (researchInboxSummary.criticalPriority > 0) {
    parts.push(
      `${researchInboxSummary.criticalPriority} critical-priority research item${researchInboxSummary.criticalPriority === 1 ? '' : 's'}`
    );
  }

  if (alertSummary.highAlerts > 0) {
    parts.push(
      `${alertSummary.highAlerts} high-severity alert${alertSummary.highAlerts === 1 ? '' : 's'}`
    );
  }

  if (openResearchItems > 0) {
    parts.push(
      `${openResearchItems} open research item${openResearchItems === 1 ? '' : 's'} awaiting triage or review`
    );
  }

  if (researchInboxSummary.deferredItems > 0) {
    parts.push(
      `${researchInboxSummary.deferredItems} deferred research item${researchInboxSummary.deferredItems === 1 ? '' : 's'}`
    );
  }

  if (alertRulesSummary.disabledRules > 0 && status === 'Watch') {
    parts.push(
      `${alertRulesSummary.disabledRules} alert rule${alertRulesSummary.disabledRules === 1 ? '' : 's'} disabled`
    );
  }

  if (parts.length === 0) {
    return 'Monitoring requires attention. Review alerts, research inbox, and alert rules below.';
  }

  return `Attention required: ${parts.join('; ')}.`;
}

/**
 * Builds unified monitoring summary from research inbox, alert, and alert rules summaries.
 * Does not mutate inputs.
 */
export function buildMonitoringSummary(
  input: MonitoringSummaryInput
): MonitoringSummaryResult {
  const {
    researchInboxSummary,
    alertSummary,
    alertRulesSummary,
    fundMonitoringSummary,
  } = input;
  const overallMonitoringStatus = determineOverallMonitoringStatus(input);

  const summary: MonitoringSummary = {
    totalResearchItems: researchInboxSummary.totalItems,
    openResearchItems: countOpenResearchItems(researchInboxSummary),
    deferredResearchItems: researchInboxSummary.deferredItems,
    totalAlerts: alertSummary.totalAlerts,
    criticalAlerts: alertSummary.criticalAlerts,
    highAlerts: alertSummary.highAlerts,
    totalRules: alertRulesSummary.totalRules,
    enabledRules: alertRulesSummary.enabledRules,
    disabledRules: alertRulesSummary.disabledRules,
    overallMonitoringStatus,
    actionRequiredSummaryText: buildActionRequiredSummaryText(
      input,
      overallMonitoringStatus
    ),
    totalMonitoredFunds: fundMonitoringSummary.totalMonitoredFunds,
    fundsOnWatch: fundMonitoringSummary.fundsOnWatch,
    fundsRequiringReview: fundMonitoringSummary.reviewRequired,
    replacementCandidates: fundMonitoringSummary.replacementCandidates,
  };

  return { summary };
}

/**
 * Convenience helper that aggregates mock/local monitoring data from existing engines.
 */
export function getCombinedMonitoringSummary(): MonitoringSummaryResult {
  const researchInboxSummary = analyzeResearchInbox({
    items: getCombinedResearchInboxItems(),
  }).summary;
  const alertSummary = summariseAlerts({
    alerts: generateCombinedAlerts(),
  }).summary;
  const alertRulesSummary = summariseAlertRules({
    rules: getMockAlertRules(),
  }).summary;
  const fundMonitoringSummary = assessMonitoredFunds(
    getMockMonitoredFunds()
  ).summary;

  return buildMonitoringSummary({
    researchInboxSummary,
    alertSummary,
    alertRulesSummary,
    fundMonitoringSummary,
  });
}

export function formatOverallMonitoringStatus(
  status: OverallMonitoringStatus
): string {
  return status;
}
