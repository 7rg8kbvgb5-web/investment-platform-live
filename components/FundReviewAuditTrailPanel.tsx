'use client';

import { useMemo } from 'react';
import type {
  FundMonitoringDecisionAction,
  FundReviewAuditEventType,
} from '../domain/types/fund-monitoring';
import {
  formatAuditEventActionLabel,
  formatFundReviewAuditEventType,
  getMockFundReviewAuditTrail,
  sortFundReviewAuditEvents,
  summariseFundReviewAuditTrail,
} from '../lib/engines/fund-review-audit-trail';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

function eventVariant(
  eventType: FundReviewAuditEventType
): 'success' | 'warning' | 'neutral' {
  switch (eventType) {
    case 'Fund Kept':
    case 'Review Completed':
      return 'success';
    case 'Fund Placed On Watch':
    case 'Review Deferred':
    case 'More Research Requested':
      return 'warning';
    case 'Decision Created':
    case 'Replacement Recommended':
      return 'neutral';
  }
}

function actionVariant(
  action: FundMonitoringDecisionAction
): 'success' | 'warning' | 'neutral' {
  switch (action) {
    case 'keep':
      return 'success';
    case 'watch':
    case 'defer':
    case 'request_more_research':
      return 'warning';
    case 'replace':
      return 'neutral';
  }
}

function badge(variant: 'success' | 'warning' | 'neutral') {
  const colors = {
    success: { bg: '#14532d', text: '#86efac', border: '#166534' },
    warning: { bg: '#713f12', text: '#fbbf24', border: '#854d0e' },
    neutral: { bg: '#1e3a5f', text: '#93c5fd', border: '#2d4a6b' },
  };
  const { bg, text, border } = colors[variant];
  return {
    display: 'inline-block' as const,
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    background: bg,
    color: text,
    border: `1px solid ${border}`,
  };
}

export default function FundReviewAuditTrailPanel() {
  const auditEvents = useMemo(() => getMockFundReviewAuditTrail(), []);

  const sortedEvents = useMemo(
    () => sortFundReviewAuditEvents(auditEvents),
    [auditEvents]
  );

  const summary = useMemo(
    () => summariseFundReviewAuditTrail(auditEvents),
    [auditEvents]
  );

  return (
    <div style={panel}>
      <h3 style={title}>Fund Review Audit Trail</h3>

      <StatusBox variant="neutral">
        Governed audit history for fund monitoring adviser decisions. Local mock
        data only — no portfolio changes or Supabase writes.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total audit events</span>
          <span style={summaryValue}>{summary.totalEvents}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Replacement recommendations</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {summary.replacementRecommendations}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Deferred reviews</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.deferredReviews}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>More research requests</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.moreResearchRequests}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Funds kept / on watch</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {summary.fundsKept} / {summary.fundsOnWatch}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>Recent audit events</h4>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Timestamp</th>
              <th style={th}>Fund</th>
              <th style={th}>Event type</th>
              <th style={th}>Action</th>
              <th style={th}>Created by</th>
              <th style={th}>Rationale</th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.map((event) => (
              <tr key={event.id}>
                <td style={td}>
                  {formatIsoTimestampDisplay(event.createdAt)}
                </td>
                <td style={td}>
                  <span style={fundNameCell}>{event.fundName}</span>
                </td>
                <td style={td}>
                  <span style={badge(eventVariant(event.eventType))}>
                    {formatFundReviewAuditEventType(event.eventType)}
                  </span>
                </td>
                <td style={td}>
                  <span style={badge(actionVariant(event.action))}>
                    {formatAuditEventActionLabel(event.action)}
                  </span>
                </td>
                <td style={td}>{event.createdBy}</td>
                <td style={td}>{event.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={footnote}>
        Audit events are read-only mock records. Portfolio holdings are not
        changed automatically.
      </p>
    </div>
  );
}

const panel = {
  marginTop: '32px',
  padding: '24px',
  background: '#0f2744',
  borderRadius: '12px',
  border: '1px solid #2d4a6b',
};

const title = {
  margin: '0 0 16px 0',
  fontSize: '18px',
  fontWeight: 700,
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
  fontSize: '20px',
  fontWeight: 700,
};

const sectionTitle = {
  margin: '20px 0 12px 0',
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
  fontSize: '13px',
};

const th = {
  textAlign: 'left' as const,
  padding: '10px 12px',
  borderBottom: '1px solid #334155',
  color: '#94a3b8',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const td = {
  padding: '10px 12px',
  borderBottom: '1px solid #1e293b',
  verticalAlign: 'top' as const,
};

const fundNameCell = {
  fontWeight: 600,
};

const footnote = {
  marginTop: '16px',
  marginBottom: 0,
  fontSize: '12px',
  color: '#64748b',
};
