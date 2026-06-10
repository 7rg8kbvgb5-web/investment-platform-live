'use client';

import { useMemo } from 'react';
import type { OverallLifecycleStatus } from '../domain/types/fund-research-lifecycle';
import {
  formatOverallLifecycleStatus,
  getCombinedFundResearchLifecycle,
} from '../lib/engines/fund-research-lifecycle';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

function statusVariantForLifecycle(
  status: OverallLifecycleStatus
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

function bottleneckLabel(type: string): string {
  switch (type) {
    case 'overdue_research':
      return 'Overdue research';
    case 'deferred_review':
      return 'Deferred review';
    case 'unresolved_decision':
      return 'Unresolved decision';
    default:
      return type;
  }
}

export default function FundResearchLifecyclePanel() {
  const lifecycleResult = useMemo(() => getCombinedFundResearchLifecycle(), []);
  const { summary, stageCounts, bottlenecks } = lifecycleResult;
  const statusVariant = statusVariantForLifecycle(summary.overallLifecycleStatus);

  return (
    <div style={panel}>
      <h3 style={title}>Fund Research Lifecycle</h3>

      <StatusBox variant="neutral">
        Oversight view of monitored funds through research requests, inbox
        triage, adviser decisions, and audit trail. Local mock data only — no
        persistence or live external feeds.
      </StatusBox>

      <div style={statusBanner(statusVariant)}>
        <span style={statusBannerLabel}>Overall lifecycle status</span>
        <span
          style={{
            ...statusBannerValue,
            color: statusBannerValueColor(statusVariant),
          }}
        >
          {formatOverallLifecycleStatus(summary.overallLifecycleStatus)}
        </span>
        <span style={timestampText}>
          As of {formatIsoTimestampDisplay(summary.asOfTimestamp)}
        </span>
      </div>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Monitored funds</span>
          <span style={summaryValue}>{summary.totalMonitoredFunds}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Review required</span>
          <span style={{ ...summaryValue, color: '#f87171' }}>
            {summary.reviewRequiredFunds}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Active research</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {summary.activeResearchRequests}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Pending decisions</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.pendingDecisions}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Deferred reviews</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.deferredItems}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Completed reviews</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {summary.completedReviews}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>Lifecycle workflow</h4>
      <div style={workflowRow}>
        <WorkflowStage
          label="Fund Monitoring"
          count={stageCounts.fundMonitoring}
        />
        <span style={workflowArrow}>→</span>
        <WorkflowStage
          label="Research Request"
          count={stageCounts.researchRequest}
        />
        <span style={workflowArrow}>→</span>
        <WorkflowStage label="Research Inbox" count={stageCounts.researchInbox} />
        <span style={workflowArrow}>→</span>
        <WorkflowStage
          label="Adviser Decision"
          count={stageCounts.adviserDecision}
        />
        <span style={workflowArrow}>→</span>
        <WorkflowStage label="Audit Trail" count={stageCounts.auditTrail} />
      </div>

      <h4 style={sectionTitle}>Current bottlenecks</h4>
      {bottlenecks.length === 0 ? (
        <p style={emptyText}>No active bottlenecks identified.</p>
      ) : (
        <div style={bottleneckList}>
          {bottlenecks.map((item, index) => (
            <div key={`${item.type}-${item.label}-${index}`} style={bottleneckItem}>
              <span style={bottleneckType}>{bottleneckLabel(item.type)}</span>
              <span style={bottleneckTitle}>{item.label}</span>
              <span style={bottleneckDetail}>{item.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowStage({ label, count }: { label: string; count: number }) {
  return (
    <div style={workflowStage}>
      <span style={workflowStageLabel}>{label}</span>
      <span style={workflowStageCount}>{count}</span>
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

const sectionTitle = {
  margin: '20px 0 12px 0',
  fontSize: '14px',
  fontWeight: 600,
  color: '#cbd5e1',
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

const timestampText = {
  fontSize: '12px',
  color: '#94a3b8',
  marginTop: '4px',
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

function statusBannerValueColor(
  variant: 'success' | 'warning' | 'neutral'
): string {
  switch (variant) {
    case 'success':
      return '#86efac';
    case 'warning':
      return '#fbbf24';
    case 'neutral':
      return '#93c5fd';
  }
}

const workflowRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  alignItems: 'center',
  gap: '8px',
};

const workflowStage = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '10px 12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
  minWidth: '110px',
};

const workflowStageLabel = {
  fontSize: '11px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const workflowStageCount = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#e2e8f0',
};

const workflowArrow = {
  color: '#64748b',
  fontSize: '16px',
  fontWeight: 600,
};

const bottleneckList = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

const bottleneckItem = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const bottleneckType = {
  fontSize: '11px',
  color: '#fbbf24',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  fontWeight: 600,
};

const bottleneckTitle = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#e2e8f0',
};

const bottleneckDetail = {
  fontSize: '13px',
  color: '#94a3b8',
  lineHeight: 1.4,
};

const emptyText = {
  margin: 0,
  fontSize: '14px',
  color: '#94a3b8',
};
