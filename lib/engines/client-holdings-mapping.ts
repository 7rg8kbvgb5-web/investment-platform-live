import { UploadedHolding } from './client-portfolio-upload'
import { buildSecurityUniverse, normaliseCode } from './security-universe'

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

  const sectorExposure: Record<string, number> = {}
  const assetClassExposure: Record<string, number> = {}

  let mappedCount = 0
  let unmappedCount = 0
  let growthWeight = 0
  let defensiveWeight = 0
  let unknownWeight = 0

  holdings.forEach((holding) => {
    const entry = universe.get(normaliseCode(holding.code))

    if (entry) {
      mappedCount += 1

      sectorExposure[entry.sector] =
        (sectorExposure[entry.sector] || 0) + holding.weight
      assetClassExposure[entry.assetClass] =
        (assetClassExposure[entry.assetClass] || 0) + holding.weight

      if (entry.assetClassType === 'Growth') {
        growthWeight += holding.weight
      } else {
        defensiveWeight += holding.weight
      }

      mappedHoldings.push({
        code: entry.code,
        name: holding.name ?? entry.name,
        weight: holding.weight,
        value: holding.value,
        quantity: holding.quantity,
        sector: entry.sector,
        assetClass: entry.assetClass,
        assetClassType: entry.assetClassType,
        mapped: true,
        inSecurityMaster: entry.inSecurityMaster,
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
