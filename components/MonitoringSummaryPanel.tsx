'use client';

import { useMemo } from 'react';
import type { OverallMonitoringStatus } from '../domain/types/monitoring-summary';
import {
  formatOverallMonitoringStatus,
  getCombinedMonitoringSummary,
} from '../lib/engines/monitoring-summary';
import StatusBox from './dashboard/StatusBox';

function statusVariantForMonitoring(
  status: OverallMonitoringStatus
): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'Stable':
      return 'success';
    case 'Watch':
      return 'neutral';
    case 'Action Required':
    case 'Critical':
      return 'warning';
  }
}

export default function MonitoringSummaryPanel() {
  const monitoringResult = useMemo(() => getCombinedMonitoringSummary(), []);
  const { summary } = monitoringResult;

  return (
    <div style={panel}>
      <h3 style={title}>Monitoring Summary</h3>

      <StatusBox variant="neutral">
        Unified monitoring view — aggregates research inbox, alerts, alert
        rules, and fund monitoring. Local preview only. No persistence or live
        external data feeds.
      </StatusBox>

      <div style={statusBanner(statusVariantForMonitoring(summary.overallMonitoringStatus))}>
        <span style={statusBannerLabel}>Overall monitoring status</span>
        <span
          style={{
            ...statusBannerValue,
            color: statusBannerValueColor(
              statusVariantForMonitoring(summary.overallMonitoringStatus)
            ),
          }}
        >
          {formatOverallMonitoringStatus(summary.overallMonitoringStatus)}
        </span>
      </div>

      <p style={actionText}>{summary.actionRequiredSummaryText}</p>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Open research items</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {summary.openResearchItems}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Critical alerts</span>
          <span style={{ ...summaryValue, color: '#f87171' }}>
            {summary.criticalAlerts}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>High alerts</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.highAlerts}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Enabled alert rules</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {summary.enabledRules}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Deferred items</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.deferredResearchItems}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total research items</span>
          <span style={summaryValue}>{summary.totalResearchItems}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total alerts</span>
          <span style={summaryValue}>{summary.totalAlerts}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Disabled rules</span>
          <span style={{ ...summaryValue, color: '#94a3b8' }}>
            {summary.disabledRules}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Monitored funds</span>
          <span style={summaryValue}>{summary.totalMonitoredFunds}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Funds on watch</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.fundsOnWatch}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Review required</span>
          <span style={{ ...summaryValue, color: '#f87171' }}>
            {summary.fundsRequiringReview}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Replacement candidates</span>
          <span style={{ ...summaryValue, color: '#c4b5fd' }}>
            {summary.replacementCandidates}
          </span>
        </div>
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

const actionText = {
  margin: '0 0 16px 0',
  fontSize: '14px',
  color: '#cbd5e1',
  lineHeight: 1.5,
};

function statusBanner(variant: 'success' | 'warning' | 'neutral') {
  const colors = {
    success: { background: '#0f3d2e', border: '#10b981', value: '#86efac' },
    warning: { background: '#5b2b12', border: '#d97706', value: '#fbbf24' },
    neutral: { background: '#12345b', border: '#2d4a6b', value: '#93c5fd' },
  };

  const palette = colors[variant];

  return {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    padding: '16px',
    marginBottom: '16px',
    background: palette.background,
    borderRadius: '8px',
    border: `1px solid ${palette.border}`,
  };
}

const statusBannerLabel = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const statusBannerValue = {
  fontSize: '22px',
  fontWeight: 700,
};

function statusBannerValueColor(variant: 'success' | 'warning' | 'neutral'): string {
  switch (variant) {
    case 'success':
      return '#86efac';
    case 'warning':
      return '#fbbf24';
    case 'neutral':
      return '#93c5fd';
  }
}
