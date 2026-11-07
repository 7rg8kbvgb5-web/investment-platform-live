'use client';

import { useEffect, useState } from 'react';
import { fetchCoreSecurities, ASSET_CLASSES, type CoreSecurity } from '../lib/engines/model-portfolio-core';
import { computeConvictionRating, type ConvictionRating } from '../lib/engines/conviction-rating';
import {
  listApprovedSecurities,
  addApprovedSecurity,
  updateApprovedStatus,
  APPROVED_STATUS_LABELS,
  type ApprovedSecurity,
  type ApprovedStatus,
} from '../lib/engines/approved-list';
import { currentUserEmail } from '../lib/engines/model-versioning';
import Badge, { type BadgeVariant } from './ui/Badge';
import Panel from './ui/Panel';

// The Approved List - the universe the model portfolio draws on - with
// what's held in the model marked against it. Lives in Supabase (it used
// to be a static file that couldn't be edited). Every model holding is on
// it automatically; securities can also be added here as candidates, put
// on watchlist or under review, or removed. House View / Conviction is
// computed live from Ord Minnett, Barrenjoey, and consensus.

type CombinedRow = {
  id: string;
  code: string;
  name: string;
  sector: string;
  assetClass: string | null;
  heldInModel: boolean;
  status: ApprovedStatus;
  notes: string | null;
};

function houseViewVariant(view: string | null): BadgeVariant {
  if (view === 'strong-positive' || view === 'positive') return 'success';
  if (view === 'negative' || view === 'strong-negative') return 'danger';
  return 'neutral';
}

export function SecurityMasterPanel() {
  const [rows, setRows] = useState<CombinedRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [convictions, setConvictions] = useState<Record<string, ConvictionRating>>({});
  const [convictionsLoading, setConvictionsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);

  async function load() {
    try {
      const [approved, modelSecurities] = await Promise.all([
        listApprovedSecurities(),
        fetchCoreSecurities(),
      ]);
      const held = new Map<string, CoreSecurity>(modelSecurities.map((s) => [s.code.toUpperCase(), s]));
      const combined: CombinedRow[] = approved.map((a) => {
        const h = held.get(a.code.toUpperCase());
        return {
          id: a.id,
          code: a.code,
          name: h?.name ?? a.name,
          sector: h?.sector ?? a.sector ?? '—',
          assetClass: h?.assetClass ?? a.assetClass,
          heldInModel: !!h,
          status: a.status,
          notes: a.notes,
        };
      });
      combined.sort((x, y) => Number(y.heldInModel) - Number(x.heldInModel) || x.code.localeCompare(y.code));
      setRows(combined);
      setRowsError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load the Approved List.';
      setRowsError(
        message.includes('approved_securities')
          ? 'The Approved List table isn\u2019t set up yet \u2014 run migration 0019 in Supabase.'
          : message,
      );
    } finally {
      setRowsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(row: CombinedRow, status: ApprovedStatus) {
    if (row.heldInModel && status !== 'approved') {
      const ok = window.confirm(
        `${row.code} is held in the model portfolio. Marking it "${APPROVED_STATUS_LABELS[status]}" doesn't remove it from the model - raise a swap with the Investment Committee to do that. Continue?`,
      );
      if (!ok) return;
    }
    try {
      await updateApprovedStatus(row.id, status);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to update.');
    }
  }

  const visibleRows = rows.filter((r) => showRemoved || r.status !== 'removed');
  const removedCount = rows.filter((r) => r.status === 'removed').length;

  useEffect(() => {
    if (rows.length === 0) return;
    let cancelled = false;
    Promise.all(
      rows.map(async (row) => {
        try {
          const rating = await computeConvictionRating(row.code);
          return [row.code, rating] as const;
        } catch {
          return [row.code, { houseView: null, convictionScore: null, sources: [] }] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setConvictions(Object.fromEntries(results));
      setConvictionsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [rows]);

  return (
    <Panel
      eyebrow="Approved List"
      title="Security Master"
      actions={
        <button type="button" onClick={() => setShowAdd((v) => !v)} style={actionButton}>
          {showAdd ? 'Close' : 'Add a security'}
        </button>
      }
    >
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '-8px', marginBottom: '10px' }}>
        The universe the model portfolio draws on. Everything held in the model is on it
        automatically; add candidates here, or move a security to watchlist or under review.
        House View / Conviction is computed live from Ord Minnett&apos;s house view,
        Barrenjoey&apos;s house view, and the consensus view — hover a rating to see what fed into it.
      </p>

      {showAdd ? <AddApprovedForm onAdded={() => { setShowAdd(false); load(); }} /> : null}

      {removedCount > 0 ? (
        <button type="button" onClick={() => setShowRemoved((v) => !v)} style={linkButton}>
          {showRemoved ? 'Hide removed' : `Show ${removedCount} removed`}
        </button>
      ) : null}

      {rowsError ? (
        <p style={{ color: '#fca5a5', fontSize: '13px' }}>{rowsError}</p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Sector</th>
                <th>Asset Class</th>
                <th>Held in Model</th>
                <th>Status</th>
                <th>House View</th>
                <th>Conviction</th>
              </tr>
            </thead>

            <tbody>
              {rowsLoading ? (
                <tr>
                  <td colSpan={8} style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Loading the security master…
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const conviction = convictions[row.code];
                  const houseView = conviction?.houseView ?? null;
                  const convictionScore = conviction?.convictionScore ?? null;
                  const sources = conviction?.sources ?? [];
                  const tooltip =
                    sources.length > 0
                      ? sources.map((s) => `${s.source}: ${s.rating}`).join(' · ')
                      : convictionsLoading
                        ? 'Loading…'
                        : 'No rating data yet';

                  return (
                    <tr key={row.code}>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{row.code}</td>
                      <td>{row.name}</td>
                      <td>{row.sector}</td>
                      <td>{row.assetClass ?? '—'}</td>
                      <td>
                        <Badge variant={row.heldInModel ? 'primary' : 'neutral'}>
                          {row.heldInModel ? 'Held' : 'Not held'}
                        </Badge>
                      </td>
                      <td>
                        <select
                          value={row.status}
                          onChange={(e) => changeStatus(row, e.target.value as ApprovedStatus)}
                          style={statusSelect}
                          title={row.notes ?? undefined}
                        >
                          {(Object.keys(APPROVED_STATUS_LABELS) as ApprovedStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {APPROVED_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td title={tooltip}>
                        {houseView ? (
                          <Badge variant={houseViewVariant(houseView)}>
                            {houseView.replaceAll('-', ' ')}
                          </Badge>
                        ) : (
                          <span style={noDataText}>
                            {convictionsLoading ? 'Loading…' : 'No rating data'}
                          </span>
                        )}
                      </td>
                      <td title={tooltip}>{convictionScore !== null ? `${convictionScore}/5` : '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const noDataText = {
  fontSize: '12px',
  color: '#64748b',
  fontStyle: 'italic' as const,
};

function AddApprovedForm({ onAdded }: { onAdded: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState('');
  const [sector, setSector] = useState('');
  const [status, setStatus] = useState<ApprovedStatus>('approved');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!code.trim() || !name.trim()) {
      setError('Code and name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addApprovedSecurity({
        code,
        name,
        assetClass: assetClass || null,
        sector,
        status,
        notes,
        addedBy: await currentUserEmail(),
      });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={addBox}>
      <div style={addGrid}>
        <input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} style={fieldInput} />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={fieldInput} />
        <select value={assetClass} onChange={(e) => setAssetClass(e.target.value)} style={fieldInput}>
          <option value="">Asset class…</option>
          {ASSET_CLASSES.map((ac) => (
            <option key={ac.name} value={ac.name}>
              {ac.name}
            </option>
          ))}
        </select>
        <input placeholder="Sector" value={sector} onChange={(e) => setSector(e.target.value)} style={fieldInput} />
        <select value={status} onChange={(e) => setStatus(e.target.value as ApprovedStatus)} style={fieldInput}>
          {(Object.keys(APPROVED_STATUS_LABELS) as ApprovedStatus[])
            .filter((s) => s !== 'removed')
            .map((s) => (
              <option key={s} value={s}>
                {APPROVED_STATUS_LABELS[s]}
              </option>
            ))}
        </select>
      </div>
      <input placeholder="Notes (why it's on the list)" value={notes} onChange={(e) => setNotes(e.target.value)} style={fieldInput} />
      <button type="button" onClick={submit} disabled={saving} style={actionButton}>
        {saving ? 'Adding…' : 'Add to Approved List'}
      </button>
      {error ? <p style={{ color: '#fca5a5', fontSize: '13px', margin: 0 }}>{error}</p> : null}
    </div>
  );
}

const actionButton = {
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  background: '#0e7490',
  color: '#ffffff',
  border: '1px solid #0891b2',
};

const linkButton = {
  background: 'none',
  border: 'none',
  color: '#38bdf8',
  fontSize: '12px',
  cursor: 'pointer',
  padding: 0,
  marginBottom: '8px',
};

const statusSelect = {
  padding: '3px 6px',
  borderRadius: '6px',
  fontSize: '12px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const addBox = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
  alignItems: 'flex-start',
  padding: '12px',
  borderRadius: '10px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  marginBottom: '12px',
};

const addGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '8px',
  width: '100%',
};

const fieldInput = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
  boxSizing: 'border-box' as const,
};
