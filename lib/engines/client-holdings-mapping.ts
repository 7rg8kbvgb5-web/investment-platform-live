import { UploadedHolding } from './client-portfolio-upload'
import { buildSecurityUniverse, normaliseCode, type SecurityUniverseEntry } from './security-universe'
import { ASSET_CLASSES } from './model-portfolio-core'
import { isCashLike, isIsin, normaliseBondName, type HoldingTreatment } from './holding-triage'

export type MappedHolding = {
  code: string
  name?: string
  weight: number
  /** Dollar market value of this holding, if the upload stated one directly. */
  value?: number
  /** Units/shares held, if the upload stated a quantity directly. */
  quantity?: number
  sector: string
  assetClass: string
  assetClassType: 'Growth' | 'Defensive' | 'Unknown'
  mapped: boolean
  inSecurityMaster: boolean
  /** How the holding was recognised: by its code, by ISIN, by bond short name, as cash, or classified by the adviser. */
  matchedBy?: 'code' | 'isin' | 'bond-name' | 'cash' | 'adviser'
  /** The code as printed on the client's statement, when matching resolved it to a different model code (e.g. an ISIN). */
  statementCode?: string
  /** From the statement - carried so CGT and Construction still find them when the code was re-matched. */
  costBase?: number
  acquiredDate?: string
  /** Adviser's chosen treatment if this holding sits outside the model (unset = default for its type). */
  treatment?: HoldingTreatment
  treatmentReason?: string
}

export type HoldingsMappingResult = {
  mappedHoldings: MappedHolding[]
  mappedCount: number
  unmappedCount: number
  sectorExposure: Record<string, number>
  assetClassExposure: Record<string, number>
  growthWeight: number
  defensiveWeight: number
  unknownWeight: number
}

export const EMPTY_HOLDINGS_MAPPING_RESULT: HoldingsMappingResult = {
  mappedHoldings: [],
  mappedCount: 0,
  unmappedCount: 0,
  sectorExposure: {},
  assetClassExposure: {},
  growthWeight: 0,
  defensiveWeight: 0,
  unknownWeight: 0,
}

export async function mapClientHoldings(
  holdings: UploadedHolding[],
): Promise<HoldingsMappingResult> {
  const universe = await buildSecurityUniverse()
  const mappedHoldings: MappedHolding[] = []

  // Secondary indexes so a statement that prints a bond by ISIN, or puts the
  // dealer short name in the name column, still lines up with the model.
  const byIsin = new Map<string, SecurityUniverseEntry>()
  const byBondName = new Map<string, SecurityUniverseEntry>()
  let modelCashEntry: SecurityUniverseEntry | undefined
  for (const entry of universe.values()) {
    if (entry.isin) byIsin.set(entry.isin, entry)
    if (/%/.test(entry.code)) byBondName.set(normaliseBondName(entry.code), entry)
    if (entry.assetClass === 'Cash' && entry.inModelUniverse && (!modelCashEntry || entry.code < modelCashEntry.code)) {
      modelCashEntry = entry
    }
  }

  const sectorExposure: Record<string, number> = {}
  const assetClassExposure: Record<string, number> = {}

  let mappedCount = 0
  let unmappedCount = 0
  let growthWeight = 0
  let defensiveWeight = 0
  let unknownWeight = 0

  function recognise(holding: UploadedHolding): { entry: SecurityUniverseEntry; matchedBy: MappedHolding['matchedBy'] } | null {
    const code = normaliseCode(holding.code)
    const direct = universe.get(code)
    if (direct) return { entry: direct, matchedBy: 'code' }
    if (isIsin(code) && byIsin.has(code)) return { entry: byIsin.get(code)!, matchedBy: 'isin' }
    if (holding.name) {
      const byName = byBondName.get(normaliseBondName(holding.name)) ?? universe.get(normaliseCode(holding.name))
      if (byName) return { entry: byName, matchedBy: 'bond-name' }
    }
    if (modelCashEntry && isCashLike(holding.code, holding.name)) return { entry: modelCashEntry, matchedBy: 'cash' }
    return null
  }

  holdings.forEach((holding) => {
    const recognised = recognise(holding)
    const adviserClass = holding.assetClass ? ASSET_CLASSES.find((ac) => ac.name === holding.assetClass) : undefined

    if (recognised || adviserClass) {
      mappedCount += 1
      const entry = recognised?.entry
      const assetClass = entry?.assetClass ?? adviserClass!.name
      const assetClassType = entry?.assetClassType ?? adviserClass!.type
      const sector = entry?.sector ?? 'Classified by adviser'

      sectorExposure[sector] = (sectorExposure[sector] || 0) + holding.weight
      assetClassExposure[assetClass] = (assetClassExposure[assetClass] || 0) + holding.weight
      if (assetClassType === 'Growth') {
        growthWeight += holding.weight
      } else {
        defensiveWeight += holding.weight
      }

      mappedHoldings.push({
        code: entry?.code ?? normaliseCode(holding.code),
        name: entry && recognised?.matchedBy !== 'code' && recognised?.matchedBy !== 'cash' ? entry.name : holding.name ?? entry?.name,
        weight: holding.weight,
        value: holding.value,
        quantity: holding.quantity,
        sector,
        assetClass,
        assetClassType,
        mapped: true,
        inSecurityMaster: entry?.inSecurityMaster ?? false,
        matchedBy: recognised?.matchedBy ?? 'adviser',
        statementCode:
          entry && normaliseCode(entry.code) !== normaliseCode(holding.code) ? holding.code : undefined,
        costBase: holding.costBase,
        acquiredDate: holding.acquiredDate,
        treatment: holding.treatment,
        treatmentReason: holding.treatmentReason,
      })

      return
    }

    unmappedCount += 1
    unknownWeight += holding.weight

    mappedHoldings.push({
      code: holding.code,
      name: holding.name,
      weight: holding.weight,
      value: holding.value,
      quantity: holding.quantity,
      sector: 'Not in security master or model universe',
      assetClass: 'Unclassified',
      assetClassType: 'Unknown',
      mapped: false,
      inSecurityMaster: false,
      costBase: holding.costBase,
      acquiredDate: holding.acquiredDate,
      treatment: holding.treatment,
      treatmentReason: holding.treatmentReason,
    })
  })

  return {
    mappedHoldings,
    mappedCount,
    unmappedCount,
    sectorExposure,
    assetClassExposure,
    growthWeight: round2(growthWeight),
    defensiveWeight: round2(defensiveWeight),
    unknownWeight: round2(unknownWeight),
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
