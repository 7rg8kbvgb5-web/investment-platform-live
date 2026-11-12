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

export type EodhdBulkRow = {
  code: string;
  date: string;
  close: number;
  volume: number;
  type?: string;
  prev_close?: number;
  change?: number;
  ema_50?: number;
};

/**
 * End-of-day closes for every security on an exchange for one day
 * (latest day if no date). Needs a paid EODHD plan; the free plan refuses it.
 */
export async function getBulkEod(exchange: string, date?: string): Promise<EodhdBulkRow[]> {
  const params: Record<string, string> = { filter: 'extended' };
  if (date) params.date = date;
  return eodhdFetch<EodhdBulkRow[]>(`/eod-bulk-last-day/${exchange}`, params);
}

/**
 * Delayed real-time quote for a single ASX-listed ticker (e.g. "CBA.AU").
 * EODHD sends "NA" (or null) for fields it has no value for; those are
 * normalised here so callers only ever see real numbers. A quote with no
 * usable price is treated as a failure.
 */
export async function getQuote(eodhdTicker: string): Promise<EodhdQuote> {
  const raw = await eodhdFetch<Record<string, unknown>>(`/real-time/${eodhdTicker}`);
  const close = toNumber(raw.close) ?? toNumber(raw.previousClose);
  if (close === undefined || close <= 0) {
    throw new Error(`No current price from EODHD for ${eodhdTicker}`);
  }
  return {
    code: String(raw.code ?? eodhdTicker),
    close,
    change: toNumber(raw.change) ?? 0,
    change_p: toNumber(raw.change_p) ?? 0,
    volume: toNumber(raw.volume) ?? 0,
    timestamp: toNumber(raw.timestamp) ?? 0,
  };
}

function toNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export type EodhdDividend = {
  date: string;
  paymentDate?: string | null;
  value: number;
  currency?: string;
};

/**
 * Dividend / distribution history for a ticker from the given date
 * (YYYY-MM-DD). Included in the EOD Historical Data plan. Cached for a day:
 * payment patterns barely change.
 */
export async function getDividends(eodhdTicker: string, from: string): Promise<EodhdDividend[]> {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) throw new Error('EODHD_API_KEY is not configured.');
  const url = new URL(`${EODHD_BASE_URL}/div/${eodhdTicker}`);
  url.searchParams.set('api_token', apiKey);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('from', from);
  const response = await fetch(url.toString(), { next: { revalidate: 86_400 } });
  if (!response.ok) throw new Error(`EODHD request failed (${response.status}): /div/${eodhdTicker}`);
  const raw = (await response.json()) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: Record<string, unknown>) => ({
      date: String(r.date ?? ''),
      paymentDate: typeof r.paymentDate === 'string' ? r.paymentDate : null,
      value: toNumber(r.value) ?? 0,
      currency: typeof r.currency === 'string' ? r.currency : undefined,
    }))
    .filter((d) => d.date && d.value > 0);
}

/** Fundamentals snapshot for a single ASX-listed ticker (e.g. "CBA.AU"). */
export async function getFundamentals(eodhdTicker: string): Promise<EodhdFundamentals> {
  return eodhdFetch<EodhdFundamentals>(`/fundamentals/${eodhdTicker}`);
}
