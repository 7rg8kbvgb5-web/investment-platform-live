import type { PortfolioGovernanceSummary } from './portfolio';
import type { Scenario } from './scenario';

export type ApprovalWorkflowStatus =
  | 'draft'
  | 'reviewed'
  | 'approved'
  | 'rejected';

export type ApprovalWorkflow = {
  scenarioName: string;
  status: ApprovalWorkflowStatus;
  approvalRequired: boolean;
  reviewer: string | null;
  approvalNotes: string | null;
  timestamp: string | null;
};

export function createApprovalWorkflowFromScenario(
  scenario: Scenario,
  governanceAfter?: PortfolioGovernanceSummary | null
): ApprovalWorkflow {
  const approvalRequired =
    governanceAfter?.approvalRequired ??
    scenario.simulationSummary?.warningSummaryAfter.approvalRequired ??
    false;

  const scenarioStatus = scenario.status;
  const status: ApprovalWorkflowStatus =
    scenarioStatus === 'approved'
      ? 'approved'
      : scenarioStatus === 'reviewed'
        ? 'reviewed'
        : 'draft';

  return {
    scenarioName: scenario.scenarioName,
    status,
    approvalRequired,
    reviewer: null,
    approvalNotes: null,
    timestamp: scenario.simulationSummary?.timestamp ?? null,
  };
}
