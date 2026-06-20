import { sectorHealthScores } from "./sector-intelligence";

export interface SectorAllocation {
  sector: string;
  baseWeight: number;
  adjustmentMultiplier: number;
  adjustedWeight: number;
  recommendation: string;
  sectorHealthScore: number;
}

const baseSectorWeights: Record<string, number> = {
  Financials: 25,
  Materials: 20,
  Healthcare: 12,
  "Information Technology": 10,
  Industrials: 8,
  Energy: 7,
  "Consumer Discretionary": 6,
  "Consumer Staples": 5,
  "Communication Services": 4,
  "Real Estate": 2,
  Utilities: 1,
};

function getAdjustmentMultiplier(recommendation: string) {
  if (recommendation === "Strong Overweight") return 1.5;
  if (recommendation === "Overweight") return 1.25;
  if (recommendation === "Neutral") return 1;
  if (recommendation === "Underweight") return 0.75;
  if (recommendation === "Strong Underweight") return 0.5;

  return 1;
}

export function buildSectorAllocations(): SectorAllocation[] {
  const rawAllocations = sectorHealthScores.map((sector) => {
    const baseWeight = baseSectorWeights[sector.sector] ?? 0;
    const adjustmentMultiplier = getAdjustmentMultiplier(sector.recommendation);

    return {
      sector: sector.sector,
      baseWeight,
      adjustmentMultiplier,
      adjustedWeight: baseWeight * adjustmentMultiplier,
      recommendation: sector.recommendation,
      sectorHealthScore: sector.totalScore,
    };
  });

  const totalAdjustedWeight = rawAllocations.reduce(
    (total, sector) => total + sector.adjustedWeight,
    0
  );

  return rawAllocations.map((sector) => ({
    ...sector,
    adjustedWeight:
      totalAdjustedWeight === 0
        ? 0
        : Number(((sector.adjustedWeight / totalAdjustedWeight) * 100).toFixed(2)),
  }));
}