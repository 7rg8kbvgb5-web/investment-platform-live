import { buildApprovedList } from "./approved-list";
import { sectorHealthScores } from "./sector-intelligence";

export function buildPortfolioCandidatesFromApprovedList() {
  return buildApprovedList()
    .filter((security) => security.approvedListStatus === "approved")
    .map((security) => {
      const sectorHealth = sectorHealthScores.find(
        (sector) => sector.sector === security.sector
      );

      return {
        id: security.id,
        code: security.code,
        name: security.name,
        sector: security.sector,
        role: security.approvedListCategory,
        convictionScore: security.convictionScore,
        houseView: security.houseView,
        sectorHealthScore: sectorHealth?.totalScore ?? 0,
        sectorRecommendation: sectorHealth?.recommendation ?? "Neutral",
        recommendedForPortfolio:
          sectorHealth?.recommendation === "Strong Overweight" ||
          sectorHealth?.recommendation === "Overweight",
      };
    });
}