import type { ProposedOverlayDraft } from './allocation';
import type { PortfolioGovernanceSummary } from './portfolio';

export type ScenarioStatus = 'draft' | 'reviewed' | 'approved';

/** Snapshot of simulation output stored on a scenario (domain-only shape). */
export type ScenarioSimulationSummary = {
  simulationApplied: boolean;
  timestamp: string;
  allocationDifferenceCount: number;
  warningSummaryBefore: PortfolioGovernanceSummary;
  warningSummaryAfter: PortfolioGovernanceSummary;
};

export type Scenario = {
  scenarioName: string;
  riskProfile: string;
  proposedOverlayDraft?: ProposedOverlayDraft | null;
  simulationSummary?: ScenarioSimulationSummary | null;
  createdTimestamp: string;
  status: ScenarioStatus;
};

export function createDraftScenario({
  riskProfile,
  scenarioName = 'Current simulation',
  proposedOverlayDraft = null,
  simulationSummary = null,
}: {
  riskProfile: string;
  scenarioName?: string;
  proposedOverlayDraft?: ProposedOverlayDraft | null;
  simulationSummary?: ScenarioSimulationSummary | null;
}): Scenario {
  return {
    scenarioName,
    riskProfile,
    proposedOverlayDraft,
    simulationSummary,
    createdTimestamp: new Date().toISOString(),
    status: 'draft',
  };
}
