export type ClientHolding = {
    ticker: string;
    name: string;
    sector: string;
    currentWeight: number;
  };
  
  export type ModelHolding = {
    ticker: string;
    name: string;
    sector: string;
    targetWeight: number;
  };
  
  export type ClientPortfolioGap = {
    id: string;
    type: "overweight" | "underweight" | "missing-holding" | "non-model-holding";
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
    recommendation: string;
  };
  
  export type ClientPortfolioAnalysis = {
    clientName: string;
    modelName: string;
    alignmentScore: number;
    status: "aligned" | "minor-adjustments" | "rebalance-required";
    gaps: ClientPortfolioGap[];
  };
  
  const clientHoldings: ClientHolding[] = [
    {
      ticker: "CBA",
      name: "Commonwealth Bank",
      sector: "Financials",
      currentWeight: 14,
    },
    {
      ticker: "NAB",
      name: "National Australia Bank",
      sector: "Financials",
      currentWeight: 10,
    },
    {
      ticker: "BHP",
      name: "BHP Group",
      sector: "Materials",
      currentWeight: 7,
    },
    {
      ticker: "WES",
      name: "Wesfarmers",
      sector: "Consumer Discretionary",
      currentWeight: 4,
    },
    {
      ticker: "WOW",
      name: "Woolworths",
      sector: "Consumer Staples",
      currentWeight: 6,
    },
  ];
  
  const modelHoldings: ModelHolding[] = [
    {
      ticker: "MQG",
      name: "Macquarie Group",
      sector: "Financials",
      targetWeight: 7,
    },
    {
      ticker: "BHP",
      name: "BHP Group",
      sector: "Materials",
      targetWeight: 8,
    },
    {
      ticker: "NST",
      name: "Northern Star",
      sector: "Materials",
      targetWeight: 3.5,
    },
    {
      ticker: "CSL",
      name: "CSL",
      sector: "Healthcare",
      targetWeight: 5,
    },
    {
      ticker: "WES",
      name: "Wesfarmers",
      sector: "Consumer Discretionary",
      targetWeight: 5,
    },
  ];
  
  const sectorTargets: Record<string, number> = {
    Financials: 18,
    Materials: 10,
    Healthcare: 8,
    "Consumer Discretionary": 6,
    "Consumer Staples": 4,
  };
  
  function getClientSectorWeight(sector: string) {
    return clientHoldings
      .filter((holding) => holding.sector === sector)
      .reduce((total, holding) => total + holding.currentWeight, 0);
  }
  
  function getModelSectorWeight(sector: string) {
    return modelHoldings
      .filter((holding) => holding.sector === sector)
      .reduce((total, holding) => total + holding.targetWeight, 0);
  }
  
  function getSeverity(variance: number): "low" | "medium" | "high" {
    const absoluteVariance = Math.abs(variance);
  
    if (absoluteVariance >= 8) return "high";
    if (absoluteVariance >= 4) return "medium";
    return "low";
  }
  
  function calculateAlignmentScore(gaps: ClientPortfolioGap[]) {
    const penalty = gaps.reduce((total, gap) => {
      if (gap.severity === "high") return total + 12;
      if (gap.severity === "medium") return total + 7;
      return total + 3;
    }, 0);
  
    return Math.max(0, 100 - penalty);
  }
  
  function buildClientPortfolioGaps(): ClientPortfolioGap[] {
    const gaps: ClientPortfolioGap[] = [];
  
    Object.keys(sectorTargets).forEach((sector) => {
      const clientWeight = getClientSectorWeight(sector);
      const modelWeight = getModelSectorWeight(sector);
      const variance = clientWeight - modelWeight;
  
      if (Math.abs(variance) >= 3) {
        gaps.push({
          id: `${sector.toLowerCase().replaceAll(" ", "-")}-sector-gap`,
          type: variance > 0 ? "overweight" : "underweight",
          severity: getSeverity(variance),
          title:
            variance > 0
              ? `${sector} overweight`
              : `${sector} underweight`,
          description: `${sector} is currently ${clientWeight}% versus model weight of ${modelWeight}%.`,
          recommendation:
            variance > 0
              ? `Reduce ${sector} exposure by approximately ${Math.abs(
                  variance
                )}%.`
              : `Increase ${sector} exposure by approximately ${Math.abs(
                  variance
                )}%.`,
        });
      }
    });
  
    modelHoldings.forEach((modelHolding) => {
      const clientHolding = clientHoldings.find(
        (holding) => holding.ticker === modelHolding.ticker
      );
  
      if (!clientHolding) {
        gaps.push({
          id: `${modelHolding.ticker.toLowerCase()}-missing`,
          type: "missing-holding",
          severity: "medium",
          title: `${modelHolding.ticker} missing from client portfolio`,
          description: `${modelHolding.name} is included in the approved model at ${modelHolding.targetWeight}% but is not currently held by the client.`,
          recommendation: `Consider adding ${modelHolding.ticker} to move the portfolio closer to the approved model.`,
        });
      }
    });
  
    clientHoldings.forEach((clientHolding) => {
      const modelHolding = modelHoldings.find(
        (holding) => holding.ticker === clientHolding.ticker
      );
  
      if (!modelHolding) {
        gaps.push({
          id: `${clientHolding.ticker.toLowerCase()}-non-model`,
          type: "non-model-holding",
          severity: "medium",
          title: `${clientHolding.ticker} is not in the approved model`,
          description: `${clientHolding.name} is currently held by the client but is not part of the approved model portfolio.`,
          recommendation: `Review whether ${clientHolding.ticker} should be retained as an exception or replaced with an approved model holding.`,
        });
      }
    });
  
    return gaps;
  }
  
  export function analyseClientPortfolio(): ClientPortfolioAnalysis {
    const gaps = buildClientPortfolioGaps();
    const alignmentScore = calculateAlignmentScore(gaps);
  
    return {
      clientName: "Example Client Portfolio",
      modelName: "Core Australian Equity Model",
      alignmentScore,
      status:
        alignmentScore >= 90
          ? "aligned"
          : alignmentScore >= 75
          ? "minor-adjustments"
          : "rebalance-required",
      gaps,
    };
  }