'use client';

import { useMemo, useState } from 'react';
import type {
  DeferredReview,
  FundAlternative,
  FundHolding,
  FundMonitoringStatus,
  FundReviewAction,
  FundReviewLifecycle,
  FundReviewPriority,
  FundReviewStatus,
} from '../domain/types/fund-monitoring';
import {
  assessMonitoredFunds,
  formatFundMonitoringStatus,
  formatFundReviewPriority,
  formatFundReviewReason,
  getMockMonitoredFunds,
} from '../lib/engines/fund-monitoring';
import {
  analyzeDeferredReviewQueue,
  completeOpenDeferredReviews,
  createDeferredReview,
  formatDeferredReviewStatus,
} from '../lib/engines/deferred-review-queue';
import { analyzeFundReviewDecisionHistory } from '../lib/engines/fund-review-decision-history';
import {
  applyFundReviewDecision,
  createFundReviewLifecycle,
  formatFundReviewAction,
  formatFundReviewStatus,
} from '../lib/engines/fund-review-lifecycle';
import { reviewFundMonitoring } from '../lib/engines/fund-monitoring-review';
import {
  formatIsoTimestampDisplay,
  PREVIEW_DATE,
  PREVIEW_TIMESTAMP,
} from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

const MOCK_CURRENT_FUND: FundHolding = {
  fundId: 'fund-vanguard-aus-shares',
  fundName: 'Vanguard Australian Shares Index',
  assetClass: 'Australian Equities',
  weight: 18,
  modelPortfolioId: 'model-balanced-growth',
  performanceScore: 72,
  costScore: 68,
  riskScore: 70,
  liquidityScore: 71,
  qualitativeScore: 69,
};

const MOCK_ALTERNATIVES: FundAlternative[] = [
  {
    fundId: 'fund-beta-aus-shares',
    fundName: 'BetaShares Australian Equities ETF',
    assetClass: 'Australian Equities',
    performanceScore: 85,
    costScore: 78,
    riskScore: 80,
    liquidityScore: 79,
    qualitativeScore: 78,
  },
  {
    fundId: 'fund-legacy-aus-shares',
    fundName: 'Legacy Active Australian Equity Fund',
    assetClass: 'Australian Equities',
    performanceScore: 65,
    costScore: 58,
    riskScore: 62,
    liquidityScore: 60,
    qualitativeScore: 55,
  },
  {
    fundId: 'fund-intl-equities',
    fundName: 'Global Developed Markets Index',
    assetClass: 'International Equities',
    performanceScore: 90,
    costScore: 88,
    riskScore: 85,
    liquidityScore: 87,
    qualitativeScore: 86,
  },
];

function formatRecommendation(
  recommendation: 'retain_current' | 'review_alternative'
): string {
  return recommendation === 'review_alternative'
    ? 'Review alternative fund'
    : 'Retain current fund';
}

function statusVariantForDeferredReview(
  status: DeferredReview['status']
): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'Completed':
      return 'success';
    case 'Due Soon':
    case 'Overdue':
      return 'warning';
    case 'Deferred':
      return 'neutral';
  }
}

function statusVariantForMonitoringStatus(
  status: FundMonitoringStatus
): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'Current':
    case 'Archived':
      return 'success';
    case 'Watch':
    case 'Review Required':
      return 'warning';
    case 'Replacement Candidate':
      return 'neutral';
  }
}

function statusVariantForReviewPriority(
  priority: FundReviewPriority
): 'success' | 'warning' | 'neutral' {
  switch (priority) {
    case 'Low':
      return 'success';
    case 'Medium':
      return 'neutral';
    case 'High':
    case 'Critical':
      return 'warning';
  }
}

function statusVariantForLifecycle(
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

function nextDecisionTimestamp(decisionCount: number): string {
  const base = new Date(PREVIEW_TIMESTAMP);
  base.setUTCMinutes(base.getUTCMinutes() + decisionCount);
  return base.toISOString();
}

export default function FundMonitoringPanel() {
  const [rationale, setRationale] = useState('');
  const [selectedAction, setSelectedAction] = useState<FundReviewAction | null>(
    null
  );

  const monitoredFundsResult = useMemo(
    () => assessMonitoredFunds(getMockMonitoredFunds(), PREVIEW_DATE),
    []
  );

  const review = useMemo(
    () =>
      reviewFundMonitoring({
        currentFund: MOCK_CURRENT_FUND,
        alternatives: MOCK_ALTERNATIVES,
      }),
    []
  );

  const [lifecycle, setLifecycle] = useState<FundReviewLifecycle>(() =>
    createFundReviewLifecycle(review)
  );
  const [deferredReviews, setDeferredReviews] = useState<DeferredReview[]>(
    []
  );

  const decisionHistory = useMemo(
    () =>
      analyzeFundReviewDecisionHistory({
        decisions: lifecycle.decisions,
        initialStatus: lifecycle.currentStatus,
      }),
    [lifecycle.decisions, lifecycle.currentStatus]
  );

  const deferredReviewQueue = useMemo(
    () =>
      analyzeDeferredReviewQueue({
        reviews: deferredReviews,
        currentDate: PREVIEW_DATE,
      }),
    [deferredReviews]
  );

  const actionsDisabled = decisionHistory.isLocked;

  const reviewStatusVariant = statusVariantForLifecycle(lifecycle.currentStatus);

  function handleRecordDecision() {
    if (!selectedAction || !rationale.trim() || actionsDisabled) {
      return;
    }

    const decisionTimestamp = nextDecisionTimestamp(lifecycle.decisions.length);

    setLifecycle((current) =>
      applyFundReviewDecision(current, {
        action: selectedAction,
        rationale: rationale.trim(),
        timestamp: decisionTimestamp,
      })
    );

    if (selectedAction === 'defer') {
      setDeferredReviews((current) => [
        ...current,
        createDeferredReview({
          reviewTitle: 'Best-in-Class Fund Review',
          fundOrRecommendationName:
            review.recommendedAlternativeName ?? review.currentFund.fundName,
          deferralReason: rationale.trim(),
          deferredDate: decisionTimestamp,
          id: `deferred-${decisionTimestamp}-${current.length}`,
        }),
      ]);
    } else if (deferredReviewQueue.openReviews.length > 0) {
      setDeferredReviews((current) => completeOpenDeferredReviews(current));
    }

    setRationale('');
    setSelectedAction(null);
  }

  return (
    <div style={panel}>
      <h3 style={title}>Model Portfolio Fund Monitoring</h3>

      <StatusBox variant="neutral">
        Monitors funds used in model portfolios for ongoing suitability and
        best-in-class review. Mock data only — recommendations require adviser
        sign-off; no automatic fund replacement.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total monitored funds</span>
          <span style={summaryValue}>
            {monitoredFundsResult.summary.totalMonitoredFunds}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Funds on watch</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {monitoredFundsResult.summary.fundsOnWatch}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Review required</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {monitoredFundsResult.summary.reviewRequired}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Replacement candidates</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {monitoredFundsResult.summary.replacementCandidates}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Critical / high priority</span>
          <span style={{ ...summaryValue, color: '#f87171' }}>
            {monitoredFundsResult.summary.criticalPriorityReviews} /{' '}
            {monitoredFundsResult.summary.highPriorityReviews}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>Monitored funds</h4>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Fund</th>
              <th style={th}>Asset class</th>
              <th style={th}>Status</th>
              <th style={th}>Review priority</th>
              <th style={th}>Review reason</th>
              <th style={th}>Last reviewed</th>
              <th style={th}>Next review</th>
              <th style={th}>Suggested replacement</th>
            </tr>
          </thead>
          <tbody>
            {monitoredFundsResult.assessments.map(({ fund, isReviewOverdue }) => (
              <tr key={fund.fundId}>
                <td style={td}>
                  <span style={fundNameCell}>{fund.fundName}</span>
                </td>
                <td style={td}>{fund.assetClass}</td>
                <td style={td}>
                  <span
                    style={badge(
                      statusVariantForMonitoringStatus(fund.status)
                    )}
                  >
                    {formatFundMonitoringStatus(fund.status)}
                  </span>
                </td>
                <td style={td}>
                  <span
                    style={badge(
                      statusVariantForReviewPriority(fund.reviewPriority)
                    )}
                  >
                    {formatFundReviewPriority(fund.reviewPriority)}
                  </span>
                </td>
                <td style={td}>{formatFundReviewReason(fund.reviewReason)}</td>
                <td style={td}>{fund.lastReviewed}</td>
                <td style={td}>
                  <span
                    style={{
                      color: isReviewOverdue ? '#f87171' : undefined,
                    }}
                  >
                    {fund.nextReview}
                    {isReviewOverdue ? ' (overdue)' : ''}
                  </span>
                </td>
                <td style={td}>
                  {fund.replacementCandidate?.fundName ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ ...title, marginTop: '32px' }}>
        Fund Monitoring & Best-in-Class Review
      </h3>

      <StatusBox variant="neutral">
        Mock data preview — fund comparisons use placeholder scores only. No
        automatic replacement; adviser sign-off required before any change.
      </StatusBox>

      <div style={metadataGrid}>
        <div style={metadataItem}>
          <span style={metadataLabel}>Current fund</span>
          <span style={metadataValue}>{review.currentFund.fundName}</span>
          <span style={metadataSub}>
            {review.currentFund.assetClass}
            {review.currentFund.weight != null
              ? ` · ${review.currentFund.weight}% weight`
              : ''}
          </span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Current status</span>
          <span style={metadataValue}>
            {formatFundReviewStatus(lifecycle.currentStatus)}
          </span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Recommendation</span>
          <span
            style={{
              ...metadataValue,
              color:
                review.recommendation === 'review_alternative'
                  ? '#fbbf24'
                  : '#86efac',
            }}
          >
            {formatRecommendation(review.recommendation)}
          </span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Composite score</span>
          <span style={metadataValue}>
            {review.currentCompositeScore.toFixed(1)}
            {review.bestAlternativeCompositeScore != null
              ? ` vs best alt. ${review.bestAlternativeCompositeScore.toFixed(1)}`
              : ''}
          </span>
        </div>
      </div>

      <StatusBox variant={reviewStatusVariant}>{review.reason}</StatusBox>

      {review.recommendedAlternativeName ? (
        <div style={alternativeBox}>
          <h4 style={sectionTitle}>Suggested alternative for review</h4>
          <p style={alternativeName}>{review.recommendedAlternativeName}</p>
          <p style={alternativeNote}>
            This fund scored higher on placeholder composite metrics. Adviser
            review is required before any implementation.
          </p>
        </div>
      ) : null}

      {decisionHistory.sortedDecisions.length > 0 ? (
        <div style={historySection}>
          <h4 style={sectionTitle}>Decision history</h4>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Timestamp</th>
                  <th style={th}>Action</th>
                  <th style={th}>Status</th>
                  <th style={th}>Rationale</th>
                </tr>
              </thead>
              <tbody>
                {decisionHistory.sortedDecisions.map((entry, index) => (
                  <tr key={`${entry.decidedAt}-${entry.action}-${index}`}>
                    <td style={td}>
                      {formatIsoTimestampDisplay(entry.decidedAt)}
                    </td>
                    <td style={td}>{formatFundReviewAction(entry.action)}</td>
                    <td style={td}>
                      {formatFundReviewStatus(entry.status)}
                    </td>
                    <td style={td}>{entry.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <StatusBox variant="neutral">
          No adviser decisions recorded yet — select an action and provide
          rationale below.
        </StatusBox>
      )}

      <div style={historySection}>
        <h4 style={sectionTitle}>Deferred review queue</h4>
        {deferredReviewQueue.sortedReviews.length > 0 ? (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Review</th>
                  <th style={th}>Fund / recommendation</th>
                  <th style={th}>Deferral reason</th>
                  <th style={th}>Deferred date</th>
                  <th style={th}>Review again</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {deferredReviewQueue.sortedReviews.map((entry) => (
                  <tr key={entry.id}>
                    <td style={td}>{entry.reviewTitle}</td>
                    <td style={td}>{entry.fundOrRecommendationName}</td>
                    <td style={td}>{entry.deferralReason}</td>
                    <td style={td}>
                      {formatIsoTimestampDisplay(entry.deferredDate)}
                    </td>
                    <td style={td}>{entry.reviewAgainDate}</td>
                    <td style={td}>
                      <span
                        style={{
                          color:
                            statusVariantForDeferredReview(entry.status) ===
                            'warning'
                              ? '#fbbf24'
                              : statusVariantForDeferredReview(entry.status) ===
                                  'success'
                                ? '#86efac'
                                : '#94a3b8',
                        }}
                      >
                        {formatDeferredReviewStatus(entry.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StatusBox variant="neutral">
            No deferred reviews — choosing Defer with a rationale adds an item
            to this queue for follow-up.
          </StatusBox>
        )}
      </div>

      <h4 style={sectionTitle}>Adviser workflow</h4>

      {actionsDisabled ? (
        <StatusBox variant="success">
          Review lifecycle is {formatFundReviewStatus(lifecycle.currentStatus)} —
          no further actions available in this local preview.
        </StatusBox>
      ) : (
        <>
          <fieldset style={actionFieldset}>
            <legend style={fieldLegend}>Select action</legend>
            <div style={actionChoices}>
              {(
                [
                  'accept',
                  'reject',
                  'defer',
                  'request_more_research',
                ] as FundReviewAction[]
              ).map((action) => (
                <label key={action} style={actionChoiceLabel}>
                  <input
                    type="radio"
                    name="fund-review-action"
                    value={action}
                    checked={selectedAction === action}
                    onChange={() => setSelectedAction(action)}
                  />
                  {formatFundReviewAction(action)}
                </label>
              ))}
            </div>
          </fieldset>

          <label style={fieldLabel}>
            Rationale (required)
            <textarea
              style={textarea}
              placeholder="Document rationale for client file or compliance..."
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
              rows={3}
            />
          </label>

          <div style={actionsRow}>
            <button
              type="button"
              style={recordButton}
              onClick={handleRecordDecision}
              disabled={!selectedAction || !rationale.trim()}
            >
              Record decision
            </button>
          </div>
        </>
      )}

      <p style={footnote}>
        Review generated at {formatIsoTimestampDisplay(review.timestamp)} · last
        updated {formatIsoTimestampDisplay(lifecycle.lastUpdatedAt)} · decisions
        are not persisted yet
      </p>
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
  fontSize: '20px',
  fontWeight: 700,
};

const fundNameCell = {
  fontWeight: 600,
};

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

const metadataGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
  marginBottom: '16px',
};

const metadataItem = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const metadataLabel = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const metadataValue = {
  fontSize: '15px',
  fontWeight: 600,
};

const metadataSub = {
  fontSize: '13px',
  color: '#94a3b8',
};

const sectionTitle = {
  margin: '16px 0 12px 0',
  fontSize: '15px',
  fontWeight: 600,
  color: '#94a3b8',
};

const alternativeBox = {
  padding: '16px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
  marginBottom: '16px',
};

const alternativeName = {
  margin: '0 0 8px 0',
  fontSize: '16px',
  fontWeight: 600,
};

const alternativeNote = {
  margin: 0,
  fontSize: '13px',
  color: '#94a3b8',
};

const historySection = {
  marginBottom: '16px',
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

const actionFieldset = {
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 0 16px 0',
};

const fieldLegend = {
  padding: '0 6px',
  fontSize: '13px',
  color: '#94a3b8',
};

const actionChoices = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '12px 20px',
};

const actionChoiceLabel = {
  display: 'flex',
  alignItems: 'center' as const,
  gap: '8px',
  fontSize: '14px',
  cursor: 'pointer',
};

const fieldLabel = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
  fontSize: '13px',
  color: '#94a3b8',
  marginBottom: '16px',
};

const textarea = {
  padding: '10px 12px',
  background: '#0f2744',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '14px',
  resize: 'vertical' as const,
  fontFamily: 'inherit',
};

const actionsRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '10px',
};

const recordButton = {
  padding: '10px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  border: '1px solid #2d4a6b',
  background: '#12345b',
  color: '#93c5fd',
  cursor: 'pointer',
};

const footnote = {
  marginTop: '16px',
  marginBottom: 0,
  fontSize: '12px',
  color: '#64748b',
};
