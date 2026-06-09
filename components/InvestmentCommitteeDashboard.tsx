'use client';

import { useMemo } from 'react';
import {
  analyzeInvestmentCommitteeDashboard,
  getMockDeferredReviewsForIC,
  getMockPortfolioGovernanceSummary,
  type InvestmentCommitteeActionItem,
  type InvestmentCommitteePriorityItem,
} from '../lib/engines/investment-committee-dashboard';
import {
  getMockFundReviewDashboardItems,
} from '../lib/engines/fund-review-dashboard';
import {
  getMockGovernanceAuditEntries,
} from '../lib/engines/governance-audit-trail';
import {
  getMockHouseViewRecommendations,
} from '../lib/engines/house-view-engine';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

function formatReviewDate(date: string): string {
  return formatIsoTimestampDisplay(`${date}T00:00:00.000Z`);
}

function PriorityList({
  items,
  emptyMessage,
  showConfidence = true,
}: {
  items: InvestmentCommitteePriorityItem[];
  emptyMessage: string;
  showConfidence?: boolean;
}) {
  if (items.length === 0) {
    return <p style={emptyText}>{emptyMessage}</p>;
  }

  return (
    <ul style={priorityList}>
      {items.map((item) => (
        <li key={item.id} style={priorityItem}>
          <div style={priorityHeader}>
            <span style={priorityTitle}>{item.title}</span>
            {showConfidence && item.confidenceScore > 0 ? (
              <span style={confidenceBadge}>{item.confidenceScore}/100</span>
            ) : null}
          </div>
          <p style={prioritySubtitle}>{item.subtitle}</p>
          <span style={priorityMeta}>Review by {formatReviewDate(item.reviewDate)}</span>
        </li>
      ))}
    </ul>
  );
}

function ActionList({
  items,
  emptyMessage,
}: {
  items: InvestmentCommitteeActionItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p style={emptyText}>{emptyMessage}</p>;
  }

  return (
    <ul style={priorityList}>
      {items.map((item) => (
        <li key={item.id} style={priorityItem}>
          <span style={priorityTitle}>{item.title}</span>
          <p style={prioritySubtitle}>{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export default function InvestmentCommitteeDashboard() {
  const dashboard = useMemo(() => {
    return analyzeInvestmentCommitteeDashboard({
      fundReviews: getMockFundReviewDashboardItems(),
      houseViews: getMockHouseViewRecommendations(),
      auditEntries: getMockGovernanceAuditEntries(),
      deferredReviews: getMockDeferredReviewsForIC(),
      portfolioGovernance: getMockPortfolioGovernanceSummary(),
    });
  }, []);

  return (
    <div style={panel}>
      <h3 style={title}>Investment Committee Dashboard</h3>

      <StatusBox variant="neutral">
        Executive summary of house views, fund reviews, governance audit trail,
        deferred reviews, research requests, and portfolio governance workflows.
        Mock data only — no live feeds or persistence.
      </StatusBox>

      <p style={generatedAt}>
        As at {formatIsoTimestampDisplay(dashboard.generatedAt)}
      </p>

      <h4 style={sectionTitle}>Summary metrics</h4>
      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Open reviews</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {dashboard.summary.openReviews}
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
        <div style={summaryItem}>
          <span style={summaryLabel}>Accepted recommendations</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {dashboard.summary.acceptedRecommendations}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Rejected recommendations</span>
          <span style={summaryValue}>
            {dashboard.summary.rejectedRecommendations}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Active house views</span>
          <span style={summaryValue}>{dashboard.summary.activeHouseViews}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Governance events (30 days)</span>
          <span style={summaryValue}>
            {dashboard.summary.governanceEventsLast30Days}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>IC priorities</h4>
      <div style={sectionGrid}>
        <div style={sectionCard}>
          <h5 style={cardTitle}>Highest confidence recommendations</h5>
          <PriorityList
            items={dashboard.priorities.highestConfidenceRecommendations}
            emptyMessage="No open recommendations with confidence scores."
          />
        </div>
        <div style={sectionCard}>
          <h5 style={cardTitle}>Overdue reviews</h5>
          <PriorityList
            items={dashboard.priorities.overdueReviews}
            emptyMessage="No overdue fund or deferred reviews."
            showConfidence={false}
          />
        </div>
        <div style={sectionCard}>
          <h5 style={cardTitle}>Outstanding research requests</h5>
          <PriorityList
            items={dashboard.priorities.outstandingResearchRequests}
            emptyMessage="No outstanding research requests."
          />
        </div>
        <div style={sectionCard}>
          <h5 style={cardTitle}>House views approaching review date</h5>
          <PriorityList
            items={dashboard.priorities.houseViewsApproachingReview}
            emptyMessage="No house views due for review within the next 90 days."
          />
        </div>
      </div>

      <h4 style={sectionTitle}>Governance health</h4>
      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Open items</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {dashboard.governanceHealth.openItems}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Deferred items</span>
          <span style={summaryValue}>
            {dashboard.governanceHealth.deferredItems}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Expiring tactical overlays</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {dashboard.governanceHealth.expiringTacticalOverlays}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Guardrail warnings</span>
          <span style={summaryValue}>
            {dashboard.governanceHealth.guardrailWarnings}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>Committee actions</h4>
      <div style={sectionGrid}>
        <div style={sectionCard}>
          <h5 style={cardTitle}>Reviews requiring action</h5>
          <ActionList
            items={dashboard.committeeActions.reviewsRequiringAction}
            emptyMessage="No fund reviews or portfolio workflows requiring action."
          />
        </div>
        <div style={sectionCard}>
          <h5 style={cardTitle}>Research requests awaiting completion</h5>
          <ActionList
            items={dashboard.committeeActions.researchRequestsAwaitingCompletion}
            emptyMessage="No research requests awaiting completion."
          />
        </div>
        <div style={sectionCard}>
          <h5 style={cardTitle}>House views requiring review</h5>
          <ActionList
            items={dashboard.committeeActions.houseViewsRequiringReview}
            emptyMessage="No house views requiring committee review."
          />
        </div>
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

const generatedAt = {
  margin: '12px 0 0 0',
  fontSize: '13px',
  color: '#94a3b8',
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

const sectionGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '12px',
  marginBottom: '24px',
};

const sectionCard = {
  padding: '14px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const cardTitle = {
  margin: '0 0 12px 0',
  fontSize: '14px',
  fontWeight: 600,
  color: '#e2e8f0',
};

const priorityList = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '10px',
};

const priorityItem = {
  padding: '10px',
  background: '#0b2342',
  borderRadius: '6px',
  border: '1px solid #1e3a5f',
};

const priorityHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '8px',
};

const priorityTitle = {
  fontWeight: 600,
  fontSize: '14px',
};

const prioritySubtitle = {
  margin: '6px 0 4px 0',
  fontSize: '13px',
  color: '#cbd5e1',
  lineHeight: 1.45,
};

const priorityMeta = {
  fontSize: '12px',
  color: '#94a3b8',
};

const confidenceBadge = {
  flexShrink: 0,
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: '#0f3d2e',
  border: '1px solid #10b981',
  color: '#86efac',
};

const emptyText = {
  margin: 0,
  fontSize: '13px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
};
