'use client';

import { useMemo } from 'react';
import type { InvestmentCase } from '../domain/types/investment-case';
import {
  formatInvestmentCaseAction,
  formatInvestmentCasePriority,
  formatInvestmentCaseSource,
  formatInvestmentCaseStatus,
  getMockInvestmentCases,
} from '../lib/engines/investment-case';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

type InvestmentCaseLifecyclePanelProps = {
  investmentCase?: InvestmentCase;
};

export default function InvestmentCaseLifecyclePanel({
  investmentCase: controlledCase,
}: InvestmentCaseLifecyclePanelProps) {
  const investmentCase = useMemo(() => {
    if (controlledCase) {
      return controlledCase;
    }
    const cases = getMockInvestmentCases();
    return (
      cases.find((item) => item.status === 'Committee Review') ??
      cases[0]
    );
  }, [controlledCase]);

  const sortedActions = useMemo(
    () =>
      [...investmentCase.actions].sort(
        (left, right) =>
          new Date(right.timestamp).getTime() -
          new Date(left.timestamp).getTime()
      ),
    [investmentCase.actions]
  );

  return (
    <div style={panel}>
      <p style={eyebrow}>Investment Case Lifecycle</p>
      <h3 style={heading}>{investmentCase.title}</h3>
      <p style={fundName}>{investmentCase.fundName}</p>

      <StatusBox variant="neutral">
        Lifecycle detail for a single governed investment case. Read-only mock
        preview — no Supabase writes or automatic portfolio changes.
      </StatusBox>

      <div style={metaGrid}>
        <div style={metaCard}>
          <p style={metaLabel}>Status</p>
          <p style={metaValue}>
            {formatInvestmentCaseStatus(investmentCase.status)}
          </p>
        </div>
        <div style={metaCard}>
          <p style={metaLabel}>Priority</p>
          <p style={metaValue}>
            {formatInvestmentCasePriority(investmentCase.priority)}
          </p>
        </div>
        <div style={metaCard}>
          <p style={metaLabel}>Owner</p>
          <p style={metaValue}>{investmentCase.owner}</p>
        </div>
        <div style={metaCard}>
          <p style={metaLabel}>Source</p>
          <p style={metaValue}>
            {formatInvestmentCaseSource(investmentCase.source)}
          </p>
        </div>
      </div>

      <div style={detailGrid}>
        <div style={detailBlock}>
          <p style={detailHeading}>Summary</p>
          <p style={detailText}>{investmentCase.summary}</p>
        </div>
        <div style={detailBlock}>
          <p style={detailHeading}>Rationale</p>
          <p style={detailText}>{investmentCase.rationale}</p>
        </div>
      </div>

      <div style={timelineSection}>
        <p style={timelineHeading}>Lifecycle Audit Trail</p>
        <div style={timelineList}>
          {sortedActions.map((entry) => (
            <div key={entry.id} style={timelineItem}>
              <div style={timelineHeader}>
                <p style={timelineAction}>
                  {formatInvestmentCaseAction(entry.action)}
                </p>
                <p style={timelineTimestamp}>
                  {formatIsoTimestampDisplay(entry.timestamp)}
                </p>
              </div>
              <p style={timelineRationale}>{entry.rationale}</p>
              <p style={timelineMeta}>
                {entry.user}
                {entry.fromStatus && entry.toStatus
                  ? ` moved status from ${formatInvestmentCaseStatus(entry.fromStatus)} to ${formatInvestmentCaseStatus(entry.toStatus)}`
                  : entry.toStatus
                    ? ` set status to ${formatInvestmentCaseStatus(entry.toStatus)}`
                    : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p style={footnote}>
        Created {formatIsoTimestampDisplay(investmentCase.createdAt)} · Updated{' '}
        {formatIsoTimestampDisplay(investmentCase.updatedAt)}
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

const eyebrow = {
  margin: 0,
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.2em',
  color: '#64748b',
};

const heading = {
  margin: '8px 0 0 0',
  fontSize: '20px',
  fontWeight: 700,
};

const fundName = {
  margin: '4px 0 16px 0',
  fontSize: '14px',
  color: '#94a3b8',
};

const metaGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '12px',
  marginBottom: '20px',
};

const metaCard = {
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const metaLabel = {
  margin: 0,
  fontSize: '12px',
  color: '#64748b',
};

const metaValue = {
  margin: '4px 0 0 0',
  fontSize: '14px',
  fontWeight: 600,
};

const detailGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '16px',
  marginBottom: '24px',
};

const detailBlock = {
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const detailHeading = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 600,
  color: '#e2e8f0',
};

const detailText = {
  margin: '8px 0 0 0',
  fontSize: '14px',
  lineHeight: 1.6,
  color: '#94a3b8',
};

const timelineSection = {
  marginTop: '8px',
};

const timelineHeading = {
  margin: '0 0 12px 0',
  fontSize: '14px',
  fontWeight: 600,
  color: '#e2e8f0',
};

const timelineList = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
};

const timelineItem = {
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const timelineHeader = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
};

const timelineAction = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 600,
};

const timelineTimestamp = {
  margin: 0,
  fontSize: '12px',
  color: '#64748b',
};

const timelineRationale = {
  margin: '8px 0 0 0',
  fontSize: '14px',
  color: '#94a3b8',
  lineHeight: 1.5,
};

const timelineMeta = {
  margin: '8px 0 0 0',
  fontSize: '12px',
  color: '#64748b',
};

const footnote = {
  marginTop: '16px',
  marginBottom: 0,
  fontSize: '12px',
  color: '#64748b',
};
