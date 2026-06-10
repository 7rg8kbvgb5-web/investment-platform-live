'use client';

import { useMemo } from 'react';
import type {
  ResearchRequestPriority,
  ResearchRequestSource,
  ResearchRequestStatus,
} from '../domain/types/research-request';
import type { ResearchRequest } from '../domain/types/research-request';
import {
  formatResearchRequestPriority,
  formatResearchRequestSource,
  formatResearchRequestStatus,
  getMockResearchRequests,
  sortResearchRequests,
  summariseResearchRequests,
} from '../lib/engines/research-request';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

type ResearchRequestPanelProps = {
  /** When provided, displays controlled research requests (e.g. from fund decisions). */
  requests?: ResearchRequest[];
};

function statusVariant(
  status: ResearchRequestStatus
): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'Completed':
      return 'success';
    case 'Submitted':
    case 'In Progress':
    case 'Waiting On External Research':
      return 'warning';
    case 'Draft':
    case 'Cancelled':
      return 'neutral';
  }
}

function priorityVariant(
  priority: ResearchRequestPriority
): 'success' | 'warning' | 'neutral' {
  switch (priority) {
    case 'Critical':
    case 'High':
      return 'warning';
    case 'Medium':
      return 'neutral';
    case 'Low':
      return 'success';
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

function sourceVariant(
  source: ResearchRequestSource
): 'success' | 'warning' | 'neutral' {
  switch (source) {
    case 'Fund Review Decision':
      return 'warning';
    case 'Alert Engine':
    case 'Investment Committee':
      return 'neutral';
    case 'Adviser Request':
    case 'Manual Entry':
      return 'success';
  }
}

export default function ResearchRequestPanel({
  requests: controlledRequests,
}: ResearchRequestPanelProps) {
  const requests = useMemo(
    () =>
      sortResearchRequests(
        controlledRequests ?? getMockResearchRequests()
      ),
    [controlledRequests]
  );

  const summary = useMemo(
    () => summariseResearchRequests(requests),
    [requests]
  );

  const submittedOrInProgress =
    summary.submittedCount + summary.inProgressCount;

  return (
    <div style={panel}>
      <h3 style={title}>Research Requests</h3>

      <StatusBox variant="neutral">
        Structured research requests raised from fund review decisions and
        monitoring workflows. Local mock state only — no Supabase writes or
        external data feeds.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total requests</span>
          <span style={summaryValue}>{summary.totalRequests}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Submitted / in progress</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {submittedOrInProgress}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Waiting on external</span>
          <span style={summaryValue}>{summary.waitingOnExternalCount}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Completed</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {summary.completedCount}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Critical / high priority</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.criticalPriorityCount} / {summary.highPriorityCount}
          </span>
        </div>
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Request title</th>
              <th style={th}>Source</th>
              <th style={th}>Priority</th>
              <th style={th}>Status</th>
              <th style={th}>Related fund</th>
              <th style={th}>Requested by</th>
              <th style={th}>Created</th>
              <th style={th}>Due date</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td style={td}>
                  <span style={requestTitleCell}>{request.title}</span>
                  <span style={requestDescriptionCell}>
                    {request.description}
                  </span>
                </td>
                <td style={td}>
                  <span style={badge(sourceVariant(request.source))}>
                    {formatResearchRequestSource(request.source)}
                  </span>
                </td>
                <td style={td}>
                  <span style={badge(priorityVariant(request.priority))}>
                    {formatResearchRequestPriority(request.priority)}
                  </span>
                </td>
                <td style={td}>
                  <span style={badge(statusVariant(request.status))}>
                    {formatResearchRequestStatus(request.status)}
                  </span>
                </td>
                <td style={td}>{request.relatedFundName}</td>
                <td style={td}>{request.requestedBy}</td>
                <td style={td}>
                  {formatIsoTimestampDisplay(request.createdAt)}
                </td>
                <td style={td}>{request.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={footnote}>
        When an adviser records &ldquo;Request More Research&rdquo; on a fund
        review decision, a structured research request is created for adviser
        and research team follow-up. No automatic portfolio changes.
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

const requestTitleCell = {
  display: 'block',
  fontWeight: 600,
  marginBottom: '4px',
};

const requestDescriptionCell = {
  display: 'block',
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.4,
};

const footnote = {
  marginTop: '16px',
  marginBottom: 0,
  fontSize: '12px',
  color: '#64748b',
};
