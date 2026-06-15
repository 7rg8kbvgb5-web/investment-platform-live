export type DriftPosition = {
    code: string;
    name: string;
    currentWeight: number;
    targetWeight: number;
  };
  
  export type DriftResult = {
    code: string;
    name: string;
    currentWeight: number;
    targetWeight: number;
    driftPercentage: number;
    status: "within-range" | "monitor" | "action-required";
  };
  
  export function calculatePortfolioDrift(
    positions: DriftPosition[]
  ): DriftResult[] {
    return positions.map((position) => {
      const driftPercentage = Number(
        Math.abs(
          position.currentWeight - position.targetWeight
        ).toFixed(2)
      );
  
      return {
        code: position.code,
        name: position.name,
        currentWeight: position.currentWeight,
        targetWeight: position.targetWeight,
        driftPercentage,
        status:
          driftPercentage >= 3
            ? "action-required"
            : driftPercentage >= 1
            ? "monitor"
            : "within-range",
      };
    });
  }