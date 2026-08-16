import Link from 'next/link';
import { getDashboardSummary } from '../../lib/engines/dashboard-summary';
import { DashboardPriorityBanner } from './DashboardPriorityBanner';
import { DashboardNewsFeed } from './DashboardNewsFeed';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const ICONS = {
  portfolio: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 14V6l7-3 7 3v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 3v11M3 14l7 3 7-3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  monitoring: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  research: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 4h12v12H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 8h6M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  fundReviews: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 4h10v12H5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 8h4M8 11h4M8 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  committee: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 16c.8-2.2 2.4-3.5 3.5-3.5S9.7 13.8 10.5 16M10.5 16c.8-2.2 2.4-3.5 3.5-3.5s2.7 1.3 3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 16V4M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 13l3-4 3 2 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  construction: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 10l7-7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9v7h10V9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
};

export default async function DashboardSummaryGrid() {
  const summary = await getDashboardSummary();

  return (
    <>
      <DashboardPriorityBanner summary={summary} />
      <DashboardNewsFeed items={summary.newsFeed} />

      <div style={grid}>
        {/* Model Portfolio */}
        <Link href="/portfolios?tab=modelPortfolio" style={cardLink}>
          <div style={card(summary.modelPortfolio && summary.modelPortfolio.weightIssues > 0 ? 'warning' : 'default')}>
            <div style={cardIcon}>{ICONS.portfolio}</div>
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
                {summary.modelPortfolio.averageForwardYield !== null && (
                  <p style={cardStatMuted}>Avg. forward yield: {summary.modelPortfolio.averageForwardYield}%</p>
                )}
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
            <div style={cardIcon}>{ICONS.construction}</div>
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
            <div style={cardIcon}>{ICONS.monitoring}</div>
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
                {summary.monitoring.topAlerts.length > 0 && (
                  <ul style={cardAlertList}>
                    {summary.monitoring.topAlerts.map((alert) => (
                      <li key={alert.id} style={cardAlertItem}>
                        {alert.title}
                      </li>
                    ))}
                  </ul>
                )}
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
            <div style={cardIcon}>{ICONS.fundReviews}</div>
            <p style={cardEyebrow}>Fund Reviews</p>
            <h3 style={cardTitle}>Listed &amp; unlisted funds held</h3>
            {summary.fundReviews ? (
              <>
                {summary.fundReviews.totalActive > 0 ? (
                  <p
                    style={{
                      ...cardStatHighlight,
                      color: summary.fundReviews.criticalCount > 0 ? '#fca5a5' : '#fbbf24',
                    }}
                  >
                    {summary.fundReviews.criticalCount} critical · {summary.fundReviews.highCount} high ·{' '}
                    {summary.fundReviews.totalActive} active total
                  </p>
                ) : (
                  <p style={cardStatHighlight}>No active alerts</p>
                )}
                {summary.fundReviews.topAlerts.length > 0 && (
                  <ul style={cardAlertList}>
                    {summary.fundReviews.topAlerts.map((alert) => (
                      <li key={alert.id} style={cardAlertItem}>
                        {alert.title}
                      </li>
                    ))}
                  </ul>
                )}
                <p style={cardStatMuted}>
                  {summary.fundReviews.listedFundsHeld} listed · {summary.fundReviews.unlistedFundsHeld} unlisted
                  fund{summary.fundReviews.listedFundsHeld + summary.fundReviews.unlistedFundsHeld === 1 ? '' : 's'}{' '}
                  held
                </p>
                {summary.fundReviews.lastScanAt && (
                  <p style={cardStatMuted}>Last scan: {formatDate(summary.fundReviews.lastScanAt)}</p>
                )}
              </>
            ) : (
              <p style={cardStatMuted}>No active alerts — run a scan to check.</p>
            )}
          </div>
        </Link>

        {/* Research */}
        <Link href="/research" style={cardLink}>
          <div style={card('default')}>
            <div style={cardIcon}>{ICONS.research}</div>
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
            <div style={cardIcon}>{ICONS.committee}</div>
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
                {summary.investmentCommittee.mostRecentKeyRisksCount > 0 && (
                  <p style={cardStatMuted}>
                    {summary.investmentCommittee.mostRecentKeyRisksCount} key risk
                    {summary.investmentCommittee.mostRecentKeyRisksCount === 1 ? '' : 's'} flagged in that review
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
            <div style={cardIcon}>{ICONS.analytics}</div>
            <p style={cardEyebrow}>Data Analytics</p>
            <h3 style={cardTitle}>Sector health &amp; diversification</h3>
            {summary.dataAnalytics.topSector ? (
              <p style={cardStatHighlight}>
                Best: {summary.dataAnalytics.topSector} ({summary.dataAnalytics.topSectorRecommendation})
              </p>
            ) : (
              <p style={cardStatMuted}>No sector health scan yet.</p>
            )}
            {summary.dataAnalytics.worstSector && (
              <p style={cardStatMuted}>
                Worst: {summary.dataAnalytics.worstSector} ({summary.dataAnalytics.worstSectorRecommendation})
              </p>
            )}
            {summary.dataAnalytics.correlationRating !== null && (
              <p style={cardStatMuted}>Correlation rating: {summary.dataAnalytics.correlationRating}/100</p>
            )}
          </div>
        </Link>
      </div>
    </>
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

const cardIcon = {
  width: '28px',
  height: '28px',
  color: '#60a5fa',
  marginBottom: '8px',
};

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

const cardAlertList = {
  margin: '4px 0 6px',
  padding: '0 0 0 16px',
  listStyle: 'disc' as const,
};

const cardAlertItem = {
  fontSize: '12px',
  color: '#cbd5e1',
  lineHeight: 1.5,
  marginBottom: '2px',
};
