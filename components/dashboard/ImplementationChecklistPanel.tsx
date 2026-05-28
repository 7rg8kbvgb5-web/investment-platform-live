'use client';

import type {
  ChecklistItemStatus,
  ImplementationChecklist,
} from '../../domain/types/implementation';
import StatusBox from './StatusBox';

type ImplementationChecklistPanelProps = {
  checklist: ImplementationChecklist;
};

function statusLabel(status: ChecklistItemStatus): string {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'blocked':
      return 'Blocked';
    default:
      return 'Pending';
  }
}

function statusColor(status: ChecklistItemStatus): string {
  switch (status) {
    case 'complete':
      return '#86efac';
    case 'blocked':
      return '#f87171';
    default:
      return '#fbbf24';
  }
}

export default function ImplementationChecklistPanel({
  checklist,
}: ImplementationChecklistPanelProps) {
  const completeCount = checklist.items.filter(
    (item) => item.status === 'complete'
  ).length;
  const blockedCount = checklist.items.filter(
    (item) => item.status === 'blocked'
  ).length;

  return (
    <div style={panel}>
      <h3 style={title}>Implementation Checklist</h3>
      <StatusBox variant="neutral">
        Local preview only — checklist progress is not persisted yet
      </StatusBox>

      <div style={metadataGrid}>
        <div style={metadataItem}>
          <span style={metadataLabel}>Scenario</span>
          <span style={metadataValue}>{checklist.scenarioName}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Steps complete</span>
          <span style={metadataValue}>
            {completeCount} / {checklist.items.length}
          </span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Blocked</span>
          <span
            style={{
              ...metadataValue,
              color: blockedCount > 0 ? '#f87171' : '#86efac',
            }}
          >
            {blockedCount}
          </span>
        </div>
      </div>

      <table style={table}>
        <thead>
          <tr>
            <th style={tableHeader}>Step</th>
            <th style={tableHeader}>Status</th>
            <th style={tableHeader}>Note</th>
          </tr>
        </thead>
        <tbody>
          {checklist.items.map((item) => (
            <tr key={item.id}>
              <td style={tableCell}>{item.label}</td>
              <td style={tableCell}>
                <span
                  style={{
                    fontWeight: 600,
                    color: statusColor(item.status),
                  }}
                >
                  {statusLabel(item.status)}
                </span>
              </td>
              <td style={tableCell}>{item.note ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={actionsRow}>
        <button type="button" style={actionButtonDisabled} disabled>
          Mark step complete (coming soon)
        </button>
        <button type="button" style={actionButtonDisabled} disabled>
          Export checklist (coming soon)
        </button>
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

const metadataGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
  marginBottom: '16px',
};

const metadataItem = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const metadataLabel = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const metadataValue = {
  fontSize: '15px',
  fontWeight: 600,
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  marginBottom: '16px',
};

const tableHeader = {
  padding: '12px',
  border: '1px solid #2d4a6b',
  textAlign: 'left' as const,
  background: '#12345b',
};

const tableCell = {
  padding: '12px',
  border: '1px solid #2d4a6b',
};

const actionsRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '10px',
};

const actionButtonDisabled = {
  padding: '10px 16px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#64748b',
  fontSize: '14px',
  cursor: 'not-allowed',
};
