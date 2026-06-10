import type { AlertRulesSummary } from './alert-rule';
import type { AlertSummary } from './alert';
import type { ResearchInboxSummary } from './research-inbox';

/** Overall monitoring health derived from alerts, inbox, and rules. */
export type OverallMonitoringStatus =
  | 'Stable'
  | 'Watch'
  | 'Action Required'
  | 'Critical';

/** Unified monitoring metrics across research inbox, alerts, and alert rules. */
export type MonitoringSummary = {
  totalResearchItems: number;
  openResearchItems: number;
  deferredResearchItems: number;
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  totalRules: number;
  enabledRules: number;
  disabledRules: number;
  overallMonitoringStatus: OverallMonitoringStatus;
  actionRequiredSummaryText: string;
};

export type MonitoringSummaryInput = {
  researchInboxSummary: ResearchInboxSummary;
  alertSummary: AlertSummary;
  alertRulesSummary: AlertRulesSummary;
};

export type MonitoringSummaryResult = {
  summary: MonitoringSummary;
};
