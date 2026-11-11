import type { ExtractedSecurity } from '../engines/research-library'

// Reads a broker's coverage-universe spreadsheet (e.g. Ord Minnett's "OML
// Universe" export: Security, Company, Recommendation, Risk, Target Price,
// Update Date) into the same per-security rows a research PDF produces.
// Column headings are matched loosely so a re-ordered or renamed export
// still reads. Nothing is guessed: a row without a code or a rating is
// skipped and reported.

type Cell = string | number | boolean | Date | null | undefined

const HEADINGS: Record<keyof ColumnMap, RegExp> = {
  code: /^(security|code|ticker|asx code|stock code|symbol)$/i,
  name: /^(company|name|company name|security name|description)$/i,
  rating: /^(recommendation|rating|rec|recommend)$/i,
  risk: /^(risk|risk rating)$/i,
  priceTarget: /^(target price|price target|target|pt|tp)$/i,
  ratingDate: /^(update date|updated|date|last updated|rating date)$/i,
}

type ColumnMap = {
  code: number
  name: number
  rating: number
  risk: number
  priceTarget: number
  ratingDate: number
}

export type UniverseImport = {
  securities: ExtractedSecurity[]
  /** Most recent update date in the file (YYYY-MM-DD), used as the document date. */
  latestDate: string | null
  warnings: string[]
}

export function parseUniverseRows(rows: Cell[][]): UniverseImport {
  const headerIndex = rows.findIndex((r) => r.some((c) => typeof c === 'string' && HEADINGS.code.test(c.trim())))
  if (headerIndex === -1) {
    throw new Error('Could not find a heading row with a Security / Code / Ticker column.')
  }
  const header = rows[headerIndex].map((c) => (typeof c === 'string' ? c.trim() : ''))
  const col = {} as ColumnMap
  for (const key of Object.keys(HEADINGS) as (keyof ColumnMap)[]) {
    col[key] = header.findIndex((h) => HEADINGS[key].test(h))
  }
  if (col.rating === -1) throw new Error('Could not find a Recommendation / Rating column.')

  const warnings: string[] = []
  const missing = (['name', 'priceTarget', 'risk', 'ratingDate'] as const).filter((k) => col[k] === -1)
  if (missing.length > 0) warnings.push(`No column found for: ${missing.join(', ')}.`)

  const seen = new Set<string>()
  const skipped: number[] = []
  const duplicates: string[] = []
  const securities: ExtractedSecurity[] = []
  let latest: string | null = null
  const yearAgo = isoDate(new Date(Date.now() - 365 * 86400000))
  let stale = 0

  rows.slice(headerIndex + 1).forEach((r, i) => {
    if (r.every((c) => c === null || c === undefined || c === '')) return
    const code = text(r[col.code])?.toUpperCase().replace(/\.AX$|\.AU$/, '') ?? null
    const rating = text(r[col.rating])
    if (!code || !rating) {
      skipped.push(headerIndex + i + 2)
      return
    }
    if (seen.has(code)) {
      duplicates.push(code)
      return
    }
    seen.add(code)

    const ratingDate = col.ratingDate === -1 ? null : toIsoDate(r[col.ratingDate])
    if (ratingDate && (!latest || ratingDate > latest)) latest = ratingDate
    if (ratingDate && ratingDate < yearAgo) stale++
    const target = col.priceTarget === -1 ? null : toNumber(r[col.priceTarget])
    const risk = col.risk === -1 ? null : text(r[col.risk])

    securities.push({
      code,
      name: col.name === -1 ? null : text(r[col.name]),
      rating,
      recommendation: rating,
      priceTarget: target,
      isTopIdea: false,
      note: [risk ? `${risk} risk` : null, ratingDate ? `rated ${displayDate(ratingDate)}` : null].filter(Boolean).join(' · ') || null,
      risk,
      ratingDate,
    })
  })

  if (skipped.length > 0) warnings.push(`Skipped ${skipped.length} row(s) without a code or rating (rows ${skipped.slice(0, 8).join(', ')}${skipped.length > 8 ? '…' : ''}).`)
  if (duplicates.length > 0) warnings.push(`Kept the first row for duplicated codes: ${Array.from(new Set(duplicates)).join(', ')}.`)
  if (stale > 0) warnings.push(`${stale} rating(s) were last updated more than 12 months ago - they're still imported, with their date shown.`)

  securities.sort((a, b) => a.code.localeCompare(b.code))
  return { securities, latestDate: latest, warnings }
}

/** Splits CSV text into rows of cells (handles quoted fields with commas). */
export function csvToRows(textContent: string): Cell[][] {
  return textContent
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const out: string[] = []
      let cur = ''
      let quoted = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"' && line[i + 1] === '"' && quoted) {
          cur += '"'
          i++
        } else if (ch === '"') quoted = !quoted
        else if (ch === ',' && !quoted) {
          out.push(cur)
          cur = ''
        } else cur += ch
      }
      out.push(cur)
      return out.map((c) => c.trim())
    })
}

function text(c: Cell): string | null {
  if (c === null || c === undefined) return null
  const s = String(c).trim()
  return s === '' ? null : s
}

function toNumber(c: Cell): number | null {
  if (typeof c === 'number') return Number.isFinite(c) ? c : null
  const s = text(c)
  if (!s) return null
  const n = Number(s.replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

function toIsoDate(c: Cell): string | null {
  if (c instanceof Date) return Number.isNaN(c.getTime()) ? null : isoDate(c)
  if (typeof c === 'number' && c > 20000 && c < 80000) {
    // Excel serial date
    return isoDate(new Date(Math.round((c - 25569) * 86400000)))
  }
  const s = text(c)
  if (!s) return null
  const au = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (au) {
    const year = au[3].length === 2 ? `20${au[3]}` : au[3]
    return `${year}-${au[2].padStart(2, '0')}-${au[1].padStart(2, '0')}`
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : isoDate(d)
}

function isoDate(d: Date): string {
  // Spreadsheet readers return calendar dates as UTC midnight.
  return d.toISOString().slice(0, 10)
}

function displayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
