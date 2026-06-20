import { buildChampionChallengerPortfolio } from "./champion-challenger-portfolio";
import { buildSectorAllocations } from "./sector-allocation";

export function buildSectorConstruction() {
  const portfolio = buildChampionChallengerPortfolio();
  const sectorAllocations = buildSectorAllocations();

  const sectors = Array.from(
    new Set(portfolio.map((security) => security.sector))
  );

  return sectors.map((sector) => {
    const sectorSecurities = portfolio.filter(
      (security) => security.sector === sector
    );

    const sectorTargetWeight =
      sectorAllocations.find((allocation) => allocation.sector === sector)
        ?.adjustedWeight ?? 0;

    const champion = sectorSecurities.find(
      (security) => security.role === "champion"
    );

    const challenger = sectorSecurities.find(
      (security) => security.role === "challenger"
    );

    return {
      sector,
      sectorTargetWeight,
      securities: sectorSecurities.map((security) => ({
        ...security,
        sectorWeight:
          security.role === "champion" && challenger
            ? 70
            : security.role === "challenger"
              ? 30
              : security.role === "champion"
                ? 100
                : 0,
      })),
      hasChampion: Boolean(champion),
      hasChallenger: Boolean(challenger),
    };
  });
}