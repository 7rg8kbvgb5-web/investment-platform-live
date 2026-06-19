export interface SectorHealthScore {
    sector: string;
    earningsRevisionMomentum: number;
    earningsBreadth: number;
    relativeStrength: number;
    valuationOpportunity: number;
    houseViewOverlay: number;
    totalScore: number;
    recommendation:
      | "Strong Overweight"
      | "Overweight"
      | "Neutral"
      | "Underweight"
      | "Strong Underweight";
  }
  
  export function calculateSectorHealthScore(
    sector: string,
    earningsRevisionMomentum: number,
    earningsBreadth: number,
    relativeStrength: number,
    valuationOpportunity: number,
    houseViewOverlay: number
  ): SectorHealthScore {
    const totalScore =
      earningsRevisionMomentum * 0.4 +
      earningsBreadth * 0.2 +
      relativeStrength * 0.2 +
      valuationOpportunity * 0.1 +
      houseViewOverlay * 0.1;
  
    let recommendation: SectorHealthScore["recommendation"];
  
    if (totalScore >= 80) {
      recommendation = "Strong Overweight";
    } else if (totalScore >= 65) {
      recommendation = "Overweight";
    } else if (totalScore >= 45) {
      recommendation = "Neutral";
    } else if (totalScore >= 25) {
      recommendation = "Underweight";
    } else {
      recommendation = "Strong Underweight";
    }
  
    return {
      sector,
      earningsRevisionMomentum,
      earningsBreadth,
      relativeStrength,
      valuationOpportunity,
      houseViewOverlay,
      totalScore,
      recommendation,
    };
  }
  
  export const sectorHealthScores: SectorHealthScore[] = [
    calculateSectorHealthScore(
      "Financials",
      85,
      80,
      75,
      65,
      90
    ),
    calculateSectorHealthScore(
      "Materials",
      70,
      65,
      75,
      80,
      70
    ),
    calculateSectorHealthScore(
      "Industrials",
      75,
      70,
      72,
      65,
      75
    ),
    calculateSectorHealthScore(
      "Healthcare",
      35,
      40,
      45,
      60,
      50
    ),
  ];