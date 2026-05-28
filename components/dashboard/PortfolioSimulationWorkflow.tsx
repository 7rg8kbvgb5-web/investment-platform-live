'use client';

import { useMemo, useState } from 'react';
import type {
  ProposedOverlayDraft,
  StrategicAllocation,
  TacticalOverlay,
} from '../../domain/types/allocation';
import { createApprovalWorkflowFromScenario } from '../../domain/types/approval';
import { createImplementationChecklist } from '../../domain/types/implementation';
import {
  createDraftScenario,
  type ScenarioSimulationSummary,
} from '../../domain/types/scenario';
import { compareToModelPortfolio } from '../../lib/engines/compare-to-model-portfolio';
import {
  buildProposedTacticalOverlays,
  isProposedOverlayDraftComplete,
} from '../../lib/engines/build-proposed-tactical-overlays';
import { simulatePortfolioChanges } from '../../lib/engines/simulate-portfolio-changes';
import ApprovalWorkflowPanel from './ApprovalWorkflowPanel';
import ImplementationChecklistPanel from './ImplementationChecklistPanel';
import WorkflowSummaryPanel from './WorkflowSummaryPanel';
import ModelPortfolioComparisonPanel from './ModelPortfolioComparisonPanel';
import ModelPortfolioManagerPanel from './ModelPortfolioManagerPanel';
import PortfolioSimulationPanel from './PortfolioSimulationPanel';
import ProposalSummaryPanel from './ProposalSummaryPanel';
import ScenarioManagerPanel from './ScenarioManagerPanel';
import TacticalOverlayInputPanel from './TacticalOverlayInputPanel';

const EMPTY_DRAFT: ProposedOverlayDraft = {
  assetClass: '',
  proposedAdjustment: '',
  reason: '',
  reviewDate: '',
  expiryDate: '',
};

type PortfolioSimulationWorkflowProps = {
  strategicAllocations: StrategicAllocation[];
  tacticalOverlays: TacticalOverlay[];
  riskProfileName: string;
};

export default function PortfolioSimulationWorkflow({
  strategicAllocations,
  tacticalOverlays,
  riskProfileName,
}: PortfolioSimulationWorkflowProps) {
  const [proposedDraft, setProposedDraft] =
    useState<ProposedOverlayDraft>(EMPTY_DRAFT);

  const profileOverlays = useMemo(
    () =>
      tacticalOverlays.filter(
        (overlay) => overlay.risk_profile === riskProfileName
      ),
    [tacticalOverlays, riskProfileName]
  );

  const hasActiveOverlays = profileOverlays.some(
    (overlay) => overlay.status === 'Active'
  );

  const hasProposedOverlay = isProposedOverlayDraftComplete(proposedDraft);

  const workflowPreview = useMemo(() => {
    if (!hasProposedOverlay && !hasActiveOverlays) {
      return {
        simulationSummary: null as ScenarioSimulationSummary | null,
        modelComparisonState: 'Pending — add overlay or use active overlays',
        proposalGenerated: false,
      };
    }

    const simulation = simulatePortfolioChanges({
      riskProfileName,
      strategicAllocations,
      currentTacticalOverlays: tacticalOverlays,
      proposedTacticalOverlays: hasProposedOverlay
        ? buildProposedTacticalOverlays(
            tacticalOverlays,
            proposedDraft,
            riskProfileName
          )
        : undefined,
      resetToStrategic: !hasProposedOverlay && hasActiveOverlays,
    });

    const modelAllocations = strategicAllocations.filter(
      (allocation) => allocation.risk_profile === riskProfileName
    );
    const comparisonRows = compareToModelPortfolio({
      simulatedAllocations: simulation.simulatedAllocations,
      modelAllocations,
    });
    const nonNeutralCount = comparisonRows.filter(
      (row) => row.position !== 'neutral'
    ).length;

    const modelComparisonState =
      comparisonRows.length === 0
        ? 'Ready — no model rows'
        : nonNeutralCount > 0
          ? `Ready — ${nonNeutralCount} non-neutral position(s)`
          : 'Ready — all positions neutral';

    const simulationSummary: ScenarioSimulationSummary = {
      simulationApplied: simulation.metadata.simulationApplied,
      timestamp: simulation.metadata.timestamp,
      allocationDifferenceCount: simulation.allocationDifferences.length,
      warningSummaryBefore: simulation.warningSummaryBefore,
      warningSummaryAfter: simulation.warningSummaryAfter,
    };

    return {
      simulationSummary,
      modelComparisonState,
      proposalGenerated: simulation.metadata.simulationApplied,
    };
  }, [
    hasProposedOverlay,
    hasActiveOverlays,
    riskProfileName,
    strategicAllocations,
    tacticalOverlays,
    proposedDraft,
  ]);

  const { simulationSummary, modelComparisonState, proposalGenerated } =
    workflowPreview;

  const currentScenario = useMemo(() => {
    const scenario = createDraftScenario({
      riskProfile: riskProfileName,
      scenarioName: hasProposedOverlay
        ? `Proposed overlay — ${proposedDraft.assetClass.trim()}`
        : hasActiveOverlays
          ? 'Reset to strategic (simulation)'
          : 'Current simulation',
      proposedOverlayDraft: hasProposedOverlay ? proposedDraft : null,
      simulationSummary,
    });

    if (simulationSummary?.timestamp) {
      return { ...scenario, createdTimestamp: simulationSummary.timestamp };
    }

    return scenario;
  }, [
    riskProfileName,
    hasProposedOverlay,
    hasActiveOverlays,
    proposedDraft,
    simulationSummary,
  ]);

  const approvalWorkflow = useMemo(
    () =>
      createApprovalWorkflowFromScenario(
        currentScenario,
        simulationSummary?.warningSummaryAfter
      ),
    [currentScenario, simulationSummary]
  );

  const implementationChecklist = useMemo(
    () =>
      createImplementationChecklist(approvalWorkflow, currentScenario),
    [approvalWorkflow, currentScenario]
  );

  return (
    <>
      <TacticalOverlayInputPanel
        riskProfileName={riskProfileName}
        onDraftChange={setProposedDraft}
      />
      <PortfolioSimulationPanel
        strategicAllocations={strategicAllocations}
        tacticalOverlays={tacticalOverlays}
        riskProfileName={riskProfileName}
        proposedDraft={proposedDraft}
      />
      <ProposalSummaryPanel
        strategicAllocations={strategicAllocations}
        tacticalOverlays={tacticalOverlays}
        riskProfileName={riskProfileName}
        proposedDraft={proposedDraft}
      />
      <ModelPortfolioManagerPanel
        strategicAllocations={strategicAllocations}
        riskProfileName={riskProfileName}
      />
      <ModelPortfolioComparisonPanel
        strategicAllocations={strategicAllocations}
        tacticalOverlays={tacticalOverlays}
        riskProfileName={riskProfileName}
        proposedDraft={proposedDraft}
      />
      <ScenarioManagerPanel currentScenario={currentScenario} />
      <ApprovalWorkflowPanel workflow={approvalWorkflow} />
      <ImplementationChecklistPanel checklist={implementationChecklist} />
      <WorkflowSummaryPanel
        scenario={currentScenario}
        approvalWorkflow={approvalWorkflow}
        checklist={implementationChecklist}
        modelComparisonState={modelComparisonState}
        proposalGenerated={proposalGenerated}
      />
    </>
  );
}
