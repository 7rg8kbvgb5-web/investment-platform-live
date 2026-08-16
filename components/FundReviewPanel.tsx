'use client';

import { useEffect, useState } from 'react';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';
import type {
  FundHeld,
  FundReviewAlert,
  FundReviewCategory,
  FundReviewSeverity,
  FundReviewStatus,
} from '../lib/engines/fund-review';

// Live fund review, scoped to the actual listed/unlisted funds held in
// the model portfolio (tagged on the Model Portfolio tab). Three
// categories drawn from standard fund due diligence practice: manager
// & team, performance & ratings, structural & liquidity (which differs
// for listed vs unlisted funds). Every alert here is a recommendation
// for review - nothing changes a fund holding automatically.

const CATEGORY_META: Record<FundReviewCategory, { title: string; blurb: string }> = {
  manager: {
    title: 'Manager & Team',
    blurb: 'PM/CIO departures, key-person risk, ownership changes, capacity (FUM growth).',
  },
  performance: {
    title: 'Performance & Ratings',
    blurb: 'Performance vs benchmark/peers, and ratings agency upgrades or downgrades.',
  },
  structural: {
    title: 'Structural & Liquidity',
    blurb: 'Listed: NTA premium/discount, gearing. Unlisted: redemption terms, gates, fees.',
  },
  alternative: {
    title: 'Better Risk-Adjusted Alternative',
    blurb: 'A specific, named replacement fund worth an Investment Committee look.',
  },
};

const SEVERITY_ORDER: FundReviewSeverity[] = ['critical', 'high', 'medium', 'low'];

export function FundReviewPanel() {
  const [fundsHeld, setFundsHeld] = useState<FundHeld[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [alerts, setAlerts] = useState<FundReviewAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');

  useEffect(() => {
    fetch('/api/fund-reviews/funds-held')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setFundsHeld(data.funds);
      })
      .finally(() => setFundsLoading(false));
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const res = await fetch('/api/fund-reviews/latest');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Failed to load fund review alerts.');
      setAlerts(data.alerts);
    } catch (err) {
      setAlertsError(err instanceof Error ? err.message : 'Failed to load fund review alerts.');
    } finally {
      setAlertsLoading(false);
    }
  }

  async function runScan() {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch('/api/fund-reviews/run-now', { method: 'POST' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Scan failed.');
      await loadAlerts();
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setScanning(false);
    }
  }

  async function setStatus(id: string, status: FundReviewStatus) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await fetch('/api/fund-reviews/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch {
      // Optimistic update already applied; a failed persist just reverts on next reload.
    }
  }

  const lastScanAt = alerts.length > 0 ? alerts[0].generatedAt : null;
  const visibleAlerts = statusFilter === 'active' ? alerts.filter((a) => a.status !== 'dismissed') : alerts;

  return (
    <Panel
      eyebrow="Listed and unlisted funds actually held in the model portfolio"
      title="Fund Reviews"
      actions={
        <button type="button" style={scanButton} onClick={runScan} disabled={scanning || fundsHeld.length === 0}>
          {scanning ? 'Scanning…' : 'Run scan'}
        </button>
      }
    >
      <p style={intro}>
        Reviews the actual funds held — listed (LICs, listed trusts) and unlisted (managed funds) — across
        manager/team changes, performance vs benchmark and ratings agency moves, and structural or liquidity
        flags specific to each fund&apos;s listed/unlisted structure. Every flag here is a recommendation for
        review — nothing is redeemed or switched automatically.
      </p>

      <div style={fundsBox}>
        <p style={fundsBoxTitle}>Funds currently held</p>
        {fundsLoading ? (
          <p style={emptyText}>Loading…</p>
        ) : fundsHeld.length === 0 ? (
          <p style={emptyText}>
            No holdings are tagged as a listed or unlisted fund yet — set a holding&apos;s type on the
            Model Portfolio tab (next to its name) to include it here.
          </p>
        ) : (
          <div style={fundsGrid}>
            {fundsHeld.map((fund) => (
              <div key={fund.code} style={fundChip}>
                <span style={fundChipCode}>{fund.code}</span>
                <span style={fundChipName}>{fund.name}</span>
                <span style={fundChipType(fund.holdingType)}>
                  {fund.holdingType === 'listed_fund' ? 'Listed' : 'Unlisted'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={metaRow}>
        <span style={metaText}>
          {lastScanAt
            ? `Last scan: ${new Date(lastScanAt).toLocaleString('en-AU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : 'No scan run yet'}
        </span>
        <div style={filterToggle}>
          <button
            type="button"
            style={statusFilter === 'active' ? filterButtonActive : filterButton}
            onClick={() => setStatusFilter('active')}
          >
            Active
          </button>
          <button
            type="button"
            style={statusFilter === 'all' ? filterButtonActive : filterButton}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
        </div>
      </div>

      {scanError && (
        <StatusBox variant="error" display="inline">
          {scanError}
        </StatusBox>
      )}

      {alertsLoading ? (
        <StatusBox variant="neutral" display="inline">
          Loading the latest scan…
        </StatusBox>
      ) : alertsError ? (
        <StatusBox variant="error" display="inline">
          {alertsError}
        </StatusBox>
      ) : alerts.length === 0 ? (
        <StatusBox variant="neutral" display="inline">
          No scan has been run yet — click &quot;Run scan&quot; to review the funds held above across
          manager, performance, and structural/liquidity signals.
        </StatusBox>
      ) : (
        <div style={categoryGrid}>
          {(Object.keys(CATEGORY_META) as FundReviewCategory[]).map((category) => {
            const categoryAlerts = visibleAlerts
              .filter((a) => a.category === category)
              .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

            return (
              <div key={category} style={categoryCard}>
                <h4 style={categoryTitle}>{CATEGORY_META[category].title}</h4>
                <p style={categoryBlurb}>{CATEGORY_META[category].blurb}</p>

                {categoryAlerts.length === 0 ? (
                  <p style={emptyText}>Nothing flagged here from the last scan.</p>
                ) : (
                  <ul style={alertList}>
                    {categoryAlerts.map((alert) => (
                      <li key={alert.id} style={alertRow}>
                        <div style={alertHeader}>
                          <span style={severityBadge(alert.severity)}>{alert.severity}</span>
                          <span style={alertTitle}>{alert.title}</span>
                        </div>
                        <p style={alertSummary}>{alert.summary}</p>
                        {alert.category === 'alternative' && alert.suggestedAlternativeCode && (
                          <div style={alternativeCallout}>
                            <span style={alternativeCalloutLabel}>Suggested alternative</span>
                            <span style={alternativeCalloutValue}>
                              {alert.suggestedAlternativeCode} — {alert.suggestedAlternativeName}
                            </span>
                          </div>
                        )}
                        <div style={alertTagsRow}>
                          <span style={fundTagCode}>{alert.fundCode}</span>
                          <span style={fundTagName}>{alert.fundName}</span>
                          {alert.sourceNote && <span style={alertSource}>{alert.sourceNote}</span>}
                        </div>
                        {alert.status !== 'dismissed' && (
                          <div style={alertActions}>
                            {alert.status === 'new' && (
                              <button
                                type="button"
                                style={alertActionButton}
                                onClick={() => setStatus(alert.id, 'reviewed')}
                              >
                                Mark reviewed
                              </button>
                            )}
                            <button
                              type="button"
                              style={alertActionButtonMuted}
                              onClick={() => setStatus(alert.id, 'dismissed')}
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                        {alert.status === 'dismissed' && <p style={dismissedTag}>Dismissed</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

const intro = {
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  marginTop: '-8px',
  marginBottom: '14px',
  lineHeight: 1.5,
};

const scanButton = {
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 700,
  background: '#0f3d2e',
  border: '1px solid #10b981',
  color: '#86efac',
  cursor: 'pointer',
};

const fundsBox = {
  padding: '12px 14px',
  borderRadius: '10px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  marginBottom: '16px',
};

const fundsBoxTitle = {
  margin: '0 0 8px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#93c5fd',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.03em',
};

const fundsGrid = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '8px',
};

const fundChip = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 10px',
  borderRadius: '999px',
  background: '#0b2342',
  border: '1px solid #1e3a5f',
  fontSize: '12px',
};

const fundChipCode = {
  fontWeight: 700,
  color: '#38bdf8',
};

const fundChipName = {
  color: '#cbd5e1',
};

function fundChipType(holdingType: 'listed_fund' | 'unlisted_fund' | string) {
  const isListed = holdingType === 'listed_fund';
  return {
    padding: '1px 7px',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 700,
    background: isListed ? '#12345b' : '#3f2b12',
    color: isListed ? '#93c5fd' : '#fbbf24',
  };
}

const metaRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap' as const,
  gap: '10px',
  marginBottom: '14px',
};

const metaText = {
  fontSize: '12px',
  color: '#94a3b8',
};

const filterToggle = {
  display: 'flex',
  gap: '6px',
};

const filterButton = {
  padding: '5px 12px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: 'transparent',
  border: '1px solid #2d4a6b',
  color: '#94a3b8',
  cursor: 'pointer',
};

const filterButtonActive = {
  ...filterButton,
  background: '#12345b',
  color: '#93c5fd',
  border: '1px solid #60a5fa',
};

const categoryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '16px',
};

const categoryCard = {
  padding: '14px 16px',
  borderRadius: '12px',
  background: '#0d1f38',
  border: '1px solid #1e3a5f',
};

const categoryTitle = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const categoryBlurb = {
  margin: '4px 0 12px',
  fontSize: '11px',
  color: '#94a3b8',
  lineHeight: 1.4,
};

const alertList = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '10px',
};

const alertRow = {
  padding: '10px 12px',
  background: '#0b2342',
  borderRadius: '8px',
  border: '1px solid #1e3a5f',
};

const alertHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap' as const,
};

function severityBadge(severity: FundReviewSeverity) {
  const colors: Record<FundReviewSeverity, { bg: string; border: string; text: string }> = {
    critical: { bg: '#4a1520', border: '#ef4444', text: '#fca5a5' },
    high: { bg: '#3f2b12', border: '#f59e0b', text: '#fbbf24' },
    medium: { bg: '#12345b', border: '#2d4a6b', text: '#93c5fd' },
    low: { bg: '#12203a', border: '#1e3a5f', text: '#94a3b8' },
  };
  const c = colors[severity];
  return {
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.text,
  };
}

const alertTitle = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const alertSummary = {
  margin: '6px 0 0',
  fontSize: '12px',
  color: '#cbd5e1',
  lineHeight: 1.5,
};

const alternativeCallout = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
  marginTop: '8px',
  padding: '8px 10px',
  borderRadius: '8px',
  background: '#0f3d2e',
  border: '1px solid #10b981',
};

const alternativeCalloutLabel = {
  fontSize: '10px',
  fontWeight: 700,
  color: '#86efac',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.03em',
};

const alternativeCalloutValue = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const alertTagsRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '6px',
  marginTop: '8px',
  alignItems: 'center',
};

const fundTagCode = {
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 700,
  background: '#0f3d2e',
  color: '#38bdf8',
};

const fundTagName = {
  fontSize: '10px',
  color: '#94a3b8',
};

const alertSource = {
  fontSize: '10px',
  color: '#64748b',
  fontStyle: 'italic' as const,
  marginLeft: 'auto',
};

const alertActions = {
  display: 'flex',
  gap: '8px',
  marginTop: '10px',
};

const alertActionButton = {
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 600,
  background: '#0f3d2e',
  border: '1px solid #10b981',
  color: '#86efac',
  cursor: 'pointer',
};

const alertActionButtonMuted = {
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 600,
  background: 'transparent',
  border: '1px solid #2d4a6b',
  color: '#94a3b8',
  cursor: 'pointer',
};

const dismissedTag = {
  margin: '8px 0 0',
  fontSize: '11px',
  color: '#64748b',
  fontStyle: 'italic' as const,
};

const emptyText = {
  margin: 0,
  fontSize: '12px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
};
