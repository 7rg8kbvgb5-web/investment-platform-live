import Link from 'next/link';
import { getDashboardSummary } from '../../lib/engines/dashboard-summary';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export default async function DashboardSummaryGrid() {
  const summary = await getDashboardSummary();

  return (
    <div style={grid}>
      {/* Model Portfolio */}
      <Link href="/portfolios?tab=modelPortfolio" style={cardLink}>
        <div style={card(summary.modelPortfolio && summary.modelPortfolio.weightIssues > 0 ? 'warning' : 'default')}>
          <p style={cardEyebrow}>Portfolios · Model Portfolio</p>
          <h3 style={cardTitle}>The house model</h3>
          {summary.modelPortfolio ? (
            <>
              <p style={cardStat}>
                {summary.modelPortfolio.securitiesCount} securities across{' '}
                {summary.modelPortfolio.assetClassesCovered} asset classes
              </p>
              <p
                style={{
                  ...cardStatHighlight,
                  color: summary.modelPortfolio.weightIssues > 0 ? '#fca5a5' : '#4ade80',
                }}
              >
                {summary.modelPortfolio.weightIssues > 0
                  ? `${summary.modelPortfolio.weightIssues} asset class(es) with weight issues`
                  : 'All asset class weights balanced'}
              </p>
              {(summary.modelPortfolio.tacticalOverweight > 0 || summary.modelPortfolio.tacticalUnderweight > 0) && (
                <p style={cardStatMuted}>
                  {summary.modelPortfolio.tacticalOverweight} OW · {summary.modelPortfolio.tacticalUnderweight} UW
                  tactical calls
                </p>
              )}
            </>
          ) : (
            <p style={cardStatMuted}>No data yet — add securities on Model Portfolio.</p>
          )}
        </div>
      </Link>

      {/* Construction */}
      <Link href="/portfolios?tab=construction" style={cardLink}>
        <div style={card('default')}>
          <p style={cardEyebrow}>Portfolios · Construction</p>
          <h3 style={cardTitle}>Client work in progress</h3>
          {summary.construction && summary.construction.reviewsInProgress > 0 ? (
            <>
              <p style={cardStatHighlight}>
                {summary.construction.reviewsInProgress} client review
                {summary.construction.reviewsInProgress === 1 ? '' : 's'} in progress
              </p>
              {summary.construction.mostRecentClientName && (
                <p style={cardStatMuted}>Most recent: {summary.construction.mostRecentClientName}</p>
              )}
            </>
          ) : (
            <p style={cardStatMuted}>No client reviews saved yet.</p>
          )}
        </div>
      </Link>

      {/* Monitoring */}
      <Link href="/monitoring" style={cardLink}>
        <div
          style={card(
            summary.monitoring && summary.monitoring.criticalCount > 0
              ? 'critical'
              : summary.monitoring && summary.monitoring.highCount > 0
                ? 'warning'
                : 'default',
          )}
        >
          <p style={cardEyebrow}>Monitoring</p>
          <h3 style={cardTitle}>Model portfolio alerts</h3>
          {summary.monitoring && summary.monitoring.totalActive > 0 ? (
            <>
              <p
                style={{
                  ...cardStatHighlight,
                  color: summary.monitoring.criticalCount > 0 ? '#fca5a5' : '#fbbf24',
                }}
              >
                {summary.monitoring.criticalCount} critical · {summary.monitoring.highCount} high ·{' '}
                {summary.monitoring.totalActive} active total
              </p>
              <p style={cardStatMuted}>Last scan: {formatDate(summary.monitoring.lastScanAt)}</p>
            </>
          ) : (
            <p style={cardStatMuted}>No active alerts — run a scan to check.</p>
          )}
        </div>
      </Link>

      {/* Fund Reviews */}
      <Link href="/fund-reviews" style={cardLink}>
        <div
          style={card(
            summary.fundReviews && summary.fundReviews.criticalCount > 0
              ? 'critical'
              : summary.fundReviews && summary.fundReviews.highCount > 0
                ? 'warning'
                : 'default',
          )}
        >
          <p style={cardEyebrow}>Fund Reviews</p>
          <h3 style={cardTitle}>Listed &amp; unlisted funds held</h3>
          {summary.fundReviews && summary.fundReviews.totalActive > 0 ? (
            <>
              <p
                style={{
                  ...cardStatHighlight,
                  color: summary.fundReviews.criticalCount > 0 ? '#fca5a5' : '#fbbf24',
                }}
              >
                {summary.fundReviews.criticalCount} critical · {summary.fundReviews.highCount} high ·{' '}
                {summary.fundReviews.totalActive} active total
              </p>
              <p style={cardStatMuted}>Last scan: {formatDate(summary.fundReviews.lastScanAt)}</p>
            </>
          ) : (
            <p style={cardStatMuted}>No active alerts — run a scan to check.</p>
          )}
        </div>
      </Link>

      {/* Research */}
      <Link href="/research" style={cardLink}>
        <div style={card('default')}>
          <p style={cardEyebrow}>Research</p>
          <h3 style={cardTitle}>Weekly brief &amp; top ideas</h3>
          {summary.research.weeklyBriefDate ? (
            <>
              <p style={cardStatHighlight}>Week of {formatDate(summary.research.weeklyBriefDate)}</p>
              {summary.research.weeklyBriefHeadline && (
                <p style={cardStatMuted}>{summary.research.weeklyBriefHeadline}…</p>
              )}
            </>
          ) : (
            <p style={cardStatMuted}>No weekly brief generated yet.</p>
          )}
          <p style={cardStatMuted}>
            {summary.research.currentTopIdeasCount} current Top Ideas list
            {summary.research.currentTopIdeasCount === 1 ? '' : 's'} on file
          </p>
        </div>
      </Link>

      {/* Investment Committee */}
      <Link href="/investment-committee" style={cardLink}>
        <div style={card('default')}>
          <p style={cardEyebrow}>Investment Committee</p>
          <h3 style={cardTitle}>Deep dive reviews</h3>
          {summary.investmentCommittee && summary.investmentCommittee.totalReviews > 0 ? (
            <>
              <p style={cardStatHighlight}>{summary.investmentCommittee.totalReviews} reviews on file</p>
              {summary.investmentCommittee.mostRecentSubject && (
                <p style={cardStatMuted}>
                  Most recent: {summary.investmentCommittee.mostRecentSubject} (
                  {formatDate(summary.investmentCommittee.mostRecentAt)})
                </p>
              )}
            </>
          ) : (
            <p style={cardStatMuted}>No deep dives run yet.</p>
          )}
        </div>
      </Link>

      {/* Data Analytics */}
      <Link href="/data-analytics" style={cardLink}>
        <div style={card('default')}>
          <p style={cardEyebrow}>Data Analytics</p>
          <h3 style={cardTitle}>Sector health &amp; diversification</h3>
          {summary.dataAnalytics.topSector ? (
            <p style={cardStatHighlight}>
              Top sector: {summary.dataAnalytics.topSector} ({summary.dataAnalytics.topSectorRecommendation})
            </p>
          ) : (
            <p style={cardStatMuted}>No sector health scan yet.</p>
          )}
          {summary.dataAnalytics.correlationRating !== null && (
            <p style={cardStatMuted}>Correlation rating: {summary.dataAnalytics.correlationRating}/100</p>
          )}
        </div>
      </Link>
    </div>
  );
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '16px',
  marginBottom: '10px',
};

const cardLink = {
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
};

type Urgency = 'default' | 'warning' | 'critical';

function card(urgency: Urgency) {
  const borderColor = urgency === 'critical' ? '#ef4444' : urgency === 'warning' ? '#f59e0b' : '#2d4a6b';
  return {
    height: '100%',
    padding: '18px 20px',
    borderRadius: '14px',
    background: '#0b2447',
    border: `1px solid ${borderColor}`,
    borderLeft: `3px solid ${borderColor}`,
    transition: 'border-color 0.15s ease',
    cursor: 'pointer',
  };
}

const cardEyebrow = {
  margin: 0,
  fontSize: '11px',
  fontWeight: 700,
  color: '#8fb7e8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const cardTitle = {
  margin: '4px 0 10px',
  fontSize: '15px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const cardStat = {
  margin: '0 0 4px',
  fontSize: '13px',
  color: '#cbd5e1',
};

const cardStatHighlight = {
  margin: '0 0 4px',
  fontSize: '14px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const cardStatMuted = {
  margin: '2px 0 0',
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.4,
};
