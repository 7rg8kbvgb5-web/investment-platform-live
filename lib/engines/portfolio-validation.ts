export type PortfolioValidationStatus = "pass" | "warning" | "fail";

export type PortfolioValidationCategory =
  | "diversification"
  | "sector-alignment"
  | "champion-challenger"
  | "house-view"
  | "risk-control";

export type PortfolioHolding = {
  ticker: string;
  name: string;
  sector: string;
  weight: number;
  role: "champion" | "challenger" | "single-stock-sector";
  houseView: "strong-positive" | "positive" | "neutral" | "negative";
};

export type PortfolioValidationIssue = {
  id: string;
  category: PortfolioValidationCategory;
  severity: PortfolioValidationStatus;
  title: string;
  description: string;
  recommendation: string;
};

export type PortfolioValidationScore = {
  category: PortfolioValidationCategory;
  label: string;
  score: number;
  maxScore: number;
  status: PortfolioValidationStatus;
};

export type PortfolioValidationResult = {
  portfolioName: string;
  overallScore: number;
  status: PortfolioValidationStatus;
  scores: PortfolioValidationScore[];
  issues: PortfolioValidationIssue[];
  summary: string;
};

const portfolioHoldings: PortfolioHolding[] = [
  {
    ticker: "BHP",
    name: "BHP Group",
    sector: "Materials",
    weight: 8,
    role: "champion",
    houseView: "positive",
  },
  {
    ticker: "NST",
    name: "Northern Star",
    sector: "Materials",
    weight: 3.5,
    role: "challenger",
    houseView: "positive",
  },
  {
    ticker: "MQG",
    name: "Macquarie Group",
    sector: "Financials",
    weight: 7,
    role: "champion",
    houseView: "positive",
  },
  {
    ticker: "CSL",
    name: "CSL",
    sector: "Healthcare",
    weight: 5,
    role: "champion",
    houseView: "neutral",
  },
  {
    ticker: "WES",
    name: "Wesfarmers",
    sector: "Consumer Discretionary",
    weight: 5,
    role: "champion",
    houseView: "positive",
  },
];

const sectorTargets: Record<string, number> = {
  Materials: 10,
  Financials: 18,
  Healthcare: 8,
  "Consumer Discretionary": 6,
};

function getValidationStatus(score: number): PortfolioValidationStatus {
  if (score >= 85) return "pass";
  if (score >= 70) return "warning";
  return "fail";
}

function calculateDiversificationScore(holdings: PortfolioHolding[]) {
  const maxHoldingWeight = Math.max(...holdings.map((holding) => holding.weight));
  const holdingCount = holdings.length;

  let score = 25;

  if (maxHoldingWeight > 10) score -= 8;
  if (maxHoldingWeight > 15) score -= 10;
  if (holdingCount < 8) score -= 6;
  if (holdingCount < 5) score -= 6;

  return Math.max(0, score);
}

function calculateSectorAlignmentScore(holdings: PortfolioHolding[]) {
  let score = 25;

  Object.entries(sectorTargets).forEach(([sector, targetWeight]) => {
    const actualWeight = holdings
      .filter((holding) => holding.sector === sector)
      .reduce((total, holding) => total + holding.weight, 0);

    const variance = Math.abs(actualWeight - targetWeight);

    if (variance > 5) score -= 4;
    if (variance > 10) score -= 6;
  });

  return Math.max(0, score);
}

function calculateChampionChallengerScore(holdings: PortfolioHolding[]) {
  let score = 25;

  const sectors = Array.from(new Set(holdings.map((holding) => holding.sector)));

  sectors.forEach((sector) => {
    const sectorHoldings = holdings.filter((holding) => holding.sector === sector);
    const hasChampion = sectorHoldings.some((holding) => holding.role === "champion");
    const hasChallenger = sectorHoldings.some(
      (holding) => holding.role === "challenger"
    );

    if (!hasChampion) score -= 6;

    if (sectorHoldings.length > 1 && !hasChallenger) {
      score -= 4;
    }
  });

  return Math.max(0, score);
}

function calculateHouseViewScore(holdings: PortfolioHolding[]) {
  let score = 25;

  holdings.forEach((holding) => {
    if (holding.houseView === "negative") score -= 8;
    if (holding.houseView === "neutral" && holding.weight > 6) score -= 4;
    if (holding.houseView === "positive" && holding.weight < 2) score -= 2;
  });

  return Math.max(0, score);
}

function buildValidationIssues(
  holdings: PortfolioHolding[]
): PortfolioValidationIssue[] {
  const issues: PortfolioValidationIssue[] = [];

  const maxHolding = holdings.reduce((largest, holding) =>
    holding.weight > largest.weight ? holding : largest
  );

  if (maxHolding.weight > 10) {
    issues.push({
      id: "single-stock-concentration",
      category: "diversification",
      severity: "warning",
      title: "Single-stock concentration approaching limit",
      description: `${maxHolding.ticker} is currently ${maxHolding.weight}% of the model portfolio.`,
      recommendation:
        "Review whether this position size is justified by conviction, liquidity, and current house view.",
    });
  }

  Object.entries(sectorTargets).forEach(([sector, targetWeight]) => {
    const actualWeight = holdings
      .filter((holding) => holding.sector === sector)
      .reduce((total, holding) => total + holding.weight, 0);

    const variance = actualWeight - targetWeight;

    if (Math.abs(variance) > 3) {
      issues.push({
        id: `${sector.toLowerCase().replaceAll(" ", "-")}-sector-variance`,
        category: "sector-alignment",
        severity: Math.abs(variance) > 6 ? "fail" : "warning",
        title:
          variance > 0
            ? `${sector} above target allocation`
            : `${sector} below target allocation`,
        description: `${sector} is currently ${actualWeight}% versus a target of ${targetWeight}%.`,
        recommendation:
          variance > 0
            ? "Consider trimming exposure unless the overweight is supported by the current house view."
            : "Consider adding exposure through the approved champion or challenger security.",
      });
    }
  });

  const sectors = Array.from(new Set(holdings.map((holding) => holding.sector)));

  sectors.forEach((sector) => {
    const sectorHoldings = holdings.filter((holding) => holding.sector === sector);
    const hasChampion = sectorHoldings.some((holding) => holding.role === "champion");
    const hasChallenger = sectorHoldings.some(
      (holding) => holding.role === "challenger"
    );

    if (sectorHoldings.length > 1 && !hasChallenger) {
      issues.push({
        id: `${sector.toLowerCase().replaceAll(" ", "-")}-missing-challenger`,
        category: "champion-challenger",
        severity: "warning",
        title: `${sector} challenger missing`,
        description: `${sector} has more than one holding but does not currently include a challenger allocation.`,
        recommendation:
          "Review approved securities and add a challenger where conviction is sufficient.",
      });
    }

    if (!hasChampion) {
      issues.push({
        id: `${sector.toLowerCase().replaceAll(" ", "-")}-missing-champion`,
        category: "champion-challenger",
        severity: "fail",
        title: `${sector} champion missing`,
        description: `${sector} does not currently include a champion security.`,
        recommendation:
          "Assign a champion security before this model portfolio is approved.",
      });
    }
  });

  holdings.forEach((holding) => {
    if (holding.houseView === "negative") {
      issues.push({
        id: `${holding.ticker.toLowerCase()}-negative-house-view`,
        category: "house-view",
        severity: "fail",
        title: `${holding.ticker} has a negative house view`,
        description: `${holding.name} remains in the model despite a negative house view.`,
        recommendation:
          "Remove the holding or seek investment committee approval for an exception.",
      });
    }
  });

  return issues;
}

export function validatePortfolioConstruction(): PortfolioValidationResult {
  const diversificationScore = calculateDiversificationScore(portfolioHoldings);
  const sectorAlignmentScore = calculateSectorAlignmentScore(portfolioHoldings);
  const championChallengerScore =
    calculateChampionChallengerScore(portfolioHoldings);
  const houseViewScore = calculateHouseViewScore(portfolioHoldings);

  const overallScore =
    diversificationScore +
    sectorAlignmentScore +
    championChallengerScore +
    houseViewScore;

  const issues = buildValidationIssues(portfolioHoldings);

  const status: PortfolioValidationStatus =
    issues.some((issue) => issue.severity === "fail")
      ? "fail"
      : getValidationStatus(overallScore);

  return {
    portfolioName: "Core Australian Equity Model",
    overallScore,
    status,
    scores: [
      {
        category: "diversification",
        label: "Diversification",
        score: diversificationScore,
        maxScore: 25,
        status: getValidationStatus(diversificationScore * 4),
      },
      {
        category: "sector-alignment",
        label: "Sector Alignment",
        score: sectorAlignmentScore,
        maxScore: 25,
        status: getValidationStatus(sectorAlignmentScore * 4),
      },
      {
        category: "champion-challenger",
        label: "Champion / Challenger",
        score: championChallengerScore,
        maxScore: 25,
        status: getValidationStatus(championChallengerScore * 4),
      },
      {
        category: "house-view",
        label: "House View Alignment",
        score: houseViewScore,
        maxScore: 25,
        status: getValidationStatus(houseViewScore * 4),
      },
    ],
    issues,
    summary:
      "Portfolio validation now checks diversification, sector alignment, champion/challenger structure, and house view alignment against the approved model framework.",
  };
}