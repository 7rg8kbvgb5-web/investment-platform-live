'use client';

import { useMemo } from 'react';
import type { HouseViewRecommendation } from '../domain/types/house-view';
import {
  analyzeHouseViews,
  categoryStatusVariant,
  formatHouseViewArea,
  formatHouseViewCategory,
  getMockHouseViewRecommendations,
} from '../lib/engines/house-view-engine';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

function formatReviewDate(date: string): string {
  return formatIsoTimestampDisplay(`${date}T00:00:00.000Z`);
}

function HouseViewCard({ recommendation }: { recommendation: HouseViewRecommendation }) {
  return (
    <article style={viewCard}>
      <div style={viewHeader}>
        <div>
          <h4 style={viewTitle}>{recommendation.title}</h4>
          <p style={viewMeta}>
            {formatHouseViewArea(recommendation.area)} · Effective{' '}
            {formatReviewDate(recommendation.effectiveDate)}
          </p>
        </div>
        <span style={categoryBadge(recommendation.category)}>
          {formatHouseViewCategory(recommendation.category)}
        </span>
      </div>

      <p style={viewSummary}>{recommendation.summary}</p>

      <div style={detailGrid}>
        <div style={detailItem}>
          <span style={detailLabel}>Confidence score</span>
          <span style={detailValue}>{recommendation.confidenceScore}/100</span>
        </div>
        <div style={detailItem}>
          <span style={detailLabel}>Review date</span>
          <span style={detailValue}>
            {formatReviewDate(recommendation.reviewDate)}
          </span>
        </div>
      </div>

      <StatusBox variant={categoryStatusVariant(recommendation.category)}>
        <strong style={rationaleHeading}>Supporting rationale</strong>
        <p style={rationaleText}>{recommendation.supportingRationale}</p>
      </StatusBox>
    </article>
  );
}

export default function HouseViewPanel() {
  const analysis = useMemo(() => {
    const recommendations = getMockHouseViewRecommendations();
    return analyzeHouseViews({ recommendations });
  }, []);

  return (
    <div style={panel}>
      <h3 style={title}>House View Recommendations</h3>

      <StatusBox variant="neutral">
        Mock investment committee views — local preview only. House views inform
        tactical positioning, preferred funds, and committee decisions; they do
        not trigger automatic portfolio changes.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Active views</span>
          <span style={summaryValue}>
            {analysis.sortedRecommendations.length}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Average confidence</span>
          <span style={summaryValue}>{analysis.averageConfidenceScore}/100</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Positive</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {analysis.countsByCategory.Positive}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Neutral</span>
          <span style={summaryValue}>{analysis.countsByCategory.Neutral}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Negative</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {analysis.countsByCategory.Negative}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>Current house views</h4>

      <div style={viewList}>
        {analysis.sortedRecommendations.map((recommendation) => (
          <HouseViewCard key={recommendation.id} recommendation={recommendation} />
        ))}
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
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

const viewList = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
};

const viewCard = {
  padding: '16px',
  background: '#0f2744',
  borderRadius: '12px',
  border: '1px solid #2d4a6b',
};

const viewHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '12px',
  marginBottom: '12px',
};

const viewTitle = {
  margin: '0 0 4px 0',
  fontSize: '16px',
  fontWeight: 600,
};

const viewMeta = {
  margin: 0,
  fontSize: '13px',
  color: '#94a3b8',
};

function categoryBadge(category: HouseViewRecommendation['category']) {
  const colors = {
    Positive: { background: '#0f3d2e', border: '#10b981', color: '#86efac' },
    Neutral: { background: '#12345b', border: '#2d4a6b', color: '#93c5fd' },
    Negative: { background: '#5b2b12', border: '#d97706', color: '#fbbf24' },
  };

  const palette = colors[category];

  return {
    flexShrink: 0,
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    background: palette.background,
    border: `1px solid ${palette.border}`,
    color: palette.color,
  };
}

const viewSummary = {
  margin: '0 0 12px 0',
  fontSize: '14px',
  lineHeight: 1.5,
};

const detailGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '12px',
  marginBottom: '12px',
};

const detailItem = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
};

const detailLabel = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const detailValue = {
  fontSize: '15px',
  fontWeight: 600,
};

const rationaleHeading = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '13px',
};

const rationaleText = {
  margin: 0,
  fontSize: '14px',
  lineHeight: 1.5,
};
