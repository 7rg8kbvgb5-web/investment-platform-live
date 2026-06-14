import { buildSectorConstruction } from "./sector-construction";

export type RiskProfileName =
  | "Conservative"
  | "Moderate"
  | "Balanced"
  | "Growth"
  | "High Growth";

export type RiskProfileSectorWeight = {
  riskProfile: RiskProfileName;
  sector: string;
  sectorTargetWeight: number;
};

export type RiskProfilePortfolioHolding = {
  riskProfile: RiskProfileName;
  sector: string;
  code: string;
  name: string;
  role: string;
  sectorWeight: number;
  sectorTargetWeight: number;
  portfolioWeight: number;
  convictionScore: number;
  houseView: string;
};

const DEFAULT_SECTOR_WEIGHTS: RiskProfileSectorWeight[] = [
  { riskProfile: "Conservative", sector: "Materials", sectorTargetWeight: 4 },
  { riskProfile: "Conservative", sector: "Financials", sectorTargetWeight: 4 },
  { riskProfile: "Conservative", sector: "Healthcare", sectorTargetWeight: 4 },

  { riskProfile: "Moderate", sector: "Materials", sectorTargetWeight: 6 },
  { riskProfile: "Moderate", sector: "Financials", sectorTargetWeight: 6 },
  { riskProfile: "Moderate", sector: "Healthcare", sectorTargetWeight: 6 },

  { riskProfile: "Balanced", sector: "Materials", sectorTargetWeight: 8 },
  { riskProfile: "Balanced", sector: "Financials", sectorTargetWeight: 8 },
  { riskProfile: "Balanced", sector: "Healthcare", sectorTargetWeight: 8 },

  { riskProfile: "Growth", sector: "Materials", sectorTargetWeight: 10 },
  { riskProfile: "Growth", sector: "Financials", sectorTargetWeight: 10 },
  { riskProfile: "Growth", sector: "Healthcare", sectorTargetWeight: 10 },

  { riskProfile: "High Growth", sector: "Materials", sectorTargetWeight: 12 },
  { riskProfile: "High Growth", sector: "Financials", sectorTargetWeight: 12 },
  { riskProfile: "High Growth", sector: "Healthcare", sectorTargetWeight: 12 },
];

export function buildRiskProfilePortfolio(
  riskProfile: RiskProfileName
): RiskProfilePortfolioHolding[] {
  const sectors = buildSectorConstruction();

  const weights = DEFAULT_SECTOR_WEIGHTS.filter(
    (weight) => weight.riskProfile === riskProfile
  );

  return sectors.flatMap((sector) => {
    const sectorTargetWeight =
      weights.find((weight) => weight.sector === sector.sector)
        ?.sectorTargetWeight ?? 0;

    return sector.securities.map((security) => ({
      riskProfile,
      sector: sector.sector,
      code: security.code,
      name: security.name,
      role: security.role,
      sectorWeight: security.sectorWeight,
      sectorTargetWeight,
      portfolioWeight: (sectorTargetWeight * security.sectorWeight) / 100,
      convictionScore: security.convictionScore,
      houseView: security.houseView,
    }));
  });
}