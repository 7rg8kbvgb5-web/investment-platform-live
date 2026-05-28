import type { ApprovalWorkflow } from './approval';
import type { Scenario } from './scenario';

export type ChecklistItemStatus = 'pending' | 'complete' | 'blocked';

export type ImplementationChecklistItem = {
  id: string;
  label: string;
  status: ChecklistItemStatus;
  note: string | null;
};

export type ImplementationChecklist = {
  scenarioName: string;
  items: ImplementationChecklistItem[];
};

const CHECKLIST_STEP_DEFINITIONS: ReadonlyArray<{
  id: string;
  label: string;
}> = [
  { id: 'review-simulation', label: 'Review simulation output' },
  {
    id: 'review-guardrails',
    label: 'Review guardrails and approval requirements',
  },
  { id: 'confirm-proposal', label: 'Confirm proposal summary' },
  {
    id: 'confirm-model-comparison',
    label: 'Confirm model portfolio comparison',
  },
  { id: 'adviser-approval', label: 'Adviser approval completed' },
  {
    id: 'implementation-instructions',
    label: 'Implementation instructions prepared',
  },
];

export function createImplementationChecklist(
  workflow: ApprovalWorkflow,
  scenario?: Scenario | null
): ImplementationChecklist {
  const simulationReady =
    scenario?.simulationSummary?.simulationApplied === true;
  const { status, approvalRequired } = workflow;
  const rejected = status === 'rejected';
  const approved = status === 'approved';
  const reviewedOrBeyond =
    status === 'reviewed' || status === 'approved';

  const itemStatuses: Record<string, ChecklistItemStatus> = {
    'review-simulation': simulationReady ? 'complete' : 'pending',
    'review-guardrails': rejected
      ? 'blocked'
      : simulationReady
        ? reviewedOrBeyond
          ? 'complete'
          : 'pending'
        : 'pending',
    'confirm-proposal': rejected
      ? 'blocked'
      : approved
        ? 'complete'
        : reviewedOrBeyond && simulationReady
          ? 'complete'
          : 'pending',
    'confirm-model-comparison': rejected
      ? 'blocked'
      : approved
        ? 'complete'
        : reviewedOrBeyond && simulationReady
          ? 'complete'
          : 'pending',
    'adviser-approval': rejected
      ? 'blocked'
      : approved
        ? 'complete'
        : 'pending',
    'implementation-instructions': rejected
      ? 'blocked'
      : approved
        ? 'complete'
        : 'pending',
  };

  const itemNotes: Record<string, string | null> = {
    'review-simulation': simulationReady
      ? 'Simulation output available for review'
      : 'Run a simulation to populate this step',
    'review-guardrails':
      rejected
        ? 'Workflow rejected — guardrail review blocked'
        : approvalRequired
          ? 'Adviser approval required per guardrails'
          : 'No approval flag from current guardrails',
    'confirm-proposal': null,
    'confirm-model-comparison': null,
    'adviser-approval':
      rejected
        ? 'Scenario was rejected'
        : approvalRequired && !approved
          ? 'Awaiting adviser sign-off'
          : null,
    'implementation-instructions': approved
      ? 'Ready for implementation prep (placeholder)'
      : null,
  };

  const items: ImplementationChecklistItem[] =
    CHECKLIST_STEP_DEFINITIONS.map((step) => ({
      id: step.id,
      label: step.label,
      status: itemStatuses[step.id] ?? 'pending',
      note: itemNotes[step.id] ?? null,
    }));

  return {
    scenarioName: workflow.scenarioName,
    items,
  };
}
