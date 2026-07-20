'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  getMockGovernanceAuditEntries,
  formatGovernanceAuditArea,
  formatGovernanceAuditAction,
} from '../../lib/engines/governance-audit-trail';
import type { GovernanceAuditArea } from '../../domain/types/governance-audit';
import { formatIsoTimestampDisplay } from '../../lib/format-timestamp';
import StatusBox from './StatusBox';

const AREA_TO_PAGE: Record<GovernanceAuditArea, string> = {
  'Fund Review': '/fund-reviews',
  'Portfolio Scenario': '/portfolios',
  'Tactical Overlay': '/portfolios',
  Guardrail: '/portfolios',
  Approval: '/investment-committee',
  'House View': '/investment-committee',
};

export default function RecentlyActionedPanel() {
  const entries = useMemo(() => {
    return [...getMockGovernanceAuditEntries()]
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, 5);
  }, []);

  return (
    <section style={card}>
      <h3 style={title}>Recently actioned</h3>
      <StatusBox variant="neutral" display="inline">
        Governance audit trail — mock data until real decisions are recorded.
      </StatusBox>

      {entries.length === 0 && (
        <p style={emptyText}>No recent activity.</p>
      )}

      {entries.length > 0 && (
        <ul style={list}>
          {entries.map((entry) => (
            <li key={entry.id} style={row}>
              <Link href={AREA_TO_PAGE[entry.area] ?? '/governance'} style={rowLink}>
                <div style={rowHeader}>
                  <span style={rowTitle}>{entry.subject}</span>
                  <span style={actionBadge}>{formatGovernanceAuditAction(entry.action)}</span>
                </div>
                <span style={rowMeta}>
                  {formatGovernanceAuditArea(entry.area)} · {entry.actor} · {formatIsoTimestampDisplay(entry.timestamp)}
                </span>
                <span style={rowSummary}>{entry.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const card = {
  padding: '20px',
  background: '#0d2a4d',
  borderRadius: '14px',
  border: '1px solid #2d4a6b',
};

const title = {
  margin: '0 0 10px 0',
  fontSize: '17px',
  fontWeight: 600,
};

const list = {
  margin: '14px 0 0 0',
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

const row = {
  padding: '10px 12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const rowLink = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '3px',
  width: '100%',
  textDecoration: 'none',
  color: 'inherit',
};

const rowHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
};

const rowTitle = {
  fontSize: '14px',
  fontWeight: 600,
};

const rowMeta = {
  fontSize: '12px',
  color: '#94a3b8',
};

const rowSummary = {
  fontSize: '12px',
  color: '#cbd5e1',
  lineHeight: 1.4,
};

const actionBadge = {
  flexShrink: 0,
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#86efac',
};

const emptyText = {
  margin: '12px 0 0 0',
  fontSize: '13px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
};
