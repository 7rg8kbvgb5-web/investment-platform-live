import type {
  AllocationWithOverlay,
  StrategicAllocation,
  TacticalOverlay,
} from '../../domain/types/allocation';
import { applyTacticalOverlays } from './apply-tactical-overlays';

export type ResetToStrategicAllocationInput = {
  strategicAllocations: StrategicAllocation[];
  tacticalOverlays?: TacticalOverlay[];
};

export type ResetToStrategicAllocationMetadata = {
  resetApplied: boolean;
  overlaysRemoved: number;
  timestamp: string;
};

export type ResetToStrategicAllocationResult = {
  allocations: AllocationWithOverlay[];
  tacticalOverlays: TacticalOverlay[];
  metadata: ResetToStrategicAllocationMetadata;
};

function countActiveOverlays(overlays: TacticalOverlay[]): number {
  return overlays.filter((overlay) => overlay.status === 'Active').length;
}

export function resetToStrategicAllocation({
  strategicAllocations,
  tacticalOverlays = [],
}: ResetToStrategicAllocationInput): ResetToStrategicAllocationResult {
  const overlaysRemoved = countActiveOverlays(tacticalOverlays);

  return {
    allocations: applyTacticalOverlays(strategicAllocations, []),
    tacticalOverlays: [],
    metadata: {
      resetApplied: overlaysRemoved > 0,
      overlaysRemoved,
      timestamp: new Date().toISOString(),
    },
  };
}
