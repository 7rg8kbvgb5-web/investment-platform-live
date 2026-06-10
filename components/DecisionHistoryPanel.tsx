'use client';

import { useMemo } from 'react';
import type {
  FundReviewDecision,
  FundReviewStatus,
} from '../domain/types/fund-monitoring';
import { analyzeFundReviewDecisionHistory } from '../lib/engines/fund-review-decision-history';
import {
  formatFundReviewAction,
  formatFundReviewStatus,
} from '../lib/engines/fund-review-lifecycle';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

const MOCK_DECISIONS: FundReviewDecision[] = [
  {
    action: 'defer',
    rationale: 'Awaiting updated manager commentary before proceeding.',
    decidedAt: '2026-06-01T10:00:00.000Z',
    status: 'Deferred',
    decidedBy: 'Adviser — Portfolio Team',
  },
  {
    action: 'request_more_research',
    rationale:
      'Need peer group performance analysis for alternative candidates.',
    decidedAt: '2026-06-05T14:30:00.000Z',
    status: 'Research Requested',
    decidedBy: 'Investment Committee — Review Lead',
  },
  {
    action: 'accept',
    rationale:
      'Alternative fund meets best-in-class criteria after research completion.',
    decidedAt: '2026-06-08T09:15:00.000Z',
    status: 'Accepted',
    decidedBy: 'Investment Committee — Chair',
  },
];

function statusVariant(
  status: FundReviewStatus
): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'Accepted':
    case 'Closed':
      return 'success';
    case 'Open':
    case 'Under Review':
    case 'Deferred':
    case 'Research Requested':
      return 'warning';
    case 'Rejected':
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

export default function DecisionHistoryPanel() {
  const history = useMemo(
    () =>
      analyzeFundReviewDecisionHistory({
        decisions: MOCK_DECISIONS,
      }),
    []
  );

  return (
    <div style={panel}>
      <h3 style={title}>Decision History</h3>

      <StatusBox variant="neutral">
        Chronological adviser decision history across fund review workflows.
        Local mock data only — read-only governance view.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total decisions</span>
          <span style={summaryValue}>{history.sortedDecisions.length}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Current status</span>
          <span style={summaryValue}>
            {formatFundReviewStatus(history.currentStatus)}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Workflow locked</span>
          <span style={summaryValue}>{history.isLocked ? 'Yes' : 'No'}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Deferred</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {history.countsByAction.defer}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Research requested</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {history.countsByAction.request_more_research}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Accepted</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {history.countsByAction.accept}
          </span>
        </div>
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Timestamp</th>
              <th style={th}>Action</th>
              <th style={th}>Status</th>
              <th style={th}>Decided by</th>
              <th style={th}>Rationale</th>
            </tr>
          </thead>
          <tbody>
            {history.sortedDecisions.map((entry, index) => (
              <tr key={`${entry.decidedAt}-${index}`}>
                <td style={td}>{formatIsoTimestampDisplay(entry.decidedAt)}</td>
                <td style={td}>{formatFundReviewAction(entry.action)}</td>
                <td style={td}>
                  <span style={badge(statusVariant(entry.status))}>
                    {formatFundReviewStatus(entry.status)}
                  </span>
                </td>
                <td style={td}>{entry.decidedBy ?? '—'}</td>
                <td style={td}>{entry.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const panel = {
  marginBottom: '35px',
  padding: '30px',
  background: '#04142b',
  borderRadius: '18px',
  border: '1px solid #1e3a5f',
};

const title = {
  margin: '0 0 16px',
  fontSize: '22px',
  fontWeight: 700,
};

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '16px',
  margin: '20px 0',
};

const summaryItem = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
};

const summaryLabel = {
  fontSize: '12px',
  color: '#98a2b3',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
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
  fontSize: '14px',
};

const th = {
  textAlign: 'left' as const,
  padding: '10px 12px',
  borderBottom: '1px solid #2d4a6b',
  color: '#98a2b3',
  fontWeight: 600,
};

const td = {
  padding: '12px',
  borderBottom: '1px solid #1e3a5f',
  verticalAlign: 'top' as const,
};
