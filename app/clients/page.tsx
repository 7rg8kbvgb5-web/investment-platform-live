import Link from 'next/link';
import PageContent from '../../components/PageContent';
import StatusBox from '../../components/dashboard/StatusBox';
import { getClientRegister, type ClientRegisterRow } from '../../lib/engines/client-register';
import { DRIFT_TOLERANCE_PP, DRIFT_WATCH_PP } from '../../lib/engines/client-advice';

export const dynamic = 'force-dynamic';

const DRIFT_STYLE: Record<ClientRegisterRow['driftStatus'], { bg: string; fg: string; label: string }> = {
  'outside-tolerance': { bg: '#3f1620', fg: '#f87171', label: 'Outside tolerance' },
  watch: { bg: '#3f3a12', fg: '#facc15', label: 'Watch' },
  'in-tolerance': { bg: '#0f3d2e', fg: '#4ade80', label: 'In tolerance' },
  'no-holdings': { bg: '#0d2542', fg: '#94a3b8', label: 'New money' },
};

const STATUS_LABEL: Record<ClientRegisterRow['status'], string> = {
  in_progress: 'In progress',
  proposed: 'Proposed',
  implemented: 'Implemented',
};

export default async function ClientsPage() {
  let register: Awaited<ReturnType<typeof getClientRegister>> | null = null;
  let error: string | null = null;
  try {
    register = await getClientRegister();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load clients.';
  }

  return (
    <PageContent
      title="Clients"
      description={`Every client measured against the current house model for their risk profile. Asset-class drift beyond ${DRIFT_TOLERANCE_PP}pp is outside tolerance; beyond ${DRIFT_WATCH_PP}pp is worth watching. Based on each client's most recent statement on the Construction tab.`}
    >
      {error ? <StatusBox variant="error">{error}</StatusBox> : null}

      {register ? (
        <>
          <div style={statRow}>
            <Stat label="Clients" value={String(register.totals.clients)} />
            <Stat label="Outside tolerance" value={String(register.totals.outsideTolerance)} tone={register.totals.outsideTolerance > 0 ? 'bad' : 'ok'} />
            <Stat label="Watch" value={String(register.totals.watch)} tone={register.totals.watch > 0 ? 'warn' : 'ok'} />
            <Stat label={`Built on older model (now v${register.currentModelVersion ?? '—'})`} value={String(register.totals.staleModel)} tone={register.totals.staleModel > 0 ? 'warn' : 'ok'} />
            <Stat label="Hold an IC-approved swap" value={String(register.totals.affectedBySwaps)} tone={register.totals.affectedBySwaps > 0 ? 'warn' : 'ok'} />
            <Stat label="Funds under advice" value={formatCurrency(register.totals.totalValue)} />
          </div>

          {register.rows.length === 0 ? (
            <StatusBox variant="neutral">
              No clients yet. Name a client on the Construction tab and their review is saved here automatically.
            </StatusBox>
          ) : (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Risk profile</th>
                    <th>Value</th>
                    <th>Drift</th>
                    <th>Off-model holdings</th>
                    <th>Model version</th>
                    <th>Statement</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {register.rows.map((row) => {
                    const drift = DRIFT_STYLE[row.driftStatus];
                    return (
                      <tr key={row.reviewId}>
                        <td style={{ fontWeight: 700 }}>
                          {row.clientName}
                          {row.approvedSwapsAffecting > 0 ? (
                            <span style={flag}>
                              {row.approvedSwapsAffecting} IC swap{row.approvedSwapsAffecting === 1 ? '' : 's'}
                            </span>
                          ) : null}
                          {row.error ? <span style={{ ...flag, color: '#fca5a5' }}>{row.error}</span> : null}
                        </td>
                        <td>{STATUS_LABEL[row.status]}</td>
                        <td>
                          {row.riskProfile}
                          {!row.riskProfileAgreed ? <span style={muted}> (estimated)</span> : null}
                        </td>
                        <td>
                          {row.portfolioValue !== null ? formatCurrency(row.portfolioValue) : '—'}
                          {row.newCash > 0 ? <span style={muted}> + {formatCurrency(row.newCash)} new</span> : null}
                        </td>
                        <td>
                          <span style={{ ...pill, background: drift.bg, color: drift.fg }}>{drift.label}</span>
                          {row.driftStatus !== 'no-holdings' ? <span style={muted}> {row.maxDriftPp}pp</span> : null}
                        </td>
                        <td>{row.holdingsOutsideModel || '—'}</td>
                        <td>
                          {row.reviewModelVersion !== null ? `v${row.reviewModelVersion}` : '—'}
                          {row.staleModel ? <span style={{ ...muted, color: '#facc15' }}> (update)</span> : null}
                        </td>
                        <td style={muted}>{row.asAtDate ?? '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <Link href={`/portfolios?tab=construction&review=${row.reviewId}`} style={link}>
                            Review
                          </Link>{' '}
                          ·{' '}
                          <Link href={`/portfolios?tab=clientAdvice&review=${row.reviewId}`} style={link}>
                            Advice
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </PageContent>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'bad' }) {
  const color = tone === 'bad' ? '#f87171' : tone === 'warn' ? '#facc15' : tone === 'ok' ? '#4ade80' : '#ffffff';
  return (
    <div style={stat}>
      <span style={statLabel}>{label}</span>
      <span style={{ ...statValue, color }}>{value}</span>
    </div>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
}

const statRow = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '20px' };
const stat = { display: 'flex', flexDirection: 'column' as const, gap: '4px', padding: '12px 14px', borderRadius: '10px', background: '#0f2744', border: '1px solid #2d4a6b' };
const statLabel = { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const statValue = { fontSize: '20px', fontWeight: 700 };
const pill = { padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 };
const muted = { fontSize: '12px', color: '#94a3b8' };
const flag = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#facc15' };
const link = { color: '#38bdf8', fontSize: '13px' };
