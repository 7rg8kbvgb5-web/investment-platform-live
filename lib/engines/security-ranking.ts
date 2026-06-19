export interface SecurityRanking {
    code: string;
    name: string;
    sector: string;
    houseView: number;
    earningsMomentum: number;
    valuation: number;
    quality: number;
    relativeStrength: number;
    totalScore: number;
  }
  
  export function calculateSecurityRanking(
    code: string,
    name: string,
    sector: string,
    houseView: number,
    earningsMomentum: number,
    valuation: number,
    quality: number,
    relativeStrength: number
  ): SecurityRanking {
    const totalScore =
      houseView * 0.3 +
      earningsMomentum * 0.25 +
      valuation * 0.2 +
      quality * 0.15 +
      relativeStrength * 0.1;
  
    return {
      code,
      name,
      sector,
      houseView,
      earningsMomentum,
      valuation,
      quality,
      relativeStrength,
      totalScore,
    };
  }
  
  export const securityRankings: SecurityRanking[] = [
    calculateSecurityRanking(
      "MQG",
      "Macquarie Group",
      "Financials",
      90,
      85,
      75,
      90,
      80
    ),
  
    calculateSecurityRanking(
      "BHP",
      "BHP Group",
      "Materials",
      85,
      75,
      80,
      85,
      75
    ),
  
    calculateSecurityRanking(
      "NST",
      "Northern Star Resources",
      "Materials",
      80,
      78,
      72,
      82,
      76
    ),
  
    calculateSecurityRanking(
      "CSL",
      "CSL Limited",
      "Healthcare",
      55,
      45,
      50,
      85,
      45
    ),
  ];
  
  export const rankedSecurityRankings = [...securityRankings].sort(
    (a, b) => b.totalScore - a.totalScore
  );