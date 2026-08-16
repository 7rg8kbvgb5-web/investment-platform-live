'use client';

import { useEffect, useState } from 'react';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';
import type {
  AlertCategory,
  AlertSeverity,
  AlertStatus,
  MonitoringAlert,
} from '../lib/engines/investment-monitoring';

// Live investment monitoring, scoped to the actual securities in the
// model portfolio - replaces the old mock alert/fund panels entirely.
// Three categories, per Sean's spec: macro events that could affect an
// asset class the model holds, news specific to an actual holding
// (e.g. a CIO departure), and possible better risk-adjusted
// alternatives within an asset class already held. Every alert here is
// a recommendation for review - nothing changes a position on its own.

const CATEGORY_META: Record<AlertCategory, { title: string; blurb: string }> = {
  macro: {
    title: 'Macro Influences',
    blurb: 'Macro, geopolitical, or commodity events that could affect an asset class the model holds.',
  },
  investment: {
    title: 'Specific Investment Influences',
    blurb: 'News tied to an actual holding - manager changes, ratings moves, corporate actions.',
  },
  alternative: {
    title: 'Better Risk-Adjusted Alternatives',
    blurb: 'Possible alternatives worth an Investment Committee look, within an asset class already held.',
  },
};

const SEVERITY_ORDER: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

export function InvestmentMonitoringPanel() {
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/monitoring/latest');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Failed to load alerts.');
      setAlerts(data.alerts);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runScan() {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch('/api/monitoring/run-now', { method: 'POST' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Scan failed.');
      await load();
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setScanning(false);
    }
  }

  async function setStatus(id: string, status: AlertStatus) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch {
      // Local state already updated optimistically; a failed persist here
      // just means it reverts to 'new' next reload, not a broken UI.
    }
  }

  const lastScanAt = alerts.length > 0 ? alerts[0].generatedAt : null;
  const visibleAlerts = statusFilter === 'active' ? alerts.filter((a) => a.status !== 'dismissed') : alerts;

  return (
    <Panel
      eyebrow="Scoped to the live model portfolio"
      title="Investment Monitoring"
      actions={
        <button type="button" style={scanButton} onClick={runScan} disabled={scanning}>
          {scanning ? 'Scanning…' : 'Run scan now'}
        </button>
      }
    >
      <p style={intro}>
        Scans the actual securities in the model portfolio (not a static
        list) across three categories, using web search. Every flag here is
        a recommendation for review — nothing is traded or swapped
        automatically.
      </p>

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

      {loading ? (
        <StatusBox variant="neutral" display="inline">
          Loading the latest scan…
        </StatusBox>
      ) : loadError ? (
        <StatusBox variant="error" display="inline">
          {loadError}
        </StatusBox>
      ) : alerts.length === 0 ? (
        <StatusBox variant="neutral" display="inline">
          No scan has been run yet — click &quot;Run scan now&quot; to check the
          model portfolio for macro events, holding-specific news, and
          better risk-adjusted alternatives.
        </StatusBox>
      ) : (
        <div style={categoryGrid}>
          {(Object.keys(CATEGORY_META) as AlertCategory[]).map((category) => {
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
                        <div style={alertTagsRow}>
                          {alert.affectedAssetClass && (
                            <span style={alertTag}>{alert.affectedAssetClass}</span>
                          )}
                          {alert.affectedCodes.map((code) => (
                            <span key={code} style={alertTagCode}>
                              {code}
                            </span>
                          ))}
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

function severityBadge(severity: AlertSeverity) {
  const colors: Record<AlertSeverity, { bg: string; border: string; text: string }> = {
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

const alertTagsRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '6px',
  marginTop: '8px',
};

const alertTag = {
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 600,
  background: '#12345b',
  color: '#93c5fd',
};

const alertTagCode = {
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 700,
  background: '#0f3d2e',
  color: '#86efac',
};

const alertSource = {
  fontSize: '10px',
  color: '#64748b',
  fontStyle: 'italic' as const,
  alignSelf: 'center' as const,
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
