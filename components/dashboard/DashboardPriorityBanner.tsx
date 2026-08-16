import Link from 'next/link';
import type { DashboardSummary } from '../../lib/engines/dashboard-summary';

// A single "start here" line above the card grid - with seven cards
// it isn't obvious which one actually needs attention first without
// scanning every border colour. This distils that down to one place.

type PriorityItem = {
  label: string;
  href: string;
  message: string;
  level: 'critical' | 'warning';
};

export function DashboardPriorityBanner({ summary }: { summary: DashboardSummary }) {
  const items: PriorityItem[] = [];

  if (summary.monitoring) {
    if (summary.monitoring.criticalCount > 0) {
      items.push({
        label: 'Monitoring',
        href: '/monitoring',
        message: `${summary.monitoring.criticalCount} critical`,
        level: 'critical',
      });
    } else if (summary.monitoring.highCount > 0) {
      items.push({
        label: 'Monitoring',
        href: '/monitoring',
        message: `${summary.monitoring.highCount} high`,
        level: 'warning',
      });
    }
  }

  if (summary.fundReviews) {
    if (summary.fundReviews.criticalCount > 0) {
      items.push({
        label: 'Fund Reviews',
        href: '/fund-reviews',
        message: `${summary.fundReviews.criticalCount} critical`,
        level: 'critical',
      });
    } else if (summary.fundReviews.highCount > 0) {
      items.push({
        label: 'Fund Reviews',
        href: '/fund-reviews',
        message: `${summary.fundReviews.highCount} high`,
        level: 'warning',
      });
    }
  }

  if (summary.modelPortfolio && summary.modelPortfolio.weightIssues > 0) {
    items.push({
      label: 'Model Portfolio',
      href: '/portfolios?tab=modelPortfolio',
      message: `${summary.modelPortfolio.weightIssues} weight issue${summary.modelPortfolio.weightIssues === 1 ? '' : 's'}`,
      level: 'warning',
    });
  }

  const hasCritical = items.some((i) => i.level === 'critical');
  const hasAny = items.length > 0;

  return (
    <div style={banner(hasCritical ? 'critical' : hasAny ? 'warning' : 'clear')}>
      <span style={bannerLabel}>
        {hasCritical ? 'Needs attention' : hasAny ? 'Worth a look' : 'All clear'}
      </span>
      {hasAny ? (
        <div style={pillRow}>
          {items.map((item) => (
            <Link key={item.label} href={item.href} style={pill(item.level)}>
              {item.label}: {item.message}
            </Link>
          ))}
        </div>
      ) : (
        <span style={bannerClearText}>No active critical or high alerts, and asset class weights are balanced.</span>
      )}
    </div>
  );
}

function banner(level: 'critical' | 'warning' | 'clear') {
  const colors = {
    critical: { bg: '#4a1520', border: '#ef4444' },
    warning: { bg: '#3f2b12', border: '#f59e0b' },
    clear: { bg: '#0f3d2e', border: '#10b981' },
  }[level];
  return {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '14px',
    padding: '12px 18px',
    borderRadius: '12px',
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    marginBottom: '18px',
  };
}

const bannerLabel = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#e2e8f0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap' as const,
};

const bannerClearText = {
  fontSize: '13px',
  color: '#94a3b8',
};

const pillRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '8px',
};

function pill(level: 'critical' | 'warning') {
  const colors = {
    critical: { bg: '#0b2447', border: '#ef4444', text: '#fca5a5' },
    warning: { bg: '#0b2447', border: '#f59e0b', text: '#fbbf24' },
  }[level];
  return {
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    textDecoration: 'none',
  };
}
