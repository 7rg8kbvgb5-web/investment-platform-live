const EODHD_BASE_URL = 'https://eodhd.com/api';

export function isEodhdConfigured(): boolean {
  return Boolean(process.env.EODHD_API_KEY);
}

export type EodhdQuote = {
  code: string;
  close: number;
  change: number;
  change_p: number;
  volume: number;
  timestamp: number;
};

export type EodhdFundamentals = {
  General?: {
    Code?: string;
    Name?: string;
    Sector?: string;
    Industry?: string;
  };
  Highlights?: {
    MarketCapitalization?: number;
    PERatio?: number;
    DividendYield?: number;
    EPS?: number;
    ProfitMargin?: number;
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
  };
};

/**
 * ASX tickers on EODHD use the CODE.AU suffix. Only pass tickers that are
 * genuinely listed securities - direct mandates, active funds and cash
 * have no quotable code and should never reach this function.
 */
export function toEodhdTicker(code: string): string {
  return `${code}.AU`;
}

async function eodhdFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) {
    throw new Error('EODHD_API_KEY is not configured.');
  }

  const url = new URL(`${EODHD_BASE_URL}${path}`);
  url.searchParams.set('api_token', apiKey);
  url.searchParams.set('fmt', 'json');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { next: { revalidate: 900 } });
  if (!response.ok) {
    throw new Error(`EODHD request failed (${response.status}): ${path}`);
  }

  return response.json() as Promise<T>;
}

export type EodhdEodBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
};

/**
 * Historical daily EOD bars for a ticker over the given date range
 * (YYYY-MM-DD). Used to derive returns, volatility and correlation -
 * none of that can be computed from a single quote.
 */
export async function getHistoricalEod(
  eodhdTicker: string,
  from: string,
  to: string
): Promise<EodhdEodBar[]> {
  return eodhdFetch<EodhdEodBar[]>(`/eod/${eodhdTicker}`, { from, to, period: 'd' });
}

/** Delayed real-time quote for a single ASX-listed ticker (e.g. "CBA.AU"). */
export async function getQuote(eodhdTicker: string): Promise<EodhdQuote> {
  return eodhdFetch<EodhdQuote>(`/real-time/${eodhdTicker}`);
}

/** Fundamentals snapshot for a single ASX-listed ticker (e.g. "CBA.AU"). */
export async function getFundamentals(eodhdTicker: string): Promise<EodhdFundamentals> {
  return eodhdFetch<EodhdFundamentals>(`/fundamentals/${eodhdTicker}`);
}
