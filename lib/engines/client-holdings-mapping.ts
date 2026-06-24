import { UploadedHolding } from './client-portfolio-upload'

export type MappedHolding = {
  code: string
  name?: string
  weight: number
  sector: string
  assetClass: string
  mapped: boolean
}

export type HoldingsMappingResult = {
  mappedHoldings: MappedHolding[]
  mappedCount: number
  unmappedCount: number
  sectorExposure: Record<string, number>
}

const SECURITY_MAP: Record<
  string,
  {
    sector: string
    assetClass: string
  }
> = {
  CBA: {
    sector: 'Financials',
    assetClass: 'Australian Equities',
  },
  MQG: {
    sector: 'Financials',
    assetClass: 'Australian Equities',
  },
  ANZ: {
    sector: 'Financials',
    assetClass: 'Australian Equities',
  },
  NAB: {
    sector: 'Financials',
    assetClass: 'Australian Equities',
  },
  WBC: {
    sector: 'Financials',
    assetClass: 'Australian Equities',
  },

  BHP: {
    sector: 'Materials',
    assetClass: 'Australian Equities',
  },
  NST: {
    sector: 'Materials',
    assetClass: 'Australian Equities',
  },
  RIO: {
    sector: 'Materials',
    assetClass: 'Australian Equities',
  },

  CSL: {
    sector: 'Healthcare',
    assetClass: 'Australian Equities',
  },
  COH: {
    sector: 'Healthcare',
    assetClass: 'Australian Equities',
  },

  WOW: {
    sector: 'Consumer Staples',
    assetClass: 'Australian Equities',
  },

  TLS: {
    sector: 'Communication Services',
    assetClass: 'Australian Equities',
  },

  QUAL: {
    sector: 'International Equities',
    assetClass: 'International Equities',
  },

  VGS: {
    sector: 'International Equities',
    assetClass: 'International Equities',
  },
}

export function mapClientHoldings(
  holdings: UploadedHolding[],
): HoldingsMappingResult {
  const mappedHoldings: MappedHolding[] = []

  const sectorExposure: Record<string, number> = {}

  let mappedCount = 0
  let unmappedCount = 0

  holdings.forEach((holding) => {
    const mapping = SECURITY_MAP[holding.code]

    if (mapping) {
      mappedCount += 1

      sectorExposure[mapping.sector] =
        (sectorExposure[mapping.sector] || 0) + holding.weight

      mappedHoldings.push({
        code: holding.code,
        name: holding.name,
        weight: holding.weight,
        sector: mapping.sector,
        assetClass: mapping.assetClass,
        mapped: true,
      })

      return
    }

    unmappedCount += 1

    mappedHoldings.push({
      code: holding.code,
      name: holding.name,
      weight: holding.weight,
      sector: 'Unknown',
      assetClass: 'Unknown',
      mapped: false,
    })
  })

  return {
    mappedHoldings,
    mappedCount,
    unmappedCount,
    sectorExposure,
  }
}