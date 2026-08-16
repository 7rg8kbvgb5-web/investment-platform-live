'use client';

import { useEffect, useState } from 'react';
import { securityMasterData } from '../domain/types/security-master-data';
import { fetchCoreSecurities, type CoreSecurity } from '../lib/engines/model-portfolio-core';
import { computeConvictionRating, type ConvictionRating } from '../lib/engines/conviction-rating';
import Badge, { type BadgeVariant } from './ui/Badge';
import Panel from './ui/Panel';

// The full universe the desk cares about: every security actually held
// in the live model portfolio, plus Approved List candidates being
// tracked but not currently held (the old static security-master list,
// now used honestly for what it actually is - a curated candidate list -
// rather than pretending it was a live house view). Every row's House
// View/Conviction is computed live from Ord Minnett, Barrenjoey, and
// consensus - same as before, just applied across the combined list.

type CombinedRow = {
  code: string;
  name: string;
  sector: string;
  assetClass: string | null;
  heldInModel: boolean;
  approvedList: boolean;
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

  useEffect(() => {
    let cancelled = false;
    fetchCoreSecurities()
      .then((modelSecurities: CoreSecurity[]) => {
        if (cancelled) return;

        const heldCodes = new Set(modelSecurities.map((s) => s.code.toUpperCase()));

        const heldRows: CombinedRow[] = modelSecurities.map((s) => ({
          code: s.code,
          name: s.name,
          sector: s.sector ?? '—',
          assetClass: s.assetClass,
          heldInModel: true,
          approvedList: securityMasterData.some((a) => a.code.toUpperCase() === s.code.toUpperCase()),
        }));

        const candidateRows: CombinedRow[] = securityMasterData
          .filter((a) => !heldCodes.has(a.code.toUpperCase()))
          .map((a) => ({
            code: a.code,
            name: a.name,
            sector: a.sector,
            assetClass: null,
            heldInModel: false,
            approvedList: true,
          }));

        setRows([...heldRows, ...candidateRows]);
        setRowsLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setRowsError(err instanceof Error ? err.message : 'Failed to load the security master.');
          setRowsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    <Panel eyebrow="Held in model + Approved List candidates" title="Security Master">
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '-8px', marginBottom: '10px' }}>
        Every security currently held in the model portfolio, plus Approved List
        candidates being tracked but not held. House View / Conviction is computed live
        from Ord Minnett&apos;s house view, Barrenjoey&apos;s house view, and the
        consensus view — hover a rating to see what fed into it.
      </p>

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
                <th>Approved List</th>
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
                rows.map((row) => {
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
                        <Badge variant={row.approvedList ? 'success' : 'neutral'}>
                          {row.approvedList ? 'Approved' : '—'}
                        </Badge>
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
