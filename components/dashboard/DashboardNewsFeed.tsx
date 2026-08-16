import Link from 'next/link';
import type { AlertHeadline } from '../../lib/engines/dashboard-summary';

// A real, scannable digest of what's actually going on across
// Monitoring and Fund Reviews - the most severe and most recent active
// alerts, with their actual titles, not just counts.

function severityColor(severity: AlertHeadline['severity']) {
  return {
    critical: { bg: '#4a1520', border: '#ef4444', text: '#fca5a5' },
    high: { bg: '#3f2b12', border: '#f59e0b', text: '#fbbf24' },
    medium: { bg: '#12345b', border: '#2d4a6b', text: '#93c5fd' },
    low: { bg: '#12203a', border: '#1e3a5f', text: '#94a3b8' },
  }[severity];
}

export function DashboardNewsFeed({ items }: { items: AlertHeadline[] }) {
  return (
    <div style={box}>
      <p style={eyebrow}>Monitoring &amp; Fund Reviews</p>
      <h3 style={title}>What&apos;s happening right now</h3>

      {items.length === 0 ? (
        <p style={emptyText}>
          No active alerts yet — run a scan on Monitoring or Fund Reviews to populate this.
        </p>
      ) : (
        <ul style={list}>
          {items.map((item) => {
            const c = severityColor(item.severity);
            return (
              <li key={item.id} style={row}>
                <Link href={item.href} style={rowLink}>
                  <span
                    style={{
                      ...severityTag,
                      background: c.bg,
                      border: `1px solid ${c.border}`,
                      color: c.text,
                    }}
                  >
                    {item.severity}
                  </span>
                  <span style={rowTitle}>{item.title}</span>
                  <span style={rowSource}>
                    {item.source} · {item.category}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const box = {
  padding: '18px 20px',
  borderRadius: '14px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  marginBottom: '18px',
};

const eyebrow = {
  margin: 0,
  fontSize: '11px',
  fontWeight: 700,
  color: '#8fb7e8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const title = {
  margin: '4px 0 12px',
  fontSize: '15px',
  fontWeight: 700,
  color: '#e2e8f0',
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
  borderRadius: '8px',
};

const rowLink = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 10px',
  borderRadius: '8px',
  background: '#0b2342',
  border: '1px solid #1e3a5f',
  textDecoration: 'none',
  color: 'inherit',
};

const severityTag = {
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  whiteSpace: 'nowrap' as const,
};

const rowTitle = {
  fontSize: '13px',
  color: '#e2e8f0',
  flex: 1,
};

const rowSource = {
  fontSize: '11px',
  color: '#64748b',
  whiteSpace: 'nowrap' as const,
};

const emptyText = {
  margin: 0,
  fontSize: '12px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
};
