'use client';

import { useState } from 'react';
import type {
  ProposedOverlayDraft,
  StrategicAllocation,
  TacticalOverlay,
} from '../../domain/types/allocation';
import ModelPortfolioComparisonPanel from './ModelPortfolioComparisonPanel';
import PortfolioSimulationPanel from './PortfolioSimulationPanel';
import ProposalSummaryPanel from './ProposalSummaryPanel';
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
      <ModelPortfolioComparisonPanel
        strategicAllocations={strategicAllocations}
        tacticalOverlays={tacticalOverlays}
        riskProfileName={riskProfileName}
        proposedDraft={proposedDraft}
      />
    </>
  );
}
