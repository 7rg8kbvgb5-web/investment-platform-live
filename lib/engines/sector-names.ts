// Sector names shared by the browser and the classifier. No server imports.

export const GICS_SECTORS = [
  'Communication Services',
  'Consumer Discretionary',
  'Consumer Staples',
  'Energy',
  'Financials',
  'Health Care',
  'Industrials',
  'Information Technology',
  'Materials',
  'Real Estate',
  'Utilities',
] as const

/** Normalises common variants ("Healthcare", "Tech") to the GICS name. */
export function normaliseSector(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s) return null
  const lower = s.toLowerCase().replace(/[^a-z]/g, '')
  const aliases: Record<string, string> = {
    healthcare: 'Health Care',
    tech: 'Information Technology',
    technology: 'Information Technology',
    it: 'Information Technology',
    telecommunications: 'Communication Services',
    telecommunicationservices: 'Communication Services',
    telcos: 'Communication Services',
    communications: 'Communication Services',
    property: 'Real Estate',
    realestate: 'Real Estate',
    resources: 'Materials',
    mining: 'Materials',
    banks: 'Financials',
    financial: 'Financials',
    consumerstaples: 'Consumer Staples',
    consumerdiscretionary: 'Consumer Discretionary',
  }
  if (aliases[lower]) return aliases[lower]
  const exact = GICS_SECTORS.find((g) => g.toLowerCase().replace(/[^a-z]/g, '') === lower)
  return exact ?? s
}

