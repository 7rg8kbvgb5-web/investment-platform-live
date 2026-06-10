import type { Alert, AlertCategory, AlertSeverity } from './alert';

/** Configurable alert rule kinds supported by the rules engine. */
export type AlertRuleKind =
  | 'Fund Underperformance'
  | 'Benchmark Relative Underperformance'
  | 'Manager Change'
  | 'Portfolio Drift Threshold'
  | 'House View Review Due'
  | 'Investment Committee Review Overdue'
  | 'Research Item Ageing'
  | 'Deferred Item Follow-up Due';

/** A configurable rule that can generate platform alerts when evaluated. */
export type AlertRule = {
  id: string;
  name: string;
  description: string;
  kind: AlertRuleKind;
  category: AlertCategory;
  severity: AlertSeverity;
  enabled: boolean;
  /** Threshold expression when applicable (e.g. percentage drift). */
  threshold?: string | null;
  /** Review frequency when applicable (e.g. days between checks). */
  reviewFrequency?: string | null;
};

export type AlertRulesInput = {
  rules: AlertRule[];
};

export type AlertRulesSummary = {
  totalRules: number;
  enabledRules: number;
  disabledRules: number;
  criticalOrHighSeverityRules: number;
};

export type AlertRulesEngineResult = {
  sortedRules: AlertRule[];
  summary: AlertRulesSummary;
};

export type AlertRuleEvaluationInput = {
  rules: AlertRule[];
};

export type AlertRuleEvaluationResult = {
  generatedAlerts: Alert[];
  evaluatedRuleCount: number;
  triggeredRuleCount: number;
  evaluatedAt: string;
};
