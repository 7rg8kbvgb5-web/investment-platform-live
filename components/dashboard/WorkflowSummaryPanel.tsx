'use client';

import type { ApprovalWorkflow } from '../../domain/types/approval';
import type { ImplementationChecklist } from '../../domain/types/implementation';
import type { Scenario } from '../../domain/types/scenario';
import StatusBox from './StatusBox';

type WorkflowSummaryPanelProps = {
  scenario: Scenario;
  approvalWorkflow: ApprovalWorkflow;
  checklist: ImplementationChecklist;
  modelComparisonState: string;
  proposalGenerated: boolean;
};

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function checklistCompletionPercent(checklist: ImplementationChecklist): number {
  if (checklist.items.length === 0) {
    return 0;
  }
  const completeCount = checklist.items.filter(
    (item) => item.status === 'complete'
  ).length;
  return Math.round((completeCount / checklist.items.length) * 100);
}

export default function WorkflowSummaryPanel({
  scenario,
  approvalWorkflow,
  checklist,
  modelComparisonState,
  proposalGenerated,
}: WorkflowSummaryPanelProps) {
  const governance = scenario.simulationSummary?.warningSummaryAfter;
  const warningCount = governance?.warningCount ?? 0;
  const errorCount = governance?.errorCount ?? 0;
  const completionPercent = checklistCompletionPercent(checklist);
  const displayTimestamp =
    scenario.simulationSummary?.timestamp ??
    approvalWorkflow.timestamp ??
    scenario.createdTimestamp;

  return (
    <div style={panel}>
      <h3 style={title}>Workflow Summary</h3>
      <StatusBox variant="neutral">
        Read-only snapshot of where this portfolio scenario sits in the local
        simulation workflow
      </StatusBox>

      <div style={metadataGrid}>
        <div style={metadataItem}>
          <span style={metadataLabel}>Scenario status</span>
          <span style={metadataValue}>{scenario.status}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Approval status</span>
          <span style={metadataValue}>{approvalWorkflow.status}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Warnings</span>
          <span
            style={{
              ...metadataValue,
              color: warningCount > 0 ? '#fbbf24' : '#86efac',
            }}
          >
            {scenario.simulationSummary ? warningCount : '—'}
          </span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Errors</span>
          <span
            style={{
              ...metadataValue,
              color: errorCount > 0 ? '#f87171' : '#86efac',
            }}
          >
            {scenario.simulationSummary ? errorCount : '—'}
          </span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Model comparison</span>
          <span style={metadataValue}>{modelComparisonState}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Proposal summary</span>
          <span style={metadataValue}>
            {proposalGenerated ? 'Generated (preview)' : 'Pending'}
          </span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Checklist complete</span>
          <span style={metadataValue}>{completionPercent}%</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Last updated</span>
          <span style={metadataValue}>
            {formatTimestamp(displayTimestamp)}
          </span>
        </div>
      </div>

      <div style={detailRow}>
        <span style={detailLabel}>Scenario</span>
        <span style={detailValue}>{scenario.scenarioName}</span>
      </div>
      {approvalWorkflow.approvalRequired ? (
        <StatusBox variant="warning">
          Adviser approval flagged by governance — workflow remains in preview
          until sign-off is enabled
        </StatusBox>
      ) : null}
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
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

const detailRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '8px',
  alignItems: 'baseline',
  marginBottom: '12px',
  fontSize: '14px',
};

const detailLabel = {
  color: '#94a3b8',
};

const detailValue = {
  fontWeight: 600,
};
