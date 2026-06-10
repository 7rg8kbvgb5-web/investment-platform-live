'use client';

import { useMemo } from 'react';
import {
  analyzeDeferredReviewQueue,
  formatDeferredReviewStatus,
} from '../lib/engines/deferred-review-queue';
import { MOCK_IC_DEFERRED_REVIEWS } from '../lib/engines/investment-committee-dashboard';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

export default function DeferredReviewQueuePanel() {
  const queueResult = useMemo(
    () =>
      analyzeDeferredReviewQueue({
        reviews: MOCK_IC_DEFERRED_REVIEWS,
      }),
    []
  );

  const { openReviews, countsByStatus } = queueResult;

  return (
    <div style={panel}>
      <h3 style={title}>Deferred Review Queue</h3>
      <StatusBox variant="neutral">
        Governance view of deferred fund and portfolio reviews. Local preview
        only — no notifications or persistence.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Open deferred</span>
          <span style={summaryValue}>{openReviews.length}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Due soon</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {countsByStatus['Due Soon']}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Overdue</span>
          <span style={{ ...summaryValue, color: '#f87171' }}>
            {countsByStatus.Overdue}
          </span>
        </div>
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Review</th>
              <th style={th}>Fund / recommendation</th>
              <th style={th}>Deferral reason</th>
              <th style={th}>Deferred</th>
              <th style={th}>Review again</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {queueResult.sortedReviews.map((review) => (
              <tr key={review.id}>
                <td style={td}>{review.reviewTitle}</td>
                <td style={td}>{review.fundOrRecommendationName}</td>
                <td style={td}>{review.deferralReason}</td>
                <td style={td}>
                  {formatIsoTimestampDisplay(review.deferredDate)}
                </td>
                <td style={td}>
                  {formatIsoTimestampDisplay(review.reviewAgainDate)}
                </td>
                <td style={td}>{formatDeferredReviewStatus(review.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const panel = { marginTop: '24px' };
const title = { margin: '0 0 16px', fontSize: '20px' };
const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '12px',
  margin: '16px 0',
};
const summaryItem = {
  padding: '12px',
  background: '#04142b',
  borderRadius: '10px',
  border: '1px solid #2d4a6b',
};
const summaryLabel = {
  display: 'block',
  fontSize: '12px',
  color: '#8fb7e8',
  marginBottom: '4px',
};
const summaryValue = { fontSize: '22px', fontWeight: 700 };
const tableWrap = { overflowX: 'auto' as const, marginTop: '12px' };
const table = { width: '100%', borderCollapse: 'collapse' as const };
const th = {
  textAlign: 'left' as const,
  padding: '10px 8px',
  borderBottom: '1px solid #2d4a6b',
  color: '#8fb7e8',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
};
const td = {
  padding: '10px 8px',
  borderBottom: '1px solid #1e3a5f',
  fontSize: '14px',
};
