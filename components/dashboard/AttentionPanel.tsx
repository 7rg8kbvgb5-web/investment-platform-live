'use client';

import { useMemo } from 'react';
import {
  analyzeInvestmentCommitteeDashboard,
  getMockDeferredReviewsForIC,
  getMockPortfolioGovernanceSummary,
} from '../../lib/engines/investment-committee-dashboard';
import { getMockFundReviewDashboardItems } from '../../lib/engines/fund-review-dashboard';
import { getMockGovernanceAuditEntries } from '../../lib/engines/governance-audit-trail';
import { getMockHouseViewRecommendations } from '../../lib/engines/house-view-engine';
import { formatIsoTimestampDisplay } from '../../lib/format-timestamp';
import StatusBox from './StatusBox';

export default function AttentionPanel() {
  const dashboard = useMemo(() => {
    return analyzeInvestmentCommitteeDashboard({
      fundReviews: getMockFundReviewDashboardItems(),
      houseViews: getMockHouseViewRecommendations(),
      auditEntries: getMockGovernanceAuditEntries(),
      deferredReviews: getMockDeferredReviewsForIC(),
      portfolioGovernance: getMockPortfolioGovernanceSummary(),
    });
  }, []);

  const overdue = dashboard.priorities.overdueReviews;
  const guardrailWarnings = dashboard.governanceHealth.guardrailWarnings;
  const expiringOverlays = dashboard.governanceHealth.expiringTacticalOverlays;
  const reviewsRequiringAction = dashboard.committeeActions.reviewsRequiringAction;

  const hasAnything =
    overdue.length > 0 ||
    guardrailWarnings > 0 ||
    expiringOverlays > 0 ||
    reviewsRequiringAction.length > 0;

  return (
    <section style={card}>
      <h3 style={title}>Needs your attention</h3>
      <StatusBox variant="neutral" display="inline">
        Pulled from Investment Committee and governance workflows — mock data
        until real client reviews flow through.
      </StatusBox>

      {!hasAnything && (
        <p style={emptyText}>Nothing outstanding right now.</p>
      )}

      {overdue.length > 0 && (
        <div style={group}>
          <h4 style={groupTitle}>Overdue reviews</h4>
          <ul style={list}>
            {overdue.map((item) => (
              <li key={item.id} style={row}>
                <span style={rowTitle}>{item.title}</span>
                <span style={rowMeta}>
                  {item.subtitle} · due {formatIsoTimestampDisplay(`${item.reviewDate}T00:00:00.000Z`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reviewsRequiringAction.length > 0 && (
        <div style={group}>
          <h4 style={groupTitle}>Reviews requiring Investment Committee action</h4>
          <ul style={list}>
            {reviewsRequiringAction.map((item) => (
              <li key={item.id} style={row}>
                <span style={rowTitle}>{item.title}</span>
                <span style={rowMeta}>{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(guardrailWarnings > 0 || expiringOverlays > 0) && (
        <div style={group}>
          <h4 style={groupTitle}>Portfolio governance</h4>
          <ul style={list}>
            {guardrailWarnings > 0 && (
              <li style={row}>
                <span style={rowTitle}>{guardrailWarnings} guardrail warning{guardrailWarnings === 1 ? '' : 's'}</span>
                <span style={rowMeta}>Active portfolio construction workflows currently flagging a breach.</span>
              </li>
            )}
            {expiringOverlays > 0 && (
              <li style={row}>
                <span style={rowTitle}>{expiringOverlays} tactical overlay{expiringOverlays === 1 ? '' : 's'} expiring soon</span>
                <span style={rowMeta}>Within the next 30 days.</span>
              </li>
            )}
          </ul>
        </div>
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

const group = {
  marginTop: '16px',
};

const groupTitle = {
  margin: '0 0 8px 0',
  fontSize: '13px',
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const list = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

const row = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
  padding: '10px 12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const rowTitle = {
  fontSize: '14px',
  fontWeight: 600,
};

const rowMeta = {
  fontSize: '12px',
  color: '#94a3b8',
};

const emptyText = {
  margin: '12px 0 0 0',
  fontSize: '13px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
};
