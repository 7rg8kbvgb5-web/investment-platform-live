import { rankedSecurityRankings } from "./security-ranking";

export function buildChampionChallengerPortfolio() {
  const groupedBySector = rankedSecurityRankings.reduce<
    Record<string, typeof rankedSecurityRankings>
  >((groups, security) => {
    if (!groups[security.sector]) {
      groups[security.sector] = [];
    }

    groups[security.sector].push(security);
    return groups;
  }, {});

  return Object.values(groupedBySector).flatMap((sectorSecurities) =>
    sectorSecurities.slice(0, 2).map((security, index) => ({
      id: `${security.sector}-${security.code}`,
      code: security.code,
      name: security.name,
      sector: security.sector,
      role: index === 0 ? "champion" : "challenger",
      targetWeight: index === 0 ? 70 : 30,
      rankingScore: security.totalScore,
      convictionScore: Math.round(security.totalScore / 20),
      houseView:
  security.houseView >= 80
    ? "Positive"
    : security.houseView >= 60
      ? "Neutral"
      : "Negative",
    }))
  );
}