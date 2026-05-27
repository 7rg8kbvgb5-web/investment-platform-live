import type {
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

export type AllocationWithOverlayFields = {
  tactical_adjustment: number;
  final_weight: number;
  overlay_reason: string | null;
};

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
