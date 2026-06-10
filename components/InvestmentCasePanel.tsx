'use client';

import { useMemo } from 'react';
import type {
  InvestmentCase,
  InvestmentCasePriority,
  InvestmentCaseSource,
  InvestmentCaseStatus,
} from '../domain/types/investment-case';
import {
  formatInvestmentCaseAction,
  formatInvestmentCasePriority,
  formatInvestmentCaseSource,
  formatInvestmentCaseStatus,
  getLatestInvestmentCaseAction,
  getMockInvestmentCases,
  sortInvestmentCases,
  summariseInvestmentCases,
} from '../lib/engines/investment-case';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

type InvestmentCasePanelProps = {
  cases?: InvestmentCase[];
};

function statusVariant(
  status: InvestmentCaseStatus
): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'Approved':
    case 'Closed':
      return 'success';
    case 'Committee Review':
    case 'Research':
    case 'Under Review':
    case 'Deferred':
      return 'warning';
    case 'New':
    case 'Rejected':
      return 'neutral';
  }
}

function priorityVariant(
  priority: InvestmentCasePriority
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

function sourceVariant(
  source: InvestmentCaseSource
): 'success' | 'warning' | 'neutral' {
  switch (source) {
    case 'Fund Monitoring':
    case 'Alert Engine':
    case 'Fund Review':
      return 'warning';
    case 'Investment Committee':
    case 'Governance':
      return 'neutral';
    case 'Research Inbox':
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

export default function InvestmentCasePanel({
  cases: controlledCases,
}: InvestmentCasePanelProps) {
  const cases = useMemo(
    () => sortInvestmentCases(controlledCases ?? getMockInvestmentCases()),
    [controlledCases]
  );

  const summary = useMemo(() => summariseInvestmentCases(cases), [cases]);

  return (
    <div style={panel}>
      <h3 style={title}>Investment Cases</h3>

      <StatusBox variant="neutral">
        Unified investment case lifecycle across fund monitoring, research,
        fund review, committee, and governance workflows. Local mock state only
        — no Supabase writes or automatic portfolio changes.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total cases</span>
          <span style={summaryValue}>{summary.totalCases}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Open cases</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.openCount}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Committee review</span>
          <span style={summaryValue}>{summary.committeeReviewCount}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Deferred</span>
          <span style={summaryValue}>{summary.deferredCount}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Approved</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {summary.approvedCount}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Critical / high</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.criticalPriorityCount} / {summary.highPriorityCount}
          </span>
        </div>
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Case</th>
              <th style={th}>Fund</th>
              <th style={th}>Source</th>
              <th style={th}>Status</th>
              <th style={th}>Priority</th>
              <th style={th}>Owner</th>
              <th style={th}>Latest action</th>
              <th style={th}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((investmentCase) => {
              const latestAction = getLatestInvestmentCaseAction(investmentCase);

              return (
                <tr key={investmentCase.id}>
                  <td style={td}>
                    <span style={caseTitleCell}>{investmentCase.title}</span>
                    <span style={caseSummaryCell}>{investmentCase.summary}</span>
                    {investmentCase.actions.length > 0 ? (
                      <details style={auditDetails}>
                        <summary style={auditSummary}>
                          Audit trail ({investmentCase.actions.length})
                        </summary>
                        <ul style={auditList}>
                          {[...investmentCase.actions]
                            .sort(
                              (left, right) =>
                                new Date(right.timestamp).getTime() -
                                new Date(left.timestamp).getTime()
                            )
                            .map((entry) => (
                              <li key={entry.id} style={auditItem}>
                                <span style={auditAction}>
                                  {formatInvestmentCaseAction(entry.action)}
                                  {entry.toStatus
                                    ? ` → ${formatInvestmentCaseStatus(entry.toStatus)}`
                                    : ''}
                                </span>
                                <span style={auditMeta}>
                                  {entry.user} ·{' '}
                                  {formatIsoTimestampDisplay(entry.timestamp)}
                                </span>
                                <span style={auditRationale}>{entry.rationale}</span>
                              </li>
                            ))}
                        </ul>
                      </details>
                    ) : null}
                  </td>
                  <td style={td}>{investmentCase.fundName}</td>
                  <td style={td}>
                    <span style={badge(sourceVariant(investmentCase.source))}>
                      {formatInvestmentCaseSource(investmentCase.source)}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={badge(statusVariant(investmentCase.status))}>
                      {formatInvestmentCaseStatus(investmentCase.status)}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={badge(priorityVariant(investmentCase.priority))}>
                      {formatInvestmentCasePriority(investmentCase.priority)}
                    </span>
                  </td>
                  <td style={td}>{investmentCase.owner}</td>
                  <td style={td}>
                    {latestAction
                      ? formatInvestmentCaseAction(latestAction.action)
                      : '—'}
                  </td>
                  <td style={td}>
                    {formatIsoTimestampDisplay(investmentCase.updatedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={footnote}>
        Investment cases provide a single governed record from initial signal
        through research, fund review, committee decision, and closure. Adviser
        actions and persistence will be added in subsequent steps.
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

const caseTitleCell = {
  display: 'block',
  fontWeight: 600,
  marginBottom: '4px',
};

const caseSummaryCell = {
  display: 'block',
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.4,
  marginBottom: '8px',
};

const auditDetails = {
  marginTop: '8px',
  fontSize: '12px',
};

const auditSummary = {
  cursor: 'pointer',
  color: '#93c5fd',
  fontWeight: 600,
};

const auditList = {
  margin: '8px 0 0 0',
  paddingLeft: '16px',
  listStyle: 'disc',
};

const auditItem = {
  marginBottom: '8px',
};

const auditAction = {
  display: 'block',
  fontWeight: 600,
  color: '#e2e8f0',
};

const auditMeta = {
  display: 'block',
  color: '#64748b',
  fontSize: '11px',
  marginTop: '2px',
};

const auditRationale = {
  display: 'block',
  color: '#94a3b8',
  marginTop: '2px',
  lineHeight: 1.4,
};

const footnote = {
  marginTop: '16px',
  marginBottom: 0,
  fontSize: '12px',
  color: '#64748b',
};
