'use client';

import { useMemo } from 'react';
import type { FundReviewDashboardItem } from '../domain/types/fund-review-dashboard';
import {
  analyzeFundReviewDashboard,
  formatFundReviewRecommendation,
  getHouseViewTitleForReview,
  getMockFundReviewDashboardItems,
} from '../lib/engines/fund-review-dashboard';
import { formatFundReviewStatus } from '../lib/engines/fund-review-lifecycle';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

function formatReviewDate(date: string): string {
  return formatIsoTimestampDisplay(`${date}T00:00:00.000Z`);
}

function statusVariantForReview(
  status: FundReviewDashboardItem['status']
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

export default function MultiFundReviewDashboardPanel() {
  const dashboard = useMemo(() => {
    const reviews = getMockFundReviewDashboardItems();
    return analyzeFundReviewDashboard({ reviews });
  }, []);

  return (
    <div style={panel}>
      <h3 style={title}>Multi-Fund Review Dashboard</h3>

      <StatusBox variant="neutral">
        Mock concurrent fund reviews — local preview only. Each review links
        conceptually to house views where applicable; no automatic fund changes
        are applied.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Open reviews</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {dashboard.summary.openReviews}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Accepted reviews</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {dashboard.summary.acceptedReviews}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Deferred reviews</span>
          <span style={summaryValue}>{dashboard.summary.deferredReviews}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Research requests</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {dashboard.summary.researchRequests}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>Fund reviews</h4>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Fund</th>
              <th style={th}>Status</th>
              <th style={th}>Recommendation</th>
              <th style={th}>Confidence</th>
              <th style={th}>Review date</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.sortedReviews.map((review) => {
              const houseViewTitle = getHouseViewTitleForReview(
                review.houseViewLink
              );

              return (
                <tr key={review.id}>
                  <td style={td}>
                    <div style={fundCell}>
                      <span style={fundName}>{review.fundName}</span>
                      <span style={fundMeta}>
                        {review.assetClass}
                        {houseViewTitle
                          ? ` · House view: ${houseViewTitle}`
                          : ''}
                      </span>
                    </div>
                  </td>
                  <td style={td}>
                    <span style={statusBadge(statusVariantForReview(review.status))}>
                      {formatFundReviewStatus(review.status)}
                    </span>
                  </td>
                  <td style={td}>
                    {formatFundReviewRecommendation(review.recommendation)}
                  </td>
                  <td style={td}>{review.confidenceScore}/100</td>
                  <td style={td}>{formatReviewDate(review.reviewDate)}</td>
                </tr>
              );
            })}
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

const fundCell = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
};

const fundName = {
  fontWeight: 600,
};

const fundMeta = {
  fontSize: '12px',
  color: '#94a3b8',
};

function statusBadge(variant: 'success' | 'warning' | 'neutral') {
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
