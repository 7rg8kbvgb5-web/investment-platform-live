import { buildPortfolioCandidatesFromApprovedList } from "./approved-list-portfolio";

export function buildChampionChallengerPortfolio() {
  const candidates = buildPortfolioCandidatesFromApprovedList().filter(
    (security) => security.recommendedForPortfolio
  );

  return candidates.map((security) => ({
    id: security.id,
    code: security.code,
    name: security.name,
    sector: security.sector,
    role: security.role,
    targetWeight:
      security.role === "champion"
        ? 70
        : security.role === "challenger"
        ? 30
        : 0,
    convictionScore: security.convictionScore,
    houseView: security.houseView,
  }));
}