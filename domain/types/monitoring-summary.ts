import type { AlertRulesSummary } from './alert-rule';
import type { AlertSummary } from './alert';
import type { FundMonitoringSummary } from './fund-monitoring';
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
  totalMonitoredFunds: number;
  fundsOnWatch: number;
  fundsRequiringReview: number;
  replacementCandidates: number;
};

export type MonitoringSummaryInput = {
  researchInboxSummary: ResearchInboxSummary;
  alertSummary: AlertSummary;
  alertRulesSummary: AlertRulesSummary;
  fundMonitoringSummary: FundMonitoringSummary;
};

export type MonitoringSummaryResult = {
  summary: MonitoringSummary;
};
