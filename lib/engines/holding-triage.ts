/**
 * Triage rules for client holdings that sit outside the house model.
 *
 * Every holding on a client statement ends up in the proposal one of three
 * ways - nothing is silently left out:
 *   - sell        full exit now (default for listed securities)
 *   - staged_exit exit recommended, but in stages - unlisted fund redemption
 *                 windows/gates, wholesale bond dealer spreads, or timing
 *                 (default for bonds, unlisted funds and alternatives)
 *   - retain      kept outside the model as a documented adviser exception,
 *                 with a reason that flows into the proposal (default for
 *                 cash that can't be matched to the model's cash holding)
 */
export type HoldingTreatment = 'sell' | 'staged_exit' | 'retain'

export const TREATMENT_LABELS: Record<HoldingTreatment, string> = {
  sell: 'Sell now',
  staged_exit: 'Staged exit',
  retain: 'Retain (exception)',
}

/** ISO 6166 ISIN, e.g. AU3CB0326452 - how custodians list wholesale bonds. */
export function isIsin(code: string): boolean {
  const v = code.trim().toUpperCase()
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(v) && /\d/.test(v.slice(2, 11))
}

/** APIR code for an unlisted managed fund, e.g. VIL9895AU. */
export function isApirCode(code: string): boolean {
  return /^[A-Z]{3}[0-9]{4}[A-Z]{2}$/.test(code.trim().toUpperCase())
}

/** Australian corporate bond / FRN ISIN prefixes. */
function isAustralianBondIsin(code: string): boolean {
  return /^AU3(CB|FN|SG|TB)/.test(code.trim().toUpperCase())
}

function looksLikeBondName(name: string | undefined): boolean {
  if (!name) return false
  const v = name.toUpperCase()
  return /%/.test(v) && /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-?\d{2}/.test(v)
}

/** Cash management trusts / cash accounts - the portfolio's cash, not an investment to exit. */
export function isCashLike(code: string, name: string | undefined): boolean {
  const c = code.trim().toUpperCase()
  const n = (name ?? '').toUpperCase()
  return (
    /CMT$/.test(c) ||
    /CASH MANAGEMENT|CASH ACCOUNT|CASH TRUST|CASH FUND|AT CALL|SETTLEMENT ACCOUNT/.test(n)
  )
}

/** Normalises a dealer short name for matching ("APAAU  6.772% Jul-33/56" -> "APAAU 6.772% JUL-33/56"). */
export function normaliseBondName(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ')
}

/** Best-guess asset class for an unrecognised holding, or null to leave it to the adviser. */
export function suggestAssetClass(code: string, name: string | undefined): string | null {
  if (isCashLike(code, name)) return 'Cash'
  if (isAustralianBondIsin(code) || looksLikeBondName(name)) {
    const foreignIsin = isIsin(code) && !code.trim().toUpperCase().startsWith('AU')
    return foreignIsin ? 'Global Fixed Interest' : 'Australian Fixed Interest'
  }
  return null
}

/** Default treatment for a holding outside the model, before the adviser changes it. */
export function defaultTreatment(code: string, name: string | undefined, assetClass: string): HoldingTreatment {
  if (assetClass === 'Cash' || isCashLike(code, name)) return 'retain'
  if (isIsin(code) || looksLikeBondName(name) || isApirCode(code) || assetClass === 'Alternatives') return 'staged_exit'
  return 'sell'
}
