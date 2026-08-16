'use client';

import { useEffect, useState } from 'react';
import { securityMasterData } from '../domain/types/security-master-data';
import { computeConvictionRating, type ConvictionRating } from '../lib/engines/conviction-rating';
import Badge, { type BadgeVariant } from './ui/Badge';
import Panel from './ui/Panel';

function houseViewVariant(view: string | null): BadgeVariant {
  if (view === 'strong-positive' || view === 'positive') return 'success';
  if (view === 'negative' || view === 'strong-negative') return 'danger';
  return 'neutral';
}

function approvalVariant(status: string): BadgeVariant {
  if (status === 'approved') return 'success';
  if (status === 'watchlist' || status === 'under-review') return 'warning';
  if (status === 'restricted' || status === 'removed') return 'danger';
  return 'neutral';
}

function championVariant(status: string): BadgeVariant {
  if (status === 'champion') return 'primary';
  if (status === 'challenger') return 'neutral';
  return 'neutral';
}

export function SecurityMasterPanel() {
  const [convictions, setConvictions] = useState<Record<string, ConvictionRating>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      securityMasterData.map(async (security) => {
        try {
          const rating = await computeConvictionRating(security.code);
          return [security.code, rating] as const;
        } catch {
          return [security.code, { houseView: null, convictionScore: null, sources: [] }] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setConvictions(Object.fromEntries(results));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Panel eyebrow="Approved List" title="Security Master">
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '-8px', marginBottom: '10px' }}>
        Central register for approved securities, Champion / Challenger status, and a
        live conviction rating built from Ord Minnett&apos;s and Barrenjoey&apos;s house
        views plus the consensus view — hover a rating to see what fed into it. A
        security shows &quot;No rating data&quot; until at least one of those three
        sources has something on file for it (a house-view upload with a rating, or a
        consensus lookup run above).
      </p>

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Sector</th>
              <th>House View</th>
              <th>Conviction</th>
              <th>Status</th>
              <th>Role</th>
            </tr>
          </thead>

          <tbody>
            {securityMasterData.map((security) => {
              const conviction = convictions[security.code];
              const houseView = conviction?.houseView ?? null;
              const convictionScore = conviction?.convictionScore ?? null;
              const sources = conviction?.sources ?? [];
              const tooltip =
                sources.length > 0
                  ? sources.map((s) => `${s.source}: ${s.rating}`).join(' · ')
                  : loading
                    ? 'Loading…'
                    : 'No rating data yet';

              return (
                <tr key={security.id}>
                  <td style={{ fontWeight: 700 }}>{security.code}</td>
                  <td>{security.name}</td>
                  <td>{security.sector}</td>
                  <td title={tooltip}>
                    {houseView ? (
                      <Badge variant={houseViewVariant(houseView)}>{houseView.replaceAll('-', ' ')}</Badge>
                    ) : (
                      <span style={noDataText}>{loading ? 'Loading…' : 'No rating data'}</span>
                    )}
                  </td>
                  <td title={tooltip}>{convictionScore !== null ? `${convictionScore}/5` : '—'}</td>
                  <td>
                    <Badge variant={approvalVariant(security.approvalStatus)}>
                      {security.approvalStatus.replaceAll('-', ' ')}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={championVariant(security.championStatus)}>
                      {security.championStatus.replaceAll('-', ' ')}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const noDataText = {
  fontSize: '12px',
  color: '#64748b',
  fontStyle: 'italic' as const,
};
