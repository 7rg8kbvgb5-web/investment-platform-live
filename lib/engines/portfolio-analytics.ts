import { ASSET_CLASSES } from './model-portfolio-core';
import { dedupeHoldings, isQuotableCode } from './market-data';
import { getHistoricalEod, toEodhdTicker, isEodhdConfigured } from '../eodhd-client';
import {
  dailyReturns,
  annualizedReturn,
  annualizedVolatility,
  sharpeRatio,
  buildCorrelationMatrix,
  averagePairwiseCorrelation,
} from './portfolio-statistics';

export type HoldingRiskProfile = {
  code: string;
  name: string;
  assetClass: string;
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpeRatio: number;
};

export type PortfolioAnalytics = {
  connected: boolean;
  holdings: HoldingRiskProfile[];
  holdingCorrelation: { codes: string[]; matrix: number[][] };
  assetClassCorrelation: { codes: string[]; matrix: number[][] };
  overallDiversification: number;
  assetClassDiversification: Record<string, number>;
};

/** Deterministic PRNG (mulberry32) so mock series are stable across renders rather than jittering on every request. */
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCode(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

const ASSET_CLASS_FACTOR_SEED = 1;
const COMMON_FACTOR_SEED = 2;
const TRADING_DAYS = 252;

/**
 * Illustrative daily returns built from a simple factor model: a common
 * market factor, an asset-class factor, and idiosyncratic noise. This
 * isn't real data - it exists so the correlation/risk visuals have a
 * plausible, clearly-labelled shape to show before EODHD is connected.
 * Same asset class => higher correlation; growth vs defensive => lower.
 */
function mockReturns(code: string, assetClass: string, defensiveOrGrowth: 'Growth' | 'Defensive'): number[] {
  const common = seededRandom(COMMON_FACTOR_SEED);
  const commonSeries = Array.from({ length: TRADING_DAYS }, () => (common() - 0.5) * 0.012);

  const classFactor = seededRandom(hashCode(assetClass) ^ ASSET_CLASS_FACTOR_SEED);
  const classSeries = Array.from({ length: TRADING_DAYS }, () => (classFactor() - 0.5) * 0.01);

  const idio = seededRandom(hashCode(code));
  const commonBeta = defensiveOrGrowth === 'Growth' ? 0.8 : 0.25;
  const classBeta = 0.6;
  const idioVol = defensiveOrGrowth === 'Growth' ? 0.009 : 0.003;
  const drift = defensiveOrGrowth === 'Growth' ? 0.0004 : 0.00015;

  return commonSeries.map((c, i) => drift + commonBeta * c + classBeta * classSeries[i] + (idio() - 0.5) * idioVol);
}

async function realReturns(code: string): Promise<number[] | null> {
  try {
    const to = new Date().toISOString().slice(0, 10);
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 1);
    const from = fromDate.toISOString().slice(0, 10);

    const bars = await getHistoricalEod(toEodhdTicker(code), from, to);
    const closes = bars.map((b) => b.adjusted_close ?? b.close);
    return dailyReturns(closes);
  } catch {
    return null;
  }
}

export async function getPortfolioAnalytics(): Promise<PortfolioAnalytics> {
  const allHoldings = await dedupeHoldings();
  const holdings = allHoldings.filter((h) => isQuotableCode(h.code));
  const connected = isEodhdConfigured();

  const returnsByCode: Record<string, number[]> = {};
  const holdingProfiles: HoldingRiskProfile[] = [];

  for (const holding of holdings) {
    const assetClassType =
      ASSET_CLASSES.find((ac) => ac.name === holding.sector)?.type ?? 'Growth';

    let returns: number[] | null = null;
    if (connected) {
      returns = await realReturns(holding.code);
    }
    if (!returns) {
      returns = mockReturns(holding.code, holding.sector ?? 'Australian Equities', assetClassType);
    }

    returnsByCode[holding.code] = returns;
    holdingProfiles.push({
      code: holding.code,
      name: holding.name,
      assetClass: holding.sector ?? 'Unclassified',
      annualizedReturn: annualizedReturn(returns),
      annualizedVolatility: annualizedVolatility(returns),
      sharpeRatio: sharpeRatio(returns),
    });
  }

  const holdingCorrelation = buildCorrelationMatrix(returnsByCode);

  // Asset-class level series: equal-weighted average of member holdings' returns.
  const assetClassNames = Array.from(new Set(holdings.map((h) => h.sector ?? 'Unclassified')));
  const assetClassReturns: Record<string, number[]> = {};
  for (const assetClassName of assetClassNames) {
    const members = holdings.filter((h) => (h.sector ?? 'Unclassified') === assetClassName);
    const length = Math.min(...members.map((m) => returnsByCode[m.code]?.length ?? TRADING_DAYS));
    const series: number[] = [];
    for (let i = 0; i < length; i++) {
      const dayValues = members.map((m) => returnsByCode[m.code][i]);
      series.push(dayValues.reduce((s, v) => s + v, 0) / dayValues.length);
    }
    assetClassReturns[assetClassName] = series;
  }
  const assetClassCorrelation = buildCorrelationMatrix(assetClassReturns);

  const assetClassDiversification: Record<string, number> = {};
  for (const assetClassName of assetClassNames) {
    const members = holdings.filter((h) => (h.sector ?? 'Unclassified') === assetClassName);
    const codes = members.map((m) => m.code);
    const subMatrix = codes.map((rowCode) =>
      codes.map((colCode) => {
        const rowIdx = holdingCorrelation.codes.indexOf(rowCode);
        const colIdx = holdingCorrelation.codes.indexOf(colCode);
        return holdingCorrelation.matrix[rowIdx][colIdx];
      })
    );
    assetClassDiversification[assetClassName] = averagePairwiseCorrelation(subMatrix);
  }

  return {
    connected,
    holdings: holdingProfiles,
    holdingCorrelation,
    assetClassCorrelation,
    overallDiversification: averagePairwiseCorrelation(holdingCorrelation.matrix),
    assetClassDiversification,
  };
}
