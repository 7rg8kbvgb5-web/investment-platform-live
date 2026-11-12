import Link from 'next/link';
import { getSystemHealth, type HealthIssue } from '../../lib/engines/system-health';

// Platform health, checked on every dashboard load: scans current and
// succeeding, live prices flowing, database migrations run, server settings
// in place. Quiet one-line confirmation when all is well; a clear list of
// what's wrong and what to do when it isn't.

function checkedTime(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
  }).format(new Date(iso));
}

export default async function SystemHealthBanner() {
  const health = await getSystemHealth();
  const time = checkedTime(health.checkedAt);

  if (health.issues.length === 0) {
    return (
      <div style={healthyLine}>
        <span style={dot('#10b981')} />
        <span>
          All systems healthy — scans current, prices live, database up to date.
        </span>
        <span style={checkedText}>Checked {time}</span>
      </div>
    );
  }

  const hasError = health.issues.some((i) => i.level === 'error');
  const accent = hasError ? '#ef4444' : '#f59e0b';

  return (
    <section style={{ ...banner, borderColor: accent }} aria-label="Platform health">
      <div style={bannerHeader}>
        <span style={dot(accent)} />
        <span style={bannerTitle}>
          {health.issues.length} platform issue{health.issues.length === 1 ? '' : 's'} need
          {health.issues.length === 1 ? 's' : ''} attention
        </span>
        <span style={checkedText}>Checked {time}</span>
      </div>
      <ul style={list}>
        {health.issues.map((issue, i) => (
          <IssueRow key={i} issue={issue} />
        ))}
      </ul>
    </section>
  );
}

function IssueRow({ issue }: { issue: HealthIssue }) {
  const colour = issue.level === 'error' ? '#fca5a5' : '#fcd34d';
  return (
    <li style={row}>
      <span style={{ ...areaTag, color: colour, borderColor: colour }}>{issue.area}</span>
      <div style={rowText}>
        <span style={message}>{issue.message}</span>
        <span style={action}>
          {issue.action}
          {issue.href ? (
            <>
              {' '}
              <Link href={issue.href} style={link}>
                Open →
              </Link>
            </>
          ) : null}
        </span>
      </div>
    </li>
  );
}

const dot = (colour: string) => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: colour,
  flexShrink: 0,
});

const healthyLine = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '18px',
  padding: '8px 14px',
  borderRadius: '10px',
  background: '#0b2342',
  border: '1px solid #1f5f45',
  color: '#a7f3d0',
  fontSize: '13px',
};

const checkedText = {
  marginLeft: 'auto',
  color: '#64748b',
  fontSize: '12px',
  whiteSpace: 'nowrap' as const,
};

const banner = {
  marginBottom: '20px',
  padding: '14px 18px',
  borderRadius: '14px',
  background: '#0b2342',
  border: '1px solid',
};

const bannerHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const bannerTitle = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const list = {
  listStyle: 'none',
  margin: '12px 0 0',
  padding: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '10px',
};

const row = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
};

const areaTag = {
  flexShrink: 0,
  minWidth: '72px',
  textAlign: 'center' as const,
  padding: '2px 8px',
  borderRadius: '6px',
  border: '1px solid',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const rowText = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
  minWidth: 0,
};

const message = {
  fontSize: '13px',
  color: '#e2e8f0',
  lineHeight: 1.45,
};

const action = {
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.45,
};

const link = {
  color: '#38bdf8',
  fontWeight: 600,
  textDecoration: 'none',
};
