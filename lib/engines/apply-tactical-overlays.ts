import type {
  AllocationWithOverlay,
  StrategicAllocation,
  TacticalOverlay,
} from '../../domain/types/allocation';

function findActiveOverlay(
  allocation: StrategicAllocation,
  overlays: TacticalOverlay[]
): TacticalOverlay | undefined {
  return overlays.find(
    (overlay) =>
      overlay.risk_profile === allocation.risk_profile &&
      overlay.asset_class === allocation.asset_class &&
      overlay.status === 'Active'
  );
}

type AllocationWithOverlayFields = Pick<
  AllocationWithOverlay,
  'tactical_adjustment' | 'final_weight' | 'overlay_reason'
>;

export function applyTacticalOverlays<T extends StrategicAllocation>(
  allocations: T[],
  overlays: TacticalOverlay[]
): (T & AllocationWithOverlayFields)[] {
  return allocations.map((allocation) => {
    const overlay = findActiveOverlay(allocation, overlays);
    const tacticalAdjustment = Number(overlay?.tactical_adjustment || 0);

    return {
      ...allocation,
      tactical_adjustment: tacticalAdjustment,
      final_weight: Number(allocation.target_weight) + tacticalAdjustment,
      overlay_reason: overlay?.reason || null,
    };
  });
}
