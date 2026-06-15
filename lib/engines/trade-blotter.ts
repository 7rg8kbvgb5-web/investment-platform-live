import type { RebalanceRecommendation } from "./rebalance-recommendations";

export type TradeInstruction = {
  code: string;
  name: string;
  side: "BUY" | "SELL" | "HOLD";
  weightChange: number;
  priority: "high" | "medium" | "low";
  rationale: string;
};

export function buildTradeBlotter(
  recommendations: RebalanceRecommendation[]
): TradeInstruction[] {
  return recommendations.map((recommendation) => {
    const absoluteChange = Math.abs(recommendation.weightChange);

    return {
      code: recommendation.code,
      name: recommendation.name,
      side:
        recommendation.action === "buy"
          ? "BUY"
          : recommendation.action === "sell"
          ? "SELL"
          : "HOLD",
      weightChange: recommendation.weightChange,
      priority:
        absoluteChange >= 3
          ? "high"
          : absoluteChange >= 1
          ? "medium"
          : "low",
      rationale:
        recommendation.action === "hold"
          ? "Position is within acceptable tolerance of the model portfolio."
          : `${recommendation.action.toUpperCase()} ${absoluteChange}% to move holding closer to model portfolio target.`,
    };
  });
}