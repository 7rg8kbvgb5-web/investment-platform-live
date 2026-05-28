import type {
  AllocationWithOverlay,
  StrategicAllocation,
} from '../../domain/types/allocation';

/** Neutral band: within ±0.5 percentage points of the model weight. */
const NEUTRAL_THRESHOLD_PP = 0.5;

export type ModelPortfolioPosition = 'overweight' | 'underweight' | 'neutral';

export type ModelPortfolioComparisonRow = {
  assetClass: string;
  simulatedWeight: number;
  modelWeight: number;
  difference: number;
  position: ModelPortfolioPosition;
};

export type CompareToModelPortfolioInput = {
  simulatedAllocations: AllocationWithOverlay[];
  modelAllocations: StrategicAllocation[];
};

function parseWeight(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolvePosition(difference: number): ModelPortfolioPosition {
  if (Math.abs(difference) <= NEUTRAL_THRESHOLD_PP) {
    return 'neutral';
  }

  return difference > 0 ? 'overweight' : 'underweight';
}

export function compareToModelPortfolio({
  simulatedAllocations,
  modelAllocations,
}: CompareToModelPortfolioInput): ModelPortfolioComparisonRow[] {
  const simulatedByAsset = new Map(
    simulatedAllocations.map((allocation) => [
      allocation.asset_class,
      allocation.final_weight,
    ])
  );

  const modelByAsset = new Map(
    modelAllocations.map((allocation) => [
      allocation.asset_class,
      parseWeight(allocation.target_weight),
    ])
  );

  const assetClasses = new Set([
    ...simulatedByAsset.keys(),
    ...modelByAsset.keys(),
  ]);

  const rows: ModelPortfolioComparisonRow[] = [];

  for (const assetClass of assetClasses) {
    const simulatedWeight = simulatedByAsset.get(assetClass) ?? 0;
    const modelWeight = modelByAsset.get(assetClass) ?? 0;
    const difference = simulatedWeight - modelWeight;

    rows.push({
      assetClass,
      simulatedWeight,
      modelWeight,
      difference,
      position: resolvePosition(difference),
    });
  }

  return rows.sort((a, b) => a.assetClass.localeCompare(b.assetClass));
}
