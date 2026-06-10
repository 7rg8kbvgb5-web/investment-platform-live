'use client';

import { useMemo } from 'react';
import type { AlertSeverity } from '../domain/types/alert';
import {
  formatAlertRuleEnabled,
  formatAlertRuleKind,
  getMockAlertRules,
  summariseAlertRules,
} from '../lib/engines/alert-rules-engine';
import { formatAlertCategory, formatAlertSeverity } from '../lib/engines/alert-engine';
import StatusBox from './dashboard/StatusBox';

function severityVariantForRule(
  severity: AlertSeverity
): 'success' | 'warning' | 'neutral' {
  switch (severity) {
    case 'Critical':
    case 'High':
      return 'warning';
    case 'Medium':
      return 'neutral';
    case 'Low':
      return 'success';
  }
}

function enabledVariantForRule(enabled: boolean): 'success' | 'warning' | 'neutral' {
  return enabled ? 'success' : 'neutral';
}

export default function AlertRulesPanel() {
  const rulesResult = useMemo(() => {
    const rules = getMockAlertRules();
    return summariseAlertRules({ rules });
  }, []);

  return (
    <div style={panel}>
      <h3 style={title}>Alert Rules</h3>

      <StatusBox variant="neutral">
        Configurable alert-generation rules — local preview only. Rules define
        thresholds and review frequency for mock evaluation. No persistence or
        live external data feeds.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total rules</span>
          <span style={summaryValue}>{rulesResult.summary.totalRules}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Enabled rules</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {rulesResult.summary.enabledRules}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Disabled rules</span>
          <span style={{ ...summaryValue, color: '#94a3b8' }}>
            {rulesResult.summary.disabledRules}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Critical / high severity</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {rulesResult.summary.criticalOrHighSeverityRules}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>Rule catalogue</h4>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Rule name</th>
              <th style={th}>Category</th>
              <th style={th}>Severity</th>
              <th style={th}>Enabled</th>
              <th style={th}>Threshold / frequency</th>
              <th style={th}>Description</th>
            </tr>
          </thead>
          <tbody>
            {rulesResult.sortedRules.map((rule) => (
              <tr key={rule.id}>
                <td style={td}>
                  <div style={ruleCell}>
                    <span style={ruleName}>{rule.name}</span>
                    <span style={ruleKind}>{formatAlertRuleKind(rule.kind)}</span>
                  </div>
                </td>
                <td style={td}>{formatAlertCategory(rule.category)}</td>
                <td style={td}>
                  <span style={badge(severityVariantForRule(rule.severity))}>
                    {formatAlertSeverity(rule.severity)}
                  </span>
                </td>
                <td style={td}>
                  <span style={badge(enabledVariantForRule(rule.enabled))}>
                    {formatAlertRuleEnabled(rule.enabled)}
                  </span>
                </td>
                <td style={td}>
                  <div style={thresholdCell}>
                    {rule.threshold ? (
                      <span style={thresholdLine}>Threshold: {rule.threshold}</span>
                    ) : null}
                    {rule.reviewFrequency ? (
                      <span style={thresholdLine}>
                        Frequency: {rule.reviewFrequency}
                      </span>
                    ) : null}
                    {!rule.threshold && !rule.reviewFrequency ? (
                      <span style={thresholdLine}>—</span>
                    ) : null}
                  </div>
                </td>
                <td style={td}>
                  <span style={descriptionText}>{rule.description}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const panel = {
  marginTop: '25px',
};

const title = {
  margin: '0 0 16px 0',
  fontSize: '18px',
  fontWeight: 600,
};

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '12px',
  marginBottom: '20px',
};

const summaryItem = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const summaryLabel = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const summaryValue = {
  fontSize: '18px',
  fontWeight: 600,
};

const sectionTitle = {
  margin: '0 0 12px 0',
  fontSize: '15px',
  fontWeight: 600,
  color: '#94a3b8',
};

const tableWrap = {
  overflowX: 'auto' as const,
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '14px',
};

const th = {
  textAlign: 'left' as const,
  padding: '10px 12px',
  borderBottom: '1px solid #2d4a6b',
  color: '#94a3b8',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  fontWeight: 600,
};

const td = {
  padding: '12px',
  borderBottom: '1px solid #1e3a5f',
  verticalAlign: 'top' as const,
};

const ruleCell = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
};

const ruleName = {
  fontWeight: 600,
};

const ruleKind = {
  fontSize: '12px',
  color: '#64748b',
};

const thresholdCell = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  fontSize: '12px',
  color: '#94a3b8',
};

const thresholdLine = {
  display: 'block',
};

const descriptionText = {
  fontSize: '13px',
  color: '#cbd5e1',
  lineHeight: 1.5,
};

function badge(variant: 'success' | 'warning' | 'neutral') {
  const colors = {
    success: { background: '#0f3d2e', border: '#10b981', color: '#86efac' },
    warning: { background: '#5b2b12', border: '#d97706', color: '#fbbf24' },
    neutral: { background: '#12345b', border: '#2d4a6b', color: '#93c5fd' },
  };

  const palette = colors[variant];

  return {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    background: palette.background,
    border: `1px solid ${palette.border}`,
    color: palette.color,
  };
}
