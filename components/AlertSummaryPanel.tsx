'use client';

import { useMemo } from 'react';
import type { AlertSeverity, AlertStatus } from '../domain/types/alert';
import {
  formatAlertCategory,
  formatAlertOrigin,
  formatAlertSeverity,
  formatAlertStatus,
  generateCombinedAlerts,
  summariseAlerts,
} from '../lib/engines/alert-engine';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

function severityVariantForAlert(
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

function alertOriginBadgeVariant(
  origin: import('../domain/types/alert').AlertOrigin
): 'success' | 'warning' | 'neutral' {
  switch (origin) {
    case 'fund_monitoring':
      return 'warning';
    case 'rule_generated':
      return 'neutral';
    case 'static_mock':
      return 'success';
  }
}

function statusVariantForAlert(
  status: AlertStatus
): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'Resolved':
      return 'success';
    case 'Open':
    case 'Acknowledged':
      return 'warning';
    case 'Dismissed':
      return 'neutral';
  }
}

export default function AlertSummaryPanel() {
  const alertResult = useMemo(() => {
    const alerts = generateCombinedAlerts();
    return summariseAlerts({ alerts });
  }, []);

  return (
    <div style={panel}>
      <h3 style={title}>Alert Summary</h3>

      <StatusBox variant="neutral">
        Mock alert engine — local preview only. Combines static mock alerts,
        rule-generated alerts, and fund monitoring assessments. Items can feed
        the research inbox workflow. No persistence or live external data feeds.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total alerts</span>
          <span style={summaryValue}>{alertResult.summary.totalAlerts}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Static mock</span>
          <span style={summaryValue}>
            {alertResult.summary.staticMockAlerts}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Rule-generated</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {alertResult.summary.ruleGeneratedAlerts}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Fund monitoring</span>
          <span style={{ ...summaryValue, color: '#c4b5fd' }}>
            {alertResult.summary.fundMonitoringAlerts}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Critical alerts</span>
          <span style={{ ...summaryValue, color: '#f87171' }}>
            {alertResult.summary.criticalAlerts}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>High alerts</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {alertResult.summary.highAlerts}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Open alerts</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {alertResult.summary.openAlerts}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>Active alerts</h4>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Alert</th>
              <th style={th}>Origin</th>
              <th style={th}>Category</th>
              <th style={th}>Severity</th>
              <th style={th}>Created date</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {alertResult.sortedAlerts.map((alert) => (
              <tr key={alert.id}>
                <td style={td}>
                  <div style={alertCell}>
                    <span style={alertTitle}>{alert.title}</span>
                    <span style={alertSummary}>{alert.summary}</span>
                  </div>
                </td>
                <td style={td}>
                  <span style={badge(alertOriginBadgeVariant(alert.origin))}>
                    {formatAlertOrigin(alert.origin)}
                  </span>
                </td>
                <td style={td}>{formatAlertCategory(alert.category)}</td>
                <td style={td}>
                  <span style={badge(severityVariantForAlert(alert.severity))}>
                    {formatAlertSeverity(alert.severity)}
                  </span>
                </td>
                <td style={td}>
                  {formatIsoTimestampDisplay(alert.createdAt)}
                </td>
                <td style={td}>
                  <span style={badge(statusVariantForAlert(alert.status))}>
                    {formatAlertStatus(alert.status)}
                  </span>
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

const alertCell = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
};

const alertTitle = {
  fontWeight: 600,
};

const alertSummary = {
  fontSize: '12px',
  color: '#94a3b8',
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
