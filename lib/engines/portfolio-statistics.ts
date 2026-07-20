/**
 * Pure statistics helpers for portfolio risk analytics. Everything here
 * operates on plain daily-return arrays so it works identically against
 * real EODHD history or illustrative mock series.
 */

export function dailyReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    const curr = closes[i];
    if (prev > 0) returns.push(curr / prev - 1);
  }
  return returns;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

const TRADING_DAYS_PER_YEAR = 252;

export function annualizedVolatility(returns: number[]): number {
  return stdDev(returns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

export function annualizedReturn(returns: number[]): number {
  return mean(returns) * TRADING_DAYS_PER_YEAR;
}

/** Sharpe ratio using a 4% risk-free rate (roughly the current AU cash/bill rate). */
export function sharpeRatio(returns: number[], riskFreeRate = 0.04): number {
  const vol = annualizedVolatility(returns);
  if (vol === 0) return 0;
  return (annualizedReturn(returns) - riskFreeRate) / vol;
}

/** Pearson correlation coefficient between two equal-length return series. */
export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const aSlice = a.slice(-n);
  const bSlice = b.slice(-n);
  const meanA = mean(aSlice);
  const meanB = mean(bSlice);

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = aSlice[i] - meanA;
    const db = bSlice[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return 0;
  return cov / denom;
}

export function buildCorrelationMatrix(
  returnsByCode: Record<string, number[]>
): { codes: string[]; matrix: number[][] } {
  const codes = Object.keys(returnsByCode);
  const matrix = codes.map((rowCode) =>
    codes.map((colCode) => {
      if (rowCode === colCode) return 1;
      return correlation(returnsByCode[rowCode], returnsByCode[colCode]);
    })
  );
  return { codes, matrix };
}

/** Average of all off-diagonal correlations - a simple diversification signal (lower is better spread). */
export function averagePairwiseCorrelation(matrix: number[][]): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix.length; j++) {
      if (i === j) continue;
      sum += matrix[i][j];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}
