'use client';

import type { ApprovalWorkflow } from '../../domain/types/approval';
import StatusBox from './StatusBox';

type ApprovalWorkflowPanelProps = {
  workflow: ApprovalWorkflow;
};

function formatTimestamp(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ApprovalWorkflowPanel({
  workflow,
}: ApprovalWorkflowPanelProps) {
  const { approvalRequired, status, scenarioName } = workflow;

  return (
    <div style={panel}>
      <h3 style={title}>Approval Workflow</h3>
      <StatusBox variant="neutral">
        Local preview only — sign-off and persistence are not enabled yet
      </StatusBox>

      <div style={metadataGrid}>
        <div style={metadataItem}>
          <span style={metadataLabel}>Scenario</span>
          <span style={metadataValue}>{scenarioName}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Workflow status</span>
          <span style={metadataValue}>{status}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Approval required</span>
          <span
            style={{
              ...metadataValue,
              color: approvalRequired ? '#fbbf24' : '#86efac',
            }}
          >
            {approvalRequired ? 'Yes' : 'No'}
          </span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Last updated</span>
          <span style={metadataValue}>
            {formatTimestamp(workflow.timestamp)}
          </span>
        </div>
      </div>

      {approvalRequired ? (
        <StatusBox variant="warning">
          Guardrails indicate adviser approval would be required before
          implementation
        </StatusBox>
      ) : (
        <StatusBox variant="success">
          No adviser approval flag raised by current simulation guardrails
        </StatusBox>
      )}

      <h4 style={sectionTitle}>Reviewer & sign-off (placeholder)</h4>
      <div style={signOffBox}>
        <label style={fieldLabel}>
          Reviewer
          <input
            type="text"
            style={inputDisabled}
            placeholder="Reviewer name (coming soon)"
            disabled
            readOnly
            value={workflow.reviewer ?? ''}
          />
        </label>
        <label style={fieldLabel}>
          Approval notes
          <textarea
            style={{ ...inputDisabled, minHeight: '72px', resize: 'vertical' as const }}
            placeholder="Notes for compliance or client file (coming soon)"
            disabled
            readOnly
            value={workflow.approvalNotes ?? ''}
          />
        </label>
      </div>

      <div style={actionsRow}>
        <button type="button" style={actionButtonDisabled} disabled>
          Mark reviewed
        </button>
        <button type="button" style={actionButtonDisabled} disabled>
          Approve
        </button>
        <button type="button" style={actionButtonDisabled} disabled>
          Reject
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

const sectionTitle = {
  margin: '16px 0 12px 0',
  fontSize: '15px',
  fontWeight: 600,
  color: '#94a3b8',
};

const signOffBox = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
  marginBottom: '16px',
};

const fieldLabel = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
  fontSize: '13px',
  color: '#94a3b8',
};

const inputDisabled = {
  padding: '10px 12px',
  background: '#0f2744',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#64748b',
  fontSize: '14px',
  cursor: 'not-allowed',
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
