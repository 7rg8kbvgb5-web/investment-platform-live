import type { Alert } from '../../domain/types/alert';
import type {
  AlertRule,
  AlertRuleEvaluationInput,
  AlertRuleEvaluationResult,
  AlertRuleKind,
  AlertRulesEngineResult,
  AlertRulesInput,
  AlertRulesSummary,
} from '../../domain/types/alert-rule';

/** Stable mock alert rules for local preview. */
export const MOCK_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-fund-underperformance',
    name: 'Fund underperformance',
    description:
      'Raise an alert when a model portfolio fund trails its peer group median over the review window.',
    kind: 'Fund Underperformance',
    category: 'Fund Performance',
    severity: 'High',
    enabled: true,
    threshold: '1.5% below peer median (12 months)',
    reviewFrequency: 'Monthly',
  },
  {
    id: 'rule-benchmark-relative-underperformance',
    name: 'Benchmark relative underperformance',
    description:
      'Raise an alert when trailing performance falls below benchmark by the configured tolerance.',
    kind: 'Benchmark Relative Underperformance',
    category: 'Fund Performance',
    severity: 'High',
    enabled: true,
    threshold: '2.0% below benchmark (12 months)',
    reviewFrequency: 'Monthly',
  },
  {
    id: 'rule-manager-change',
    name: 'Manager change',
    description:
      'Raise an alert when a lead portfolio manager departure or material team change is detected.',
    kind: 'Manager Change',
    category: 'Fund Manager Change',
    severity: 'Critical',
    enabled: true,
    threshold: null,
    reviewFrequency: 'On event',
  },
  {
    id: 'rule-portfolio-drift-threshold',
    name: 'Portfolio drift threshold',
    description:
      'Raise an alert when growth/defensive or asset-class drift exceeds the soft guardrail tolerance.',
    kind: 'Portfolio Drift Threshold',
    category: 'Portfolio Drift',
    severity: 'Critical',
    enabled: true,
    threshold: '1.5 percentage points',
    reviewFrequency: 'Daily',
  },
  {
    id: 'rule-house-view-review-due',
    name: 'House view review due',
    description:
      'Raise an alert when a house view recommendation approaches its scheduled review date.',
    kind: 'House View Review Due',
    category: 'House View Review',
    severity: 'Medium',
    enabled: true,
    threshold: '14 days before review date',
    reviewFrequency: 'Weekly',
  },
  {
    id: 'rule-ic-review-overdue',
    name: 'Investment Committee review overdue',
    description:
      'Raise an alert when a deferred IC or governance review passes its review-again date.',
    kind: 'Investment Committee Review Overdue',
    category: 'Governance Review',
    severity: 'High',
    enabled: true,
    threshold: '0 days past review-again date',
    reviewFrequency: 'Daily',
  },
  {
    id: 'rule-research-item-ageing',
    name: 'Research item ageing',
    description:
      'Raise an alert when an inbox research item remains untriaged beyond the ageing threshold.',
    kind: 'Research Item Ageing',
    category: 'Research Review',
    severity: 'Medium',
    enabled: true,
    threshold: '10 business days in New status',
    reviewFrequency: 'Daily',
  },
  {
    id: 'rule-deferred-follow-up-due',
    name: 'Deferred item follow-up due',
    description:
      'Raise an alert when a deferred review or inbox item reaches its follow-up date.',
    kind: 'Deferred Item Follow-up Due',
    category: 'Governance Review',
    severity: 'High',
    enabled: false,
    threshold: 'On review-again date',
    reviewFrequency: 'Daily',
  },
];

function severityRank(severity: AlertRule['severity']): number {
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

function compareRulesBySeverity(a: AlertRule, b: AlertRule): number {
  const severityDiff = severityRank(a.severity) - severityRank(b.severity);
  if (severityDiff !== 0) {
    return severityDiff;
  }
  return a.name.localeCompare(b.name);
}

function buildAlertRulesSummary(rules: AlertRule[]): AlertRulesSummary {
  return {
    totalRules: rules.length,
    enabledRules: rules.filter((rule) => rule.enabled).length,
    disabledRules: rules.filter((rule) => !rule.enabled).length,
    criticalOrHighSeverityRules: rules.filter(
      (rule) => rule.severity === 'Critical' || rule.severity === 'High'
    ).length,
  };
}

export function getMockAlertRules(): AlertRule[] {
  return MOCK_ALERT_RULES.map((rule) => ({ ...rule }));
}

export function formatAlertRuleKind(kind: AlertRuleKind): string {
  return kind;
}

export function formatAlertRuleEnabled(enabled: boolean): string {
  return enabled ? 'Enabled' : 'Disabled';
}

/**
 * Builds alert rule summary metrics from a list of rules.
 * Sorts by severity then name. Does not mutate input.
 */
export function summariseAlertRules({
  rules,
}: AlertRulesInput): AlertRulesEngineResult {
  const sortedRules = [...rules].sort(compareRulesBySeverity);

  return {
    sortedRules,
    summary: buildAlertRulesSummary(sortedRules),
  };
}

/** Mock evaluation scenarios keyed by rule kind. */
const MOCK_RULE_TRIGGERS: Partial<
  Record<
    AlertRuleKind,
    Omit<Alert, 'id' | 'category' | 'severity' | 'origin' | 'sourceRuleId'>
  >
> = {
  'Fund Underperformance': {
    title: 'Australian Equities Fund underperforming peer median',
    summary:
      'Mock evaluation: 12-month return is 1.8% below peer median. Rule threshold breached.',
    status: 'Open',
    createdAt: '2026-06-09T06:00:00.000Z',
    relatedEntityId: 'fr-australian-equities',
  },
  'Benchmark Relative Underperformance': {
    title: 'Global Quality Fund underperforming benchmark',
    summary:
      'Mock evaluation: trailing performance is 2.1% below benchmark. Rule threshold breached.',
    status: 'Open',
    createdAt: '2026-06-09T07:15:00.000Z',
    relatedEntityId: 'fr-global-quality',
  },
  'Manager Change': {
    title: 'Fund manager departure detected',
    summary:
      'Mock evaluation: lead portfolio manager for Infrastructure Fund announced departure.',
    status: 'Open',
    createdAt: '2026-06-06T16:45:00.000Z',
    relatedEntityId: 'fr-infrastructure',
  },
  'Portfolio Drift Threshold': {
    title: 'Portfolio drift exceeds tolerance',
    summary:
      'Mock evaluation: growth allocation drift of 1.8 percentage points exceeds configured threshold.',
    status: 'Open',
    createdAt: '2026-06-08T11:30:00.000Z',
    relatedEntityId: 'portfolio-balanced',
  },
  'House View Review Due': {
    title: 'Australian Equities House View review due',
    summary:
      'Mock evaluation: house view review date is within 14 days. Confirm stance and rationale.',
    status: 'Open',
    createdAt: '2026-06-08T09:00:00.000Z',
    relatedEntityId: 'hv-australian-equities',
  },
  'Investment Committee Review Overdue': {
    title: 'Investment Committee review overdue',
    summary:
      'Mock evaluation: Private Credit Fund review is past the scheduled review-again date.',
    status: 'Open',
    createdAt: '2026-06-07T14:00:00.000Z',
    relatedEntityId: 'fr-private-credit',
  },
  'Research Item Ageing': {
    title: 'External research note awaiting triage',
    summary:
      'Mock evaluation: gold macro thematic research has exceeded the ageing threshold in New status.',
    status: 'Open',
    createdAt: '2026-06-04T08:20:00.000Z',
    relatedEntityId: 'hv-gold',
  },
};

/**
 * Evaluates enabled alert rules against mock input data and returns generated alerts.
 * Does not mutate input rules.
 */
export function evaluateAlertRules({
  rules,
}: AlertRuleEvaluationInput): AlertRuleEvaluationResult {
  const enabledRules = rules.filter((rule) => rule.enabled);
  const generatedAlerts: Alert[] = [];

  for (const rule of enabledRules) {
    const trigger = MOCK_RULE_TRIGGERS[rule.kind];
    if (!trigger) {
      continue;
    }

    generatedAlerts.push({
      id: `alert-from-${rule.id}`,
      category: rule.category,
      severity: rule.severity,
      origin: 'rule_generated',
      sourceRuleId: rule.id,
      ...trigger,
    });
  }

  return {
    generatedAlerts,
    evaluatedRuleCount: enabledRules.length,
    triggeredRuleCount: generatedAlerts.length,
    evaluatedAt: '2026-06-10T08:00:00.000Z',
  };
}
