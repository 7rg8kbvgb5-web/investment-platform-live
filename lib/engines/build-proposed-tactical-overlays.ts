import type {
  ProposedOverlayDraft,
  TacticalOverlay,
} from '../../domain/types/allocation';

export function isProposedOverlayDraftComplete(
  draft: ProposedOverlayDraft
): boolean {
  const adjustment = Number(draft.proposedAdjustment);
  return (
    draft.assetClass.trim() !== '' &&
    draft.proposedAdjustment.trim() !== '' &&
    Number.isFinite(adjustment)
  );
}

export function buildProposedTacticalOverlays(
  currentOverlays: TacticalOverlay[],
  draft: ProposedOverlayDraft,
  riskProfileName: string
): TacticalOverlay[] {
  const assetClass = draft.assetClass.trim();
  const adjustment = Number(draft.proposedAdjustment);

  const proposed: TacticalOverlay = {
    id: 'proposed-simulation',
    risk_profile: riskProfileName,
    asset_class: assetClass,
    tactical_adjustment: adjustment,
    reason: draft.reason.trim() || null,
    status: 'Active',
    reviewDate: draft.reviewDate || undefined,
    expiryDate: draft.expiryDate || undefined,
  };

  const withoutMatching = currentOverlays.filter(
    (overlay) =>
      !(
        overlay.risk_profile === riskProfileName &&
        overlay.asset_class === assetClass
      )
  );

  return [...withoutMatching, proposed];
}
