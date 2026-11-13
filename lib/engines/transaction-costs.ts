// Transaction costs for a client's proposal (migration 0036): either a flat
// dollar amount per trade, or a percentage of each trade's value with a
// minimum per trade - optionally plus GST. Applies to listed trades; bond
// trades keep their own spread-based estimate and unlisted funds carry none.

export type TransactionCostSettings = {
  mode: 'flat' | 'percent'
  /** $ per trade in flat mode. */
  flat: number
  /** % of each trade's value in percent mode (e.g. 1 for 1%). */
  percent: number
  /** Minimum $ per trade in percent mode. */
  minimum: number
  /** Add GST (10%) on top of the cost. */
  addGst: boolean
}

export const DEFAULT_TRANSACTION_COSTS: TransactionCostSettings = {
  mode: 'flat',
  flat: 25,
  percent: 1,
  minimum: 25,
  addGst: false,
}

const GST = 0.1

export function normaliseTransactionCosts(raw: Partial<TransactionCostSettings> | null | undefined): TransactionCostSettings {
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback)
  const d = DEFAULT_TRANSACTION_COSTS
  return {
    mode: raw?.mode === 'percent' ? 'percent' : 'flat',
    flat: num(raw?.flat, d.flat),
    percent: num(raw?.percent, d.percent),
    minimum: num(raw?.minimum, d.minimum),
    addGst: raw?.addGst === true,
  }
}

/** Cost of one trade of the given value (sign ignored), including GST where set. */
export function tradeCost(value: number, settings: TransactionCostSettings): number {
  const base =
    settings.mode === 'flat' ? settings.flat : Math.max(settings.minimum, (Math.abs(value) * settings.percent) / 100)
  return base * (settings.addGst ? 1 + GST : 1)
}

/** e.g. "$25 per trade", "1.00% + GST, minimum $50 per trade". */
export function describeTransactionCost(settings: TransactionCostSettings): string {
  const gst = settings.addGst ? ' + GST' : ''
  if (settings.mode === 'flat') return `${money(settings.flat)}${gst} per trade`
  return `${settings.percent.toFixed(2)}%${gst}, minimum ${money(settings.minimum)} per trade`
}

function money(v: number): string {
  return v.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: Number.isInteger(v) ? 0 : 2 })
}
