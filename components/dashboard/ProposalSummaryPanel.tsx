import type {
  ProposedOverlayDraft,
  StrategicAllocation,
  TacticalOverlay,
} from '../../domain/types/allocation';
import { generateProposalSummary } from '../../lib/engines/generate-proposal-summary';
import {
  buildProposedTacticalOverlays,
  isProposedOverlayDraftComplete,
} from '../../lib/engines/build-proposed-tactical-overlays';
import { simulatePortfolioChanges } from '../../lib/engines/simulate-portfolio-changes';
import StatusBox from './StatusBox';

type ProposalSummaryPanelProps = {
  strategicAllocations: StrategicAllocation[];
  tacticalOverlays: TacticalOverlay[];
  riskProfileName: string;
  proposedDraft?: ProposedOverlayDraft | null;
};

export default function ProposalSummaryPanel({
  strategicAllocations,
  tacticalOverlays,
  riskProfileName,
  proposedDraft = null,
}: ProposalSummaryPanelProps) {
  const profileOverlays = tacticalOverlays.filter(
    (overlay) => overlay.risk_profile === riskProfileName
  );
  const hasActiveOverlays = profileOverlays.some(
    (overlay) => overlay.status === 'Active'
  );
  const hasProposedOverlay =
    proposedDraft !== null &&
    isProposedOverlayDraftComplete(proposedDraft);

  if (!hasProposedOverlay && !hasActiveOverlays) {
    return null;
  }

  const simulation = simulatePortfolioChanges({
    riskProfileName,
    strategicAllocations,
    currentTacticalOverlays: tacticalOverlays,
    proposedTacticalOverlays: hasProposedOverlay
      ? buildProposedTacticalOverlays(
          tacticalOverlays,
          proposedDraft!,
          riskProfileName
        )
      : undefined,
    resetToStrategic: !hasProposedOverlay && hasActiveOverlays,
  });

  const summary = generateProposalSummary(simulation);

  return (
    <div style={panel}>
      <h3 style={title}>Proposal Summary</h3>
      <StatusBox variant="neutral">
        Adviser-ready commentary from simulation — read-only, not saved
      </StatusBox>

      <section style={section}>
        <h4 style={sectionTitle}>Headline</h4>
        <p style={body}>{summary.headline}</p>
      </section>

      <section style={section}>
        <h4 style={sectionTitle}>Allocation changes</h4>
        <pre style={pre}>{summary.allocationChangesSummary}</pre>
      </section>

      <section style={section}>
        <h4 style={sectionTitle}>Growth / defensive impact</h4>
        <pre style={pre}>{summary.growthDefensiveImpactSummary}</pre>
      </section>

      <section style={section}>
        <h4 style={sectionTitle}>Governance</h4>
        <pre style={pre}>{summary.governanceSummary}</pre>
      </section>

      <section style={section}>
        <h4 style={sectionTitle}>Warnings & approval</h4>
        <p style={body}>{summary.warningsApprovalSummary}</p>
      </section>

      <section style={section}>
        <h4 style={sectionTitle}>Adviser notes</h4>
        <p style={placeholder}>{summary.adviserNotesPlaceholder}</p>
      </section>
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

const section = {
  marginBottom: '16px',
};

const sectionTitle = {
  margin: '0 0 8px 0',
  fontSize: '15px',
  fontWeight: 600,
};

const body = {
  margin: 0,
  fontSize: '14px',
  lineHeight: 1.6,
};

const pre = {
  margin: 0,
  fontSize: '14px',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap' as const,
  fontFamily: 'inherit',
  color: 'inherit',
};

const placeholder = {
  margin: 0,
  fontSize: '14px',
  lineHeight: 1.6,
  color: '#94a3b8',
  fontStyle: 'italic' as const,
};
