'use client';

import { useMemo } from 'react';
import type { GovernanceAuditAction } from '../domain/types/governance-audit';
import {
  analyzeGovernanceAuditTrail,
  formatGovernanceAuditAction,
  formatGovernanceAuditArea,
  getMockGovernanceAuditEntries,
} from '../lib/engines/governance-audit-trail';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

function actionVariantForAudit(
  action: GovernanceAuditAction
): 'success' | 'warning' | 'neutral' {
  switch (action) {
    case 'accepted':
    case 'approved':
      return 'success';
    case 'deferred':
    case 'research_requested':
    case 'warning_flagged':
      return 'warning';
    case 'created':
    case 'updated':
    case 'rejected':
    case 'simulation_run':
      return 'neutral';
  }
}

export default function GovernanceAuditTrailPanel() {
  const auditTrail = useMemo(() => {
    const entries = getMockGovernanceAuditEntries();
    return analyzeGovernanceAuditTrail({ entries });
  }, []);

  return (
    <div style={panel}>
      <h3 style={title}>Governance Audit Trail</h3>

      <StatusBox variant="neutral">
        Mock governance audit history — local preview only. Tracks adviser and
        system events across fund reviews, scenarios, guardrails, and approvals.
        No persistence or live feeds.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total events</span>
          <span style={summaryValue}>{auditTrail.summary.totalEntries}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Fund review events</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {auditTrail.summary.fundReviewEvents}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Scenario events</span>
          <span style={summaryValue}>
            {auditTrail.summary.portfolioScenarioEvents}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Approval events</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {auditTrail.summary.approvalEvents}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Guardrail / overlay events</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {auditTrail.summary.guardrailEvents}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>Audit log</h4>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Timestamp</th>
              <th style={th}>Area</th>
              <th style={th}>Action</th>
              <th style={th}>Subject</th>
              <th style={th}>Actor</th>
              <th style={th}>Summary</th>
            </tr>
          </thead>
          <tbody>
            {auditTrail.sortedEntries.map((entry) => (
              <tr key={entry.id}>
                <td style={td}>{formatIsoTimestampDisplay(entry.timestamp)}</td>
                <td style={td}>{formatGovernanceAuditArea(entry.area)}</td>
                <td style={td}>
                  <span style={actionBadge(actionVariantForAudit(entry.action))}>
                    {formatGovernanceAuditAction(entry.action)}
                  </span>
                </td>
                <td style={td}>
                  <span style={subjectText}>{entry.subject}</span>
                </td>
                <td style={td}>{entry.actor}</td>
                <td style={td}>
                  <div style={summaryCell}>
                    <span>{entry.summary}</span>
                    {entry.rationale ? (
                      <span style={rationaleText}>Rationale: {entry.rationale}</span>
                    ) : null}
                  </div>
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

const subjectText = {
  fontWeight: 600,
};

const summaryCell = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
};

const rationaleText = {
  fontSize: '12px',
  color: '#94a3b8',
};

function actionBadge(variant: 'success' | 'warning' | 'neutral') {
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
