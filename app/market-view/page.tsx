import Link from 'next/link';
import PageContent from '../../components/PageContent';
import Panel from '../../components/ui/Panel';
import RefreshTacticalButton from '../../components/market-view/RefreshTacticalButton';
import { ASSET_CLASSES } from '../../lib/engines/model-portfolio-core';
import { getLatestTacticalAssetClassView, type TacticalStance } from '../../lib/engines/tactical-asset-view';
import { getLatestWeeklyBrief } from '../../lib/engines/weekly-brief';
import { getLatestMonitoringAlerts, type MonitoringAlert } from '../../lib/engines/investment-monitoring';
import { getLatestSectorHealthScores } from '../../lib/engines/sector-health-live';
import { listCurrentTopIdeas } from '../../lib/engines/research-library';

export const dynamic = 'force-dynamic';

// The house's current read on markets, on one page: the tactical call on each
// asset class, the macro backdrop from the weekly brief, the macro risks the
// Monitoring scan is watching, the sector view, and each research house's
// current Top Ideas. Everything here comes from data the platform already
// holds - this page runs no AI of its own unless the adviser refreshes the
// tactical view.

async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

function asAt(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  });
}

const STANCE_LABEL: Record<TacticalStance, string> = { OW: 'Overweight', N: 'Neutral', UW: 'Underweight' };
const STANCE_COLOUR: Record<TacticalStance, { fg: string; bg: string; border: string }> = {
  OW: { fg: '#86efac', bg: '#0f2a22', border: '#1f5f45' },
  N: { fg: '#cbd5e1', bg: '#13233a', border: '#2d4a6b' },
  UW: { fg: '#fca5a5', bg: '#2a1215', border: '#7f1d1d' },
};

const SEVERITY_RANK: Record<MonitoringAlert['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_COLOUR: Record<MonitoringAlert['severity'], string> = {
  critical: '#fca5a5',
  high: '#fdba74',
  medium: '#fcd34d',
  low: '#94a3b8',
};

export default async function MarketViewPage() {
  const [tactical, brief, alerts, sectors, topIdeas] = await Promise.all([
    safe(getLatestTacticalAssetClassView, null),
    safe(getLatestWeeklyBrief, null),
    safe(getLatestMonitoringAlerts, [] as MonitoringAlert[]),
    safe(getLatestSectorHealthScores, []),
    safe(listCurrentTopIdeas, []),
  ]);

  // Calls in the platform's canonical asset-class order.
  const calls = tactical
    ? ASSET_CLASSES.map((ac) => tactical.calls.find((c) => c.assetClass === ac.name)).filter(
        (c): c is NonNullable<typeof c> => !!c,
      )
    : [];
  const tilt = {
    OW: calls.filter((c) => c.stance === 'OW').map((c) => c.assetClass),
    UW: calls.filter((c) => c.stance === 'UW').map((c) => c.assetClass),
  };

  const macroRisks = alerts
    .filter((a) => a.category === 'macro' && a.status !== 'dismissed')
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, 6);

  return (
    <PageContent
      title="Market View"
      description="Our current read on markets in one place: where each asset class stands tactically, the macro backdrop, the risks being watched, the sector view and the research houses' Top Ideas."
    >
      <div style={stack}>
      {/* At-a-glance summary */}
      <div style={summaryStrip}>
        <SummaryItem label="Leaning into" value={tilt.OW.length > 0 ? tilt.OW.join(', ') : 'Nothing - no overweight calls'} tone="good" />
        <SummaryItem label="Leaning away from" value={tilt.UW.length > 0 ? tilt.UW.join(', ') : 'Nothing - no underweight calls'} tone="bad" />
        <SummaryItem
          label="Macro risks being watched"
          value={macroRisks.length > 0 ? `${macroRisks.length} active` : 'None flagged'}
          tone={macroRisks.some((r) => r.severity === 'critical' || r.severity === 'high') ? 'bad' : 'neutral'}
        />
      </div>

      <Panel
        eyebrow={tactical ? `As at ${asAt(tactical.generatedAt)}` : 'Not yet run'}
        title="Tactical asset class view"
        actions={<RefreshTacticalButton />}
      >
        {calls.length === 0 ? (
          <p style={empty}>No tactical view yet. Click Refresh view to read current market conditions.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Asset class</th>
                <th style={th}>Stance</th>
                <th style={th}>Why</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => {
                const c = STANCE_COLOUR[call.stance] ?? STANCE_COLOUR.N;
                return (
                  <tr key={call.assetClass}>
                    <td style={tdName}>{call.assetClass}</td>
                    <td style={td}>
                      <span style={{ ...stanceChip, color: c.fg, background: c.bg, borderColor: c.border }}>
                        {STANCE_LABEL[call.stance] ?? call.stance}
                      </span>
                    </td>
                    <td style={tdText}>{call.rationale}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p style={footnote}>
          A market-level read of current conditions, compiled by AI from public sources. It is not a change to
          the model portfolio - any change to strategic weights goes through the Investment Committee.
        </p>
      </Panel>

      <div style={twoCol}>
        <Panel eyebrow={brief ? `Week of ${asAt(brief.weekOf)}` : 'Not yet run'} title="Macro backdrop">
          {brief?.macroSummary ? (
            <p style={prose}>{brief.macroSummary}</p>
          ) : (
            <p style={empty}>
              No weekly brief yet. It runs every Monday morning, or now from the{' '}
              <Link href="/research" style={link}>Research</Link> page.
            </p>
          )}
        </Panel>

        <Panel
          eyebrow={alerts[0] ? `Monitoring scan ${asAt(alerts[0].generatedAt)}` : 'Not yet run'}
          title="Macro risks being watched"
        >
          {macroRisks.length === 0 ? (
            <p style={empty}>No macro risks flagged in the latest Monitoring scan.</p>
          ) : (
            <ul style={riskList}>
              {macroRisks.map((r) => (
                <li key={r.id} style={riskItem}>
                  <span style={{ ...severityTag, color: SEVERITY_COLOUR[r.severity], borderColor: SEVERITY_COLOUR[r.severity] }}>
                    {r.severity}
                  </span>
                  <div>
                    <p style={riskTitle}>{r.title}</p>
                    <p style={riskSummary}>{r.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p style={footnote}>
            <Link href="/monitoring" style={link}>All alerts on Monitoring →</Link>
          </p>
        </Panel>
      </div>

      <Panel
        eyebrow={sectors[0] ? `As at ${asAt(sectors[0].generatedAt)} · sectors held in the model` : 'Not yet run'}
        title="Sector view"
      >
        {sectors.length === 0 ? (
          <p style={empty}>
            No sector scores yet. The Sector Health scan runs every Friday, or now from{' '}
            <Link href="/data-analytics" style={link}>Data Analytics</Link>.
          </p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Sector</th>
                <th style={th}>Score</th>
                <th style={th}>Call</th>
                <th style={th}>Why</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((s) => {
                const tone = s.recommendation.includes('Overweight')
                  ? STANCE_COLOUR.OW
                  : s.recommendation.includes('Underweight')
                    ? STANCE_COLOUR.UW
                    : STANCE_COLOUR.N;
                return (
                  <tr key={s.id}>
                    <td style={tdName}>{s.sector}</td>
                    <td style={td}>{Math.round(s.totalScore)}</td>
                    <td style={td}>
                      <span style={{ ...stanceChip, color: tone.fg, background: tone.bg, borderColor: tone.border }}>
                        {s.recommendation}
                      </span>
                    </td>
                    <td style={tdText}>{s.rationale ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel eyebrow="From the latest uploaded research" title="Research houses' Top Ideas">
        {topIdeas.length === 0 ? (
          <p style={empty}>
            No current Top Ideas lists. Upload one on the <Link href="/research" style={link}>Research</Link> page.
          </p>
        ) : (
          <div style={ideasGrid}>
            {topIdeas.map((src) => (
              <div key={src.documentId} style={ideasCol}>
                <p style={ideasSource}>{src.source}</p>
                <p style={ideasMeta}>
                  {src.title}
                  {src.publishedAt || src.createdAt ? ` · ${asAt(src.publishedAt ?? src.createdAt)}` : ''}
                </p>
                <ul style={ideasList}>
                  {src.ideas.map((idea) => (
                    <li key={idea.code} style={ideaRow}>
                      <span style={ideaCode}>{idea.code}</span>
                      <span style={ideaName}>{idea.name ?? ''}</span>
                      <span style={ideaMeta}>
                        {[idea.rating, idea.priceTarget !== null ? `PT $${idea.priceTarget.toFixed(2)}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>
      </div>
    </PageContent>
  );
}

function SummaryItem({ label, value, tone }: { label: string; value: string; tone: 'good' | 'bad' | 'neutral' }) {
  const colour = tone === 'good' ? '#86efac' : tone === 'bad' ? '#fca5a5' : '#e2e8f0';
  return (
    <div style={summaryItem}>
      <span style={summaryLabel}>{label}</span>
      <span style={{ ...summaryValue, color: colour }}>{value}</span>
    </div>
  );
}

const stack = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '20px',
};

const summaryStrip = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
};

const summaryItem = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '14px 16px',
  borderRadius: '12px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
};

const summaryLabel = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const summaryValue = {
  fontSize: '15px',
  fontWeight: 600,
  lineHeight: 1.4,
};

const twoCol = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
  gap: '20px',
  alignItems: 'start',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '13px',
};

const th = {
  textAlign: 'left' as const,
  padding: '8px 10px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  borderBottom: '1px solid #2d4a6b',
};

const td = {
  padding: '10px',
  borderBottom: '1px solid #1b3352',
  verticalAlign: 'top' as const,
  color: '#e2e8f0',
  whiteSpace: 'nowrap' as const,
};

const tdName = { ...td, fontWeight: 600 };

const tdText = {
  ...td,
  whiteSpace: 'normal' as const,
  color: '#cbd5e1',
  lineHeight: 1.5,
};

const stanceChip = {
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: '999px',
  border: '1px solid',
  fontSize: '12px',
  fontWeight: 600,
};

const prose = {
  margin: 0,
  fontSize: '14px',
  lineHeight: 1.65,
  color: '#cbd5e1',
  whiteSpace: 'pre-line' as const,
};

const empty = {
  margin: 0,
  fontSize: '13px',
  color: '#94a3b8',
};

const footnote = {
  margin: '12px 0 0',
  fontSize: '12px',
  color: '#64748b',
  lineHeight: 1.5,
};

const link = {
  color: '#38bdf8',
  fontWeight: 600,
  textDecoration: 'none',
};

const riskList = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
};

const riskItem = {
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-start',
};

const severityTag = {
  flexShrink: 0,
  minWidth: '64px',
  textAlign: 'center' as const,
  padding: '2px 8px',
  borderRadius: '6px',
  border: '1px solid',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
};

const riskTitle = {
  margin: 0,
  fontSize: '13px',
  fontWeight: 600,
  color: '#e2e8f0',
};

const riskSummary = {
  margin: '2px 0 0',
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.5,
};

const ideasGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px',
};

const ideasCol = {
  padding: '14px 16px',
  borderRadius: '12px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
};

const ideasSource = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const ideasMeta = {
  margin: '2px 0 10px',
  fontSize: '12px',
  color: '#64748b',
};

const ideasList = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
};

const ideaRow = {
  display: 'grid',
  gridTemplateColumns: '60px 1fr auto',
  gap: '10px',
  alignItems: 'baseline',
  fontSize: '13px',
};

const ideaCode = {
  fontWeight: 700,
  color: '#38bdf8',
};

const ideaName = {
  color: '#cbd5e1',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
};

const ideaMeta = {
  color: '#94a3b8',
  fontSize: '12px',
  whiteSpace: 'nowrap' as const,
};
