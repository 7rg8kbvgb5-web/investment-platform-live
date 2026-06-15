export type PortfolioPosition = {
    code: string;
    name: string;
    currentWeight: number;
    targetWeight: number;
  };
  
  export type RebalanceRecommendation = {
    code: string;
    name: string;
    action: "buy" | "sell" | "hold";
    weightChange: number;
  };
  
  export function buildRebalanceRecommendations(
    positions: PortfolioPosition[]
  ): RebalanceRecommendation[] {
    return positions.map((position) => {
      const difference =
        position.targetWeight - position.currentWeight;
  
      return {
        code: position.code,
        name: position.name,
        action:
          difference > 0.5
            ? "buy"
            : difference < -0.5
            ? "sell"
            : "hold",
        weightChange: Number(difference.toFixed(2)),
      };
    });
  }