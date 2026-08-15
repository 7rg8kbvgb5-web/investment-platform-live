export type ClientHolding = {
    code: string;
    name: string;
    sector: string;
    currentWeight: number;
  };
  
  export type ModelHolding = {
    code: string;
    name: string;
    sector: string;
    targetWeight: number;
  };
  
  export type ClientPortfolioMappingResult = {
    code: string;
    name: string;
    sector: string;
    currentWeight: number;
    targetWeight: number;
    variance: number;
    status: "in-line" | "underweight" | "overweight" | "missing";
  };
  
  export function mapClientPortfolioToModel(
    clientHoldings: ClientHolding[],
    modelHoldings: ModelHolding[]
  ): ClientPortfolioMappingResult[] {
    return modelHoldings.map((modelHolding) => {
      const clientHolding = clientHoldings.find(
        (holding) => holding.code === modelHolding.code
      );
  
      const currentWeight = clientHolding?.currentWeight || 0;
      const variance = currentWeight - modelHolding.targetWeight;
  
      return {
        code: modelHolding.code,
        name: modelHolding.name,
        sector: modelHolding.sector,
        currentWeight,
        targetWeight: modelHolding.targetWeight,
        variance,
        status:
          currentWeight === 0
            ? "missing"
            : variance < -1
            ? "underweight"
            : variance > 1
            ? "overweight"
            : "in-line",
      };
    });
  }
