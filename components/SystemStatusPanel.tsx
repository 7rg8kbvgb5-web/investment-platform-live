'use client';

import { useMemo } from 'react';
import { formatIsoTimestampDisplay, PREVIEW_TIMESTAMP } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

export type SystemModuleStatus =
  | 'Active'
  | 'Mock Data'
  | 'Not Connected'
  | 'Future';

export type SystemModule = {
  id: string;
  name: string;
  status: SystemModuleStatus;
  lastUpdated: string;
  notes: string;
};

const SYSTEM_MODULES: SystemModule[] = [
  {
    id: 'portfolio-engine',
    name: 'Portfolio Engine',
    status: 'Mock Data',
    lastUpdated: PREVIEW_TIMESTAMP,
    notes:
      'Portfolio state, tactical overlays, and simulation engines running on local mock allocations.',
  },
  {
    id: 'governance-workflow',
    name: 'Governance Workflow',
    status: 'Mock Data',
    lastUpdated: '2026-06-09T10:30:00.000Z',
    notes:
      'Approval, scenario, and implementation checklist workflows active with local state only.',
  },
  {
    id: 'alert-engine',
    name: 'Alert Engine',
    status: 'Mock Data',
    lastUpdated: '2026-06-10T08:00:00.000Z',
    notes:
      'Generates static, rule-based, and fund-monitoring alerts. Feeds research inbox conversion.',
  },
  {
    id: 'alert-rules-engine',
    name: 'Alert Rules Engine',
    status: 'Mock Data',
    lastUpdated: '2026-06-10T08:00:00.000Z',
    notes:
      'Configurable alert rules evaluated against mock inputs. No live market or portfolio feeds.',
  },
  {
    id: 'research-inbox',
    name: 'Research Inbox',
    status: 'Mock Data',
    lastUpdated: '2026-06-09T08:30:00.000Z',
    notes:
      'Aggregates manual, alert, fund monitoring, and research request inbox items with adviser actions.',
  },
  {
    id: 'research-requests',
    name: 'Research Requests',
    status: 'Mock Data',
    lastUpdated: '2026-06-08T14:00:00.000Z',
    notes:
      'Structured research request workflow from fund review decisions. Local mock queue only.',
  },
  {
    id: 'fund-monitoring',
    name: 'Fund Monitoring',
    status: 'Mock Data',
    lastUpdated: '2026-06-09T06:00:00.000Z',
    notes:
      'Monitored fund assessments, watch lists, and replacement candidates. No live fund data feeds.',
  },
  {
    id: 'fund-review-decisions',
    name: 'Fund Review Decisions',
    status: 'Mock Data',
    lastUpdated: '2026-06-05T14:30:00.000Z',
    notes:
      'Adviser decision lifecycle for keep, watch, replace, defer, and research actions.',
  },
  {
    id: 'audit-trail',
    name: 'Audit Trail',
    status: 'Mock Data',
    lastUpdated: '2026-06-05T14:30:00.000Z',
    notes:
      'Fund review and governance audit events recorded locally. No persistence layer connected.',
  },
  {
    id: 'investment-committee-dashboard',
    name: 'Investment Committee Dashboard',
    status: 'Mock Data',
    lastUpdated: PREVIEW_TIMESTAMP,
    notes:
      'Executive summary aggregating house views, reviews, deferred items, and governance health.',
  },
  {
    id: 'research-library',
    name: 'Research Library',
    status: 'Active',
    lastUpdated: '2026-07-13T00:00:00.000Z',
    notes:
      'Ord Minnett and Barrenjoey research documents uploaded, tagged, and stored in Supabase storage.',
  },
  {
    id: 'weekly-brief',
    name: 'Weekly Research Brief',
    status: 'Active',
    lastUpdated: '2026-07-13T00:00:00.000Z',
    notes:
      'Anthropic-powered brief with live web search, scanning macro events and Approved List holdings weekly. Recommendations only — never auto-trades.',
  },
  {
    id: 'portfolio-pdf-review',
    name: 'Client Portfolio PDF Review',
    status: 'Active',
    lastUpdated: '2026-07-13T00:00:00.000Z',
    notes:
      'Parses uploaded client portfolio statements, classifies risk against house models, and compares holdings to the security universe.',
  },
  {
    id: 'supabase',
    name: 'Supabase Persistence',
    status: 'Active',
    lastUpdated: '2026-07-13T00:00:00.000Z',
    notes:
      'Connected and live for the Research Library and Weekly Brief. The Portfolio Engine and model portfolios below are not yet wired to it.',
  },
  {
    id: 'eodhd-market-data',
    name: 'EODHD Market Data',
    status: 'Not Connected',
    lastUpdated: '2026-07-21T00:00:00.000Z',
    notes:
      'ASX pricing and fundamentals for model portfolio holdings, feeding the Data Analytics page and (planned) Sector Health Score. Needs EODHD_API_KEY in Vercel.',
  },
  {
    id: 'external-market-data',
    name: 'External Market Data',
    status: 'Future',
    lastUpdated: '2026-06-01T00:00:00.000Z',
    notes: 'Live fund performance, benchmark, and market data feeds planned for a future phase.',
  },
];

function statusColor(status: SystemModuleStatus): string {
  switch (status) {
    case 'Active':
      return '#86efac';
    case 'Mock Data':
      return '#93c5fd';
    case 'Not Connected':
      return '#fbbf24';
    case 'Future':
      return '#94a3b8';
  }
}

function summariseModules(modules: SystemModule[]) {
  return {
    total: modules.length,
    active: modules.filter((m) => m.status === 'Active').length,
    mockData: modules.filter((m) => m.status === 'Mock Data').length,
    notConnected: modules.filter((m) => m.status === 'Not Connected').length,
    future: modules.filter((m) => m.status === 'Future').length,
  };
}

export default function SystemStatusPanel() {
  const modules = useMemo(() => SYSTEM_MODULES, []);
  const summary = useMemo(() => summariseModules(modules), [modules]);

  return (
    <div style={panel}>
      <h3 style={title}>System Status</h3>

      <StatusBox variant="neutral">
        Platform module control panel — shows which engines and workflows are
        active, running on mock data, or awaiting future integration. Local
        preview only. No live persistence or external data feeds.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total modules</span>
          <span style={summaryValue}>{summary.total}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Active</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {summary.active}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Mock data</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {summary.mockData}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Not connected</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.notConnected}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Future</span>
          <span style={{ ...summaryValue, color: '#94a3b8' }}>
            {summary.future}
          </span>
        </div>
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Module</th>
              <th style={th}>Status</th>
              <th style={th}>Last updated</th>
              <th style={th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => (
              <tr key={module.id}>
                <td style={td}>{module.name}</td>
                <td style={td}>
                  <span
                    style={{
                      ...statusBadge,
                      color: statusColor(module.status),
                      borderColor: statusColor(module.status),
                    }}
                  >
                    {module.status}
                  </span>
                </td>
                <td style={td}>{formatIsoTimestampDisplay(module.lastUpdated)}</td>
                <td style={{ ...td, ...notesCell }}>{module.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const panel = {
  marginTop: '25px',
};

const title = {
  margin: '0 0 16px 0',
  fontSize: '18px',
  fontWeight: 600,
};

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: '12px',
  marginBottom: '20px',
};

const summaryItem = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const summaryLabel = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const summaryValue = {
  fontSize: '18px',
  fontWeight: 600,
};

const tableWrap = {
  overflowX: 'auto' as const,
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '14px',
};

const th = {
  textAlign: 'left' as const,
  padding: '10px 12px',
  borderBottom: '1px solid #2d4a6b',
  color: '#94a3b8',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap' as const,
};

const td = {
  padding: '12px',
  borderBottom: '1px solid #1e3a5f',
  verticalAlign: 'top' as const,
  color: '#e2e8f0',
};

const notesCell = {
  color: '#cbd5e1',
  lineHeight: 1.5,
  minWidth: '220px',
};

const statusBadge = {
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: '999px',
  border: '1px solid',
  fontSize: '12px',
  fontWeight: 600,
  whiteSpace: 'nowrap' as const,
};
