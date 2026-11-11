import { fetchCoreSecurities } from './model-portfolio-core';
import type { ModelHolding } from './model-portfolios';
import {
  getQuote,
  getFundamentals,
  toEodhdTicker,
  isEodhdConfigured,
  type EodhdQuote,
  type EodhdFundamentals,
} from '../eodhd-client';

export type HoldingMarketData = {
  code: string;
  name: string;
  sector?: string;
  quotable: boolean;
  quote: EodhdQuote | null;
  fundamentals: EodhdFundamentals | null;
  error: string | null;
};

/**
 * A holding is quotable on EODHD if its code looks like a real ASX ticker
 * (short, all-caps, no spaces) rather than a placeholder for a direct
 * mandate, active fund, or cash - e.g. "CBA" is quotable, "Global Fund"
 * and "Direct Bonds" are not.
 */
export function isQuotableCode(code: string): boolean {
  return /^[A-Z]{2,5}$/.test(code);
}

/** One adviser model's holdings, one entry per code (the selected model unless one is passed). */
export async function dedupeHoldings(modelId?: string | null): Promise<ModelHolding[]> {
  const securities = await fetchCoreSecurities(modelId);
  const seen = new Map<string, ModelHolding>();
  for (const security of securities) {
    if (!seen.has(security.code)) {
      seen.set(security.code, {
        code: security.code,
        name: security.name,
        sector: security.assetClass,
        weight: security.inClassWeight,
        rationale: security.rationale,
        yield: security.yield ?? undefined,
      });
    }
  }
  return Array.from(seen.values());
}

/**
 * Batch price lookup for an arbitrary set of codes - used by the client
 * portfolio comparison to size trades in real units/dollars rather than
 * just percentage weights. Unlike getModelPortfolioMarketData this takes
 * whatever codes the caller has (client holdings + proposed buys), not
 * just the model portfolio universe, and skips fundamentals since only
 * price is needed for trade sizing.
 */
export async function getQuotesForCodes(
  codes: string[]
): Promise<Record<string, { price: number | null; error: string | null }>> {
  const uniqueCodes = Array.from(new Set(codes));
  const result: Record<string, { price: number | null; error: string | null }> = {};

  if (!isEodhdConfigured()) {
    for (const code of uniqueCodes) {
      result[code] = { price: null, error: 'EODHD_API_KEY not configured' };
    }
    return result;
  }

  await Promise.all(
    uniqueCodes.map(async (code) => {
      if (!isQuotableCode(code)) {
        result[code] = { price: null, error: 'Not a quotable listed security' };
        return;
      }
      try {
        const quote = await getQuote(toEodhdTicker(code));
        result[code] = { price: quote.close, error: null };
      } catch (error) {
        result[code] = {
          price: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  return result;
}

export async function getModelPortfolioMarketData(modelId?: string | null): Promise<HoldingMarketData[]> {
  const holdings = await dedupeHoldings(modelId);

  if (!isEodhdConfigured()) {
    return holdings.map((holding) => ({
      code: holding.code,
      name: holding.name,
      sector: holding.sector,
      quotable: isQuotableCode(holding.code),
      quote: null,
      fundamentals: null,
      error: 'EODHD_API_KEY not configured',
    }));
  }

  const results = await Promise.all(
    holdings.map(async (holding): Promise<HoldingMarketData> => {
      const quotable = isQuotableCode(holding.code);
      if (!quotable) {
        return {
          code: holding.code,
          name: holding.name,
          sector: holding.sector,
          quotable: false,
          quote: null,
          fundamentals: null,
          error: null,
        };
      }

      const ticker = toEodhdTicker(holding.code);
      // Fundamentals need a higher EODHD plan than prices - if they're
      // refused, keep the price rather than losing the whole row.
      const [quoteResult, fundamentalsResult] = await Promise.allSettled([
        getQuote(ticker),
        getFundamentals(ticker),
      ]);
      const quote = quoteResult.status === 'fulfilled' ? quoteResult.value : null;
      const fundamentals = fundamentalsResult.status === 'fulfilled' ? fundamentalsResult.value : null;
      return {
        code: holding.code,
        name: holding.name,
        sector: holding.sector,
        quotable: true,
        quote,
        fundamentals,
        error:
          quoteResult.status === 'rejected'
            ? quoteResult.reason instanceof Error
              ? quoteResult.reason.message
              : 'Unknown error'
            : null,
      };
    })
  );

  return results;
}
