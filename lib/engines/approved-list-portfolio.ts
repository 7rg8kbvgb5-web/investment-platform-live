import { buildApprovedList } from "./approved-list";

export function buildPortfolioCandidatesFromApprovedList() {
  return buildApprovedList()
    .filter((security) => security.approvedListStatus === "approved")
    .map((security) => ({
      id: security.id,
      code: security.code,
      name: security.name,
      sector: security.sector,
      role: security.approvedListCategory,
      convictionScore: security.convictionScore,
      houseView: security.houseView,
      recommendedForPortfolio:
        security.houseView === "positive" ||
        security.houseView === "strong-positive",
    }));
}