'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { proposalPipelineItems, getProposalStageLabel, type ProposalStage } from '../../lib/engines/proposal-pipeline';
import StatusBox from './StatusBox';

const STAGE_TO_PAGE: Record<ProposalStage, string> = {
  draft: '/portfolios',
  'adviser-review': '/portfolios',
  'ic-review': '/investment-committee',
  'ready-to-present': '/portfolios',
  implemented: '/portfolios',
};

export default function InProgressPanel() {
  const items = useMemo(
    () => proposalPipelineItems.filter((item) => item.stage !== 'implemented'),
    []
  );

  return (
    <section style={card}>
      <h3 style={title}>In progress</h3>
      <StatusBox variant="neutral" display="inline">
        Client review pipeline — mock data until real client reviews replace it.
      </StatusBox>

      {items.length === 0 && (
        <p style={emptyText}>Nothing currently in progress.</p>
      )}

      {items.length > 0 && (
        <ul style={list}>
          {items.map((item) => (
            <li key={item.id} style={row}>
              <Link href={STAGE_TO_PAGE[item.stage]} style={rowLink}>
                <div style={rowHeader}>
                  <span style={rowTitle}>{item.clientName}</span>
                  <span style={stageBadge}>{getProposalStageLabel(item.stage)}</span>
                </div>
                <span style={rowMeta}>
                  {item.entityType} · {item.portfolioStatus} · {item.adviser} · updated {item.lastUpdated}
                </span>
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
  gap: '4px',
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

const stageBadge = {
  flexShrink: 0,
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#93c5fd',
};

const emptyText = {
  margin: '12px 0 0 0',
  fontSize: '13px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
};
