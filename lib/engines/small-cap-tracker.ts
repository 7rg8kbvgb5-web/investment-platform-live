import { supabase } from '../supabase'
import { getBulkEod, getHistoricalEod, isEodhdConfigured, type EodhdBulkRow, type EodhdEodBar } from '../eodhd-client'
import { fetchCoreSecurities } from './model-portfolio-core'

// Small/mid-cap technical tracker.
//
//   Relative strength - Small Ordinaries vs S&P/ASX 200 ratio, with its
//                       50-day average and 1/3/6/12-month performance gap.
//   Support levels    - swing lows and highs found in the Small Ords price
//                       history, plus levels the adviser has asked to watch.
//   Market breadth    - % of ASX ordinary shares advancing each day, from the
//                       EODHD bulk end-of-day feed (paid plan). Each day is
//                       stored, so the history builds as the tracker is used.
//   Short interest    - ASIC's daily aggregated short position report (public,
//                       published about four business days after the trade
//                       date): most shorted names, biggest one-month increases,
//                       and short interest in the model portfolio's holdings.
//
// Every figure comes from a data feed; nothing here is AI-generated.

const SMALL = { primary: 'AXSO.INDX', fallback: 'ISO.AU', name: 'Small Ordinaries' }
const LARGE = { primary: 'AXJO.INDX', fallback: 'STW.AU', name: 'S&P/ASX 200' }

export type RelativeStrengthPoint = { date: string; small: number; large: number; ratio: number; ratioMa50: number | null }

export type PerformanceRow = { label: string; small: number | null; large: number | null; spread: number | null }

export type Level = {
  level: number
  label: string
  kind: 'support' | 'resistance'
  source: 'swing' | 'range' | 'adviser'
  distancePct: number
  id?: string
}

export type BreadthDay = {
  tradeDate: string
  advancers: number
  decliners: number
  unchanged: number
  pctAdvancing: number
  pctAboveEma50: number | null
  universe: number
}

export type ShortRow = { code: string; name: string; pct: number; pctMonthAgo: number | null; change: number | null }

export type TrackerResult = {
  generatedAt: string
  indices: {
    usingProxies: boolean
    smallLabel: string
    largeLabel: string
    smallLast: number | null
    largeLast: number | null
    lastDate: string | null
  }
  relativeStrength: RelativeStrengthPoint[]
  performance: PerformanceRow[]
  signal: { tone: 'leading' | 'lagging' | 'mixed'; text: string } | null
  levels: Level[]
  breadth: { status: 'ok' | 'unavailable'; message: string | null; today: BreadthDay | null; history: BreadthDay[] }
  shorts: {
    status: 'ok' | 'unavailable'
    message: string | null
    reportDate: string | null
    comparisonDate: string | null
    medianPct: number | null
    medianPctMonthAgo: number | null
    mostShorted: ShortRow[]
    biggestIncreases: ShortRow[]
    modelHoldings: ShortRow[]
  }
  errors: string[]
}

export async function buildSmallCapTracker(modelId?: string | null): Promise<TrackerResult> {
  const errors: string[] = []
  const result: TrackerResult = {
    generatedAt: new Date().toISOString(),
    indices: { usingProxies: false, smallLabel: SMALL.name, largeLabel: LARGE.name, smallLast: null, largeLast: null, lastDate: null },
    relativeStrength: [],
    performance: [],
    signal: null,
    levels: [],
    breadth: { status: 'unavailable', message: null, today: null, history: [] },
    shorts: {
      status: 'unavailable',
      message: null,
      reportDate: null,
      comparisonDate: null,
      medianPct: null,
      medianPctMonthAgo: null,
      mostShorted: [],
      biggestIncreases: [],
      modelHoldings: [],
    },
    errors,
  }

  const adviserLevels = await listAdviserLevels().catch(() => [])

  // --- Indices, relative strength, support levels ---------------------------
  let largeBars: EodhdEodBar[] = []
  if (!isEodhdConfigured()) {
    errors.push('EODHD_API_KEY is not set in Vercel, so index data is unavailable.')
  } else {
    try {
      const series = await loadIndexPair()
      largeBars = series.large
      result.indices = {
        usingProxies: series.usingProxies,
        smallLabel: series.usingProxies ? `${SMALL.name} (via ${SMALL.fallback} ETF)` : SMALL.name,
        largeLabel: series.usingProxies ? `${LARGE.name} (via ${LARGE.fallback} ETF)` : LARGE.name,
        smallLast: series.small.at(-1)?.close ?? null,
        largeLast: series.large.at(-1)?.close ?? null,
        lastDate: series.small.at(-1)?.date ?? null,
      }
      result.relativeStrength = relativeStrength(series.small, series.large)
      result.performance = performance(series.small, series.large)
      result.signal = signal(result.relativeStrength)
      result.levels = levelsFor(series.small, adviserLevels, series.usingProxies)
    } catch (err) {
      errors.push(`Index data: ${message(err)}`)
    }
  }
  if (result.levels.length === 0 && adviserLevels.length > 0) {
    result.levels = adviserLevels.map((l) => ({ ...l, kind: 'support' as const, source: 'adviser' as const, distancePct: 0 }))
  }

  // --- Breadth --------------------------------------------------------------
  try {
    result.breadth = await breadth(largeBars)
  } catch (err) {
    result.breadth = { status: 'unavailable', message: message(err), today: null, history: await breadthHistory().catch(() => []) }
  }

  // --- Short interest -------------------------------------------------------
  try {
    const modelCodes = (await fetchCoreSecurities(modelId).catch(() => [])).map((s) => s.code.toUpperCase())
    result.shorts = await shortInterest(modelCodes)
  } catch (err) {
    result.shorts.message = message(err)
  }

  return result
}

// ---------------------------------------------------------------------------
// Indices

async function loadIndexPair(): Promise<{ small: EodhdEodBar[]; large: EodhdEodBar[]; usingProxies: boolean }> {
  const to = isoDate(new Date())
  const from = isoDate(new Date(Date.now() - 400 * 86400000))
  try {
    const [small, large] = await Promise.all([
      getHistoricalEod(SMALL.primary, from, to),
      getHistoricalEod(LARGE.primary, from, to),
    ])
    if (valid(small) && valid(large)) return { ...align(small, large), usingProxies: false }
  } catch {
    // fall through to ETF proxies
  }
  const [small, large] = await Promise.all([
    getHistoricalEod(SMALL.fallback, from, to),
    getHistoricalEod(LARGE.fallback, from, to),
  ])
  if (!valid(small) || !valid(large)) throw new Error('EODHD returned no index history.')
  return { ...align(small, large), usingProxies: true }
}

function valid(bars: unknown): bars is EodhdEodBar[] {
  return Array.isArray(bars) && bars.length > 30 && typeof bars[0]?.close === 'number'
}

function align(small: EodhdEodBar[], large: EodhdEodBar[]) {
  const largeByDate = new Map(large.map((b) => [b.date, b]))
  const s: EodhdEodBar[] = []
  const l: EodhdEodBar[] = []
  for (const bar of small) {
    const match = largeByDate.get(bar.date)
    if (match && bar.close > 0 && match.close > 0) {
      s.push(bar)
      l.push(match)
    }
  }
  return { small: s, large: l }
}

function relativeStrength(small: EodhdEodBar[], large: EodhdEodBar[]): RelativeStrengthPoint[] {
  const base = small[0].close / large[0].close
  const ratios = small.map((b, i) => (b.close / large[i].close / base) * 100)
  return small.map((b, i) => ({
    date: b.date,
    small: b.close,
    large: large[i].close,
    ratio: round(ratios[i], 2),
    ratioMa50: i >= 49 ? round(avg(ratios.slice(i - 49, i + 1)), 2) : null,
  }))
}

function performance(small: EodhdEodBar[], large: EodhdEodBar[]): PerformanceRow[] {
  const periods: [string, number][] = [
    ['1 month', 21],
    ['3 months', 63],
    ['6 months', 126],
    ['12 months', 252],
  ]
  return periods.map(([label, n]) => {
    const s = change(small, n)
    const l = change(large, n)
    return { label, small: s, large: l, spread: s !== null && l !== null ? round(s - l, 4) : null }
  })
}

function change(bars: EodhdEodBar[], n: number): number | null {
  if (bars.length <= n) return null
  const last = bars[bars.length - 1].close
  const then = bars[bars.length - 1 - n].close
  return round(last / then - 1, 4)
}

function signal(points: RelativeStrengthPoint[]): TrackerResult['signal'] {
  const last = points.at(-1)
  const monthAgo = points.at(-22)
  if (!last || last.ratioMa50 === null || !monthAgo) return null
  const aboveAverage = last.ratio > last.ratioMa50
  const rising = last.ratio > monthAgo.ratio
  if (aboveAverage && rising)
    return { tone: 'leading', text: 'Small caps are outperforming: the ratio is above its 50-day average and higher than a month ago.' }
  if (!aboveAverage && !rising)
    return { tone: 'lagging', text: 'Small caps are underperforming: the ratio is below its 50-day average and lower than a month ago.' }
  return {
    tone: 'mixed',
    text: aboveAverage
      ? 'Mixed: the ratio is above its 50-day average but lower than a month ago - leadership may be fading.'
      : 'Mixed: the ratio is below its 50-day average but higher than a month ago - a possible turn, not yet confirmed.',
  }
}

function levelsFor(small: EodhdEodBar[], adviser: { id: string; level: number; label: string }[], proxied: boolean): Level[] {
  const last = small[small.length - 1].close
  const window = 10
  const recent = small.slice(-260)
  const lows: Level[] = []
  const highs: Level[] = []
  const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

  for (let i = window; i < recent.length - window; i++) {
    const slice = recent.slice(i - window, i + window + 1)
    const low = recent[i].low || recent[i].close
    const high = recent[i].high || recent[i].close
    if (slice.every((b) => (b.low || b.close) >= low))
      lows.push({ level: round(low, 1), label: `Swing low, ${fmtDate(recent[i].date)}`, kind: 'support', source: 'swing', distancePct: 0 })
    if (slice.every((b) => (b.high || b.close) <= high))
      highs.push({ level: round(high, 1), label: `Swing high, ${fmtDate(recent[i].date)}`, kind: 'resistance', source: 'swing', distancePct: 0 })
  }

  const yearLow = Math.min(...recent.map((b) => b.low || b.close))
  const yearHigh = Math.max(...recent.map((b) => b.high || b.close))
  const range: Level[] = [
    { level: round(yearLow, 1), label: '52-week low', kind: 'support', source: 'range', distancePct: 0 },
    { level: round(yearHigh, 1), label: '52-week high', kind: 'resistance', source: 'range', distancePct: 0 },
  ]

  // Adviser levels are in index points; skip them if prices are from the ETF proxy.
  const mine: Level[] = proxied
    ? []
    : adviser.map((a) => ({
        id: a.id,
        level: a.level,
        label: a.label,
        kind: a.level <= last ? ('support' as const) : ('resistance' as const),
        source: 'adviser' as const,
        distancePct: 0,
      }))

  const supports = dedupe(lows.filter((l) => l.level < last).sort((a, b) => b.level - a.level)).slice(0, 4)
  const resistances = dedupe(highs.filter((l) => l.level > last).sort((a, b) => a.level - b.level)).slice(0, 3)

  return [...mine, ...range, ...supports, ...resistances]
    .map((l) => ({ ...l, distancePct: round(l.level / last - 1, 4) }))
    .sort((a, b) => b.level - a.level)
}

function dedupe(levels: Level[]): Level[] {
  const out: Level[] = []
  for (const l of levels) if (!out.some((o) => Math.abs(o.level / l.level - 1) < 0.015)) out.push(l)
  return out
}

// ---------------------------------------------------------------------------
// Adviser levels

export async function listAdviserLevels(): Promise<{ id: string; level: number; label: string }[]> {
  const { data, error } = await supabase.from('market_tracker_levels').select('id, level, label').order('level', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({ id: r.id, level: Number(r.level), label: r.label }))
}

export async function addAdviserLevel(level: number, label: string, createdBy: string | null): Promise<void> {
  const { error } = await supabase.from('market_tracker_levels').insert({ level, label, created_by: createdBy })
  if (error) throw new Error(error.message.includes('market_tracker_levels') ? 'Run migration 0029 in Supabase first.' : error.message)
}

export async function removeAdviserLevel(id: string): Promise<void> {
  const { error } = await supabase.from('market_tracker_levels').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Breadth

async function breadth(largeBars: EodhdEodBar[]): Promise<TrackerResult['breadth']> {
  const history = await breadthHistory().catch(() => [] as BreadthDay[])
  const latestDate = largeBars.at(-1)?.date ?? null
  const stored = latestDate ? history.find((d) => d.tradeDate === latestDate) : undefined
  if (stored) return { status: 'ok', message: null, today: stored, history }

  if (!isEodhdConfigured()) {
    return { status: 'unavailable', message: 'EODHD_API_KEY is not set.', today: history.at(-1) ?? null, history }
  }

  let rows
  try {
    rows = await getBulkEod('AU', latestDate ?? undefined)
  } catch (err) {
    const text = message(err)
    return {
      status: 'unavailable',
      message: /40[0-3]/.test(text)
        ? 'Market breadth needs the EODHD paid plan (whole-exchange daily closes). It will start recording automatically once the plan is upgraded - same API key.'
        : `Breadth feed: ${text}`,
      today: history.at(-1) ?? null,
      history,
    }
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { status: 'unavailable', message: 'EODHD returned no exchange data for the latest day.', today: history.at(-1) ?? null, history }
  }

  const shares = rows.filter((r) => r.close > 0 && r.volume > 0 && (!r.type || /common stock/i.test(r.type)))

  // Previous close: from the extended feed if supplied, else from the prior day's file.
  let prevClose = new Map<string, number>()
  if (!shares.some((r) => typeof r.prev_close === 'number' && r.prev_close > 0)) {
    const prevDate = largeBars.at(-2)?.date
    if (prevDate) {
      const prev: EodhdBulkRow[] = await getBulkEod('AU', prevDate).catch(() => [])
      prevClose = new Map(prev.map((r): [string, number] => [r.code, r.close]))
    }
  }

  let advancers = 0
  let decliners = 0
  let unchanged = 0
  let aboveEma = 0
  let emaCount = 0
  for (const r of shares) {
    const prior = typeof r.prev_close === 'number' && r.prev_close > 0 ? r.prev_close : prevClose.get(r.code)
    if (!prior) continue
    if (r.close > prior) advancers++
    else if (r.close < prior) decliners++
    else unchanged++
    if (typeof r.ema_50 === 'number' && r.ema_50 > 0) {
      emaCount++
      if (r.close > r.ema_50) aboveEma++
    }
  }
  const moved = advancers + decliners
  if (moved === 0) return { status: 'unavailable', message: 'Not enough price data to measure breadth.', today: history.at(-1) ?? null, history }

  const today: BreadthDay = {
    tradeDate: latestDate ?? shares[0].date,
    advancers,
    decliners,
    unchanged,
    pctAdvancing: round(advancers / moved, 4),
    pctAboveEma50: emaCount > 50 ? round(aboveEma / emaCount, 4) : null,
    universe: advancers + decliners + unchanged,
  }

  await supabase
    .from('market_breadth_daily')
    .upsert({
      trade_date: today.tradeDate,
      advancers,
      decliners,
      unchanged,
      pct_advancing: today.pctAdvancing,
      pct_above_ema50: today.pctAboveEma50,
      universe: today.universe,
    })
    .then(() => undefined, () => undefined)

  const merged = [...history.filter((d) => d.tradeDate !== today.tradeDate), today].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
  return { status: 'ok', message: null, today, history: merged.slice(-120) }
}

async function breadthHistory(): Promise<BreadthDay[]> {
  const { data, error } = await supabase
    .from('market_breadth_daily')
    .select('*')
    .order('trade_date', { ascending: false })
    .limit(120)
  if (error) throw new Error(error.message)
  return (data ?? [])
    .map((r) => ({
      tradeDate: r.trade_date,
      advancers: r.advancers,
      decliners: r.decliners,
      unchanged: r.unchanged,
      pctAdvancing: Number(r.pct_advancing),
      pctAboveEma50: r.pct_above_ema50 === null ? null : Number(r.pct_above_ema50),
      universe: r.universe,
    }))
    .reverse()
}

// ---------------------------------------------------------------------------
// ASIC short interest

type AsicRow = { code: string; name: string; pct: number }

async function shortInterest(modelCodes: string[]): Promise<TrackerResult['shorts']> {
  const latest = await findAsicReport(new Date(), 14)
  if (!latest) throw new Error('Could not reach the ASIC short position report (asic.gov.au). Try again later.')
  const comparison = await findAsicReport(new Date(Date.parse(`${latest.date}T00:00:00Z`) - 28 * 86400000), 10)

  const before = new Map((comparison?.rows ?? []).map((r) => [r.code, r.pct]))
  const rows: ShortRow[] = latest.rows.map((r) => {
    const prior = before.get(r.code) ?? null
    return { code: r.code, name: r.name, pct: r.pct, pctMonthAgo: prior, change: prior === null ? null : round(r.pct - prior, 2) }
  })
  const equities = rows.filter((r) => !/^GSB|TREASURY|BOND/i.test(`${r.code} ${r.name}`))

  const modelSet = new Set(modelCodes)
  return {
    status: 'ok',
    message: null,
    reportDate: latest.date,
    comparisonDate: comparison?.date ?? null,
    medianPct: median(equities.filter((r) => r.pct > 0).map((r) => r.pct)),
    medianPctMonthAgo: comparison ? median(comparison.rows.filter((r) => r.pct > 0 && !/^GSB/i.test(r.code)).map((r) => r.pct)) : null,
    mostShorted: [...equities].sort((a, b) => b.pct - a.pct).slice(0, 15),
    biggestIncreases: equities
      .filter((r) => r.change !== null && r.change > 0 && r.pct >= 1)
      .sort((a, b) => (b.change as number) - (a.change as number))
      .slice(0, 10),
    modelHoldings: equities.filter((r) => modelSet.has(r.code)).sort((a, b) => a.code.localeCompare(b.code)),
  }
}

async function findAsicReport(from: Date, maxDays: number): Promise<{ date: string; rows: AsicRow[] } | null> {
  for (let i = 0; i <= maxDays; i++) {
    const d = new Date(from.getTime() - i * 86400000)
    const day = d.getUTCDay()
    if (day === 0 || day === 6) continue
    const ymd = isoDate(d).replace(/-/g, '')
    const url = `https://download.asic.gov.au/short-selling/RR${ymd}-001-SSDailyAggShortPos.csv`
    try {
      const res = await fetch(url, { next: { revalidate: 43200 } })
      if (!res.ok) continue
      const rows = parseAsic(await res.arrayBuffer())
      if (rows.length > 50) return { date: isoDate(d), rows }
    } catch {
      // try the previous day
    }
  }
  return null
}

export function parseAsic(buffer: ArrayBuffer): AsicRow[] {
  const bytes = new Uint8Array(buffer)
  const utf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes.length > 3 && bytes[1] === 0 && bytes[3] === 0)
  const text = new TextDecoder(utf16 ? 'utf-16le' : 'utf-8').decode(bytes).replace(/^﻿/, '')
  const rows: AsicRow[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const fields = line.includes('\t') ? line.split('\t') : splitCsv(line)
    const clean = fields.map((f) => f.trim().replace(/^"|"$/g, ''))
    if (clean.length < 5) continue
    const pct = Number(clean[clean.length - 1].replace(/[^0-9.\-]/g, ''))
    const code = clean[clean.length - 4].toUpperCase()
    if (!Number.isFinite(pct) || !/^[A-Z0-9]{2,6}$/.test(code)) continue
    rows.push({ code, name: clean.slice(0, clean.length - 4).join(', '), pct })
  }
  return rows
}

function splitCsv(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

// ---------------------------------------------------------------------------

function avg(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2, 2)
}

function round(v: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(v * f) / f
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
