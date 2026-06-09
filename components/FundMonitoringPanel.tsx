'use client';

import { useMemo, useState } from 'react';
import type {
  FundAlternative,
  FundHolding,
  FundReviewAction,
  FundReviewDecision,
} from '../domain/types/fund-monitoring';
import { reviewFundMonitoring } from '../lib/engines/fund-monitoring-review';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
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

function formatReviewStatus(
  requiresAdviserReview: boolean,
  decision: FundReviewDecision | null
): string {
  if (decision) {
    switch (decision.action) {
      case 'accept':
        return 'Accepted — pending implementation (local preview)';
      case 'reject':
        return 'Rejected — retain current fund (local preview)';
      case 'defer':
        return 'Deferred — review postponed (local preview)';
      case 'request_more_research':
        return 'More research requested (local preview)';
    }
  }

  return requiresAdviserReview
    ? 'Pending adviser review'
    : 'No review required';
}

export default function FundMonitoringPanel() {
  const [rationale, setRationale] = useState('');
  const [decision, setDecision] = useState<FundReviewDecision | null>(null);

  const review = useMemo(
    () =>
      reviewFundMonitoring({
        currentFund: MOCK_CURRENT_FUND,
        alternatives: MOCK_ALTERNATIVES,
      }),
    []
  );

  const reviewStatusVariant = decision
    ? decision.action === 'accept'
      ? 'success'
      : decision.action === 'reject'
        ? 'neutral'
        : 'warning'
    : review.requiresAdviserReview
      ? 'warning'
      : 'success';

  function handleAction(action: FundReviewAction) {
    if (!rationale.trim()) {
      return;
    }

    setDecision({
      action,
      rationale: rationale.trim(),
      decidedAt: new Date().toISOString(),
      decidedBy: null,
    });
  }

  return (
    <div style={panel}>
      <h3 style={title}>Fund Monitoring & Best-in-Class Review</h3>

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
          <span style={metadataLabel}>Review status</span>
          <span style={metadataValue}>
            {formatReviewStatus(review.requiresAdviserReview, decision)}
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

      {decision ? (
        <StatusBox variant="neutral">
          Decision recorded locally: <strong>{decision.action}</strong> —{' '}
          {decision.rationale} ({formatIsoTimestampDisplay(decision.decidedAt)})
        </StatusBox>
      ) : null}

      <h4 style={sectionTitle}>Adviser workflow</h4>
      <label style={fieldLabel}>
        Rationale (required for all actions)
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
          style={actionButtonAccept}
          onClick={() => handleAction('accept')}
          disabled={!rationale.trim()}
        >
          Accept
        </button>
        <button
          type="button"
          style={actionButtonReject}
          onClick={() => handleAction('reject')}
          disabled={!rationale.trim()}
        >
          Reject
        </button>
        <button
          type="button"
          style={actionButtonDefer}
          onClick={() => handleAction('defer')}
          disabled={!rationale.trim()}
        >
          Defer
        </button>
        <button
          type="button"
          style={actionButtonResearch}
          onClick={() => handleAction('request_more_research')}
          disabled={!rationale.trim()}
        >
          Request More Research
        </button>
      </div>

      <p style={footnote}>
        Last reviewed at {formatIsoTimestampDisplay(review.timestamp)} · decisions are
        not persisted yet
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

const actionButtonBase = {
  padding: '10px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  border: '1px solid',
  cursor: 'pointer',
};

const actionButtonAccept = {
  ...actionButtonBase,
  background: '#0f3d2e',
  borderColor: '#10b981',
  color: '#86efac',
};

const actionButtonReject = {
  ...actionButtonBase,
  background: '#4a1520',
  borderColor: '#ef4444',
  color: '#fca5a5',
};

const actionButtonDefer = {
  ...actionButtonBase,
  background: '#5b2b12',
  borderColor: '#d97706',
  color: '#fcd34d',
};

const actionButtonResearch = {
  ...actionButtonBase,
  background: '#12345b',
  borderColor: '#2d4a6b',
  color: '#93c5fd',
};

const footnote = {
  marginTop: '16px',
  marginBottom: 0,
  fontSize: '12px',
  color: '#64748b',
};
