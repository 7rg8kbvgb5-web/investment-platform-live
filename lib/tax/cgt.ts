import type { TaxReference } from './tax-reference'

// Capital gains/losses estimate for the sales in a proposed rebalance.
//
// Follows the ATO method for sales before 1 July 2027:
//   1. Work out the gain or loss on each sale (proceeds less cost base;
//      for a partial sale the cost base is apportioned by value sold).
//   2. Apply this year's capital losses, then carried-forward losses -
//      to gains that don't get the discount first (the ATO notes this
//      gives the lowest tax), then to discountable gains.
//   3. Apply the CGT discount to what remains of gains on assets held
//      12 months or more: 50% individuals and trusts, one-third complying
//      super funds, nil for companies.
//   4. Tax the net capital gain at the entity's rate.
// Unused losses carry forward. This is an estimate for discussion only.

export type EntityType =
  | 'individual'
  | 'joint'
  | 'trust'
  | 'company'
  | 'smsf_accumulation'
  | 'smsf_pension'
  | 'foreign_resident'

export const ENTITY_LABELS: Record<EntityType, string> = {
  individual: 'Personal account (individual)',
  joint: 'Joint account (two individuals)',
  trust: 'Family / discretionary trust',
  company: 'Company account',
  smsf_accumulation: 'SMSF – accumulation phase',
  smsf_pension: 'SMSF – pension (retirement) phase',
  foreign_resident: 'Foreign resident investor',
}

export type CgtSettings = {
  entityType: EntityType
  /** Marginal rate (decimal, excl. Medicare) for individuals, joint holders, or the trust's beneficiary. */
  marginalRate: number
  includeMedicare: boolean
  /** Company: true if a base rate entity (25%). Passive-income investment companies are usually not. */
  baseRateEntity: boolean
  /** Net capital losses carried forward from earlier years. */
  carryForwardLosses: number
  includeInProposal: boolean
  /** Per holding (normalised code): total cost base for the whole holding, and whether held 12+ months. */
  holdings: Record<string, { costBase: number | null; over12Months: boolean }>
}

export const DEFAULT_CGT_SETTINGS: CgtSettings = {
  entityType: 'individual',
  marginalRate: 0.45,
  includeMedicare: true,
  baseRateEntity: false,
  carryForwardLosses: 0,
  includeInProposal: false,
  holdings: {},
}

export type CgtSaleInput = {
  code: string
  name: string
  /** Sale proceeds (positive dollars). */
  proceeds: number
  /** Value of the whole holding before the sale - used to apportion the cost base on partial sales. */
  holdingValue: number
}

export type CgtSaleLine = CgtSaleInput & {
  costBaseApplied: number | null
  over12Months: boolean
  gain: number | null
  discountEligible: boolean
}

export type CgtResult = {
  entityType: EntityType
  lines: CgtSaleLine[]
  missingCostBase: string[]
  grossGains: number
  currentYearLosses: number
  carryForwardUsed: number
  discountApplied: number
  netCapitalGain: number
  taxRate: number
  estimatedTax: number
  lossesCarriedForward: number
  /** Foreign residents: Australian CGT generally doesn't apply to portfolio interests in listed shares. */
  notCalculated: boolean
  rateDescription: string
}

export function discountRateFor(entity: EntityType, ref: TaxReference): number {
  switch (entity) {
    case 'individual':
    case 'joint':
      return ref.cgtDiscount.individual
    case 'trust':
      return ref.cgtDiscount.trust
    case 'smsf_accumulation':
    case 'smsf_pension':
      return ref.cgtDiscount.smsf
    case 'company':
      return ref.cgtDiscount.company
    case 'foreign_resident':
      return 0
  }
}

export function taxRateFor(settings: CgtSettings, ref: TaxReference): { rate: number; description: string } {
  const medicare = settings.includeMedicare ? ref.medicareLevy : 0
  switch (settings.entityType) {
    case 'individual':
      return {
        rate: settings.marginalRate + medicare,
        description: `${pct(settings.marginalRate)} marginal rate${medicare ? ` + ${pct(medicare)} Medicare levy` : ''}`,
      }
    case 'joint':
      return {
        rate: settings.marginalRate + medicare,
        description: `${pct(settings.marginalRate)} marginal rate${medicare ? ` + ${pct(medicare)} Medicare levy` : ''}, assumed the same for both holders (gain split equally)`,
      }
    case 'trust':
      return {
        rate: settings.marginalRate + medicare,
        description: `Distributed to an individual beneficiary on ${pct(settings.marginalRate)}${medicare ? ` + ${pct(medicare)} Medicare levy` : ''}`,
      }
    case 'company':
      return settings.baseRateEntity
        ? { rate: ref.baseRateEntityRate, description: `${pct(ref.baseRateEntityRate)} base rate entity company rate` }
        : { rate: ref.companyRate, description: `${pct(ref.companyRate)} company rate` }
    case 'smsf_accumulation':
      return { rate: ref.smsfAccumulationRate, description: `${pct(ref.smsfAccumulationRate)} complying super fund rate` }
    case 'smsf_pension':
      return { rate: ref.smsfPensionRate, description: 'Retirement-phase earnings are exempt (assumes 100% pension phase)' }
    case 'foreign_resident':
      return { rate: 0, description: 'Not calculated - see foreign resident note' }
  }
}

export function calculateCgt(sales: CgtSaleInput[], settings: CgtSettings, ref: TaxReference): CgtResult {
  const missingCostBase: string[] = []
  const lines: CgtSaleLine[] = sales.map((sale) => {
    const h = settings.holdings[sale.code.toUpperCase()]
    const totalCost = h?.costBase ?? null
    const over12Months = h?.over12Months ?? true
    let costBaseApplied: number | null = null
    let gain: number | null = null
    if (totalCost !== null && Number.isFinite(totalCost)) {
      const share = sale.holdingValue > 0 ? Math.min(1, sale.proceeds / sale.holdingValue) : 1
      costBaseApplied = round2(totalCost * share)
      gain = round2(sale.proceeds - costBaseApplied)
    } else {
      missingCostBase.push(sale.code)
    }
    return {
      ...sale,
      costBaseApplied,
      over12Months,
      gain,
      discountEligible: over12Months && discountRateFor(settings.entityType, ref) > 0,
    }
  })

  const { rate, description } = taxRateFor(settings, ref)
  const notCalculated = settings.entityType === 'foreign_resident'

  const gainsDiscountable = lines.filter((l) => (l.gain ?? 0) > 0 && l.discountEligible).reduce((s, l) => s + (l.gain as number), 0)
  const gainsOther = lines.filter((l) => (l.gain ?? 0) > 0 && !l.discountEligible).reduce((s, l) => s + (l.gain as number), 0)
  const currentYearLosses = Math.abs(lines.filter((l) => (l.gain ?? 0) < 0).reduce((s, l) => s + (l.gain as number), 0))
  const carryForward = Math.max(0, settings.carryForwardLosses || 0)

  // Current-year losses first, then carried-forward losses; non-discountable gains absorb them first.
  let lossPool = currentYearLosses + carryForward
  const absorbOther = Math.min(lossPool, gainsOther)
  lossPool -= absorbOther
  const absorbDiscountable = Math.min(lossPool, gainsDiscountable)
  lossPool -= absorbDiscountable
  const lossesUsed = absorbOther + absorbDiscountable
  const carryForwardUsed = Math.max(0, lossesUsed - currentYearLosses)

  const remainingDiscountable = gainsDiscountable - absorbDiscountable
  const discountApplied = remainingDiscountable * discountRateFor(settings.entityType, ref)
  const netCapitalGain = gainsOther - absorbOther + remainingDiscountable - discountApplied

  return {
    entityType: settings.entityType,
    lines,
    missingCostBase,
    grossGains: round2(gainsDiscountable + gainsOther),
    currentYearLosses: round2(currentYearLosses),
    carryForwardUsed: round2(carryForwardUsed),
    discountApplied: round2(discountApplied),
    netCapitalGain: round2(netCapitalGain),
    taxRate: rate,
    estimatedTax: notCalculated ? 0 : round2(netCapitalGain * rate),
    lossesCarriedForward: round2(lossPool),
    notCalculated,
    rateDescription: description,
  }
}

export const CGT_DISCLAIMERS = [
  'This is an estimate for discussion only and is not tax advice. Capital gains tax depends on your full circumstances, including other income, other capital gains and losses, and the exact cost base and acquisition dates of each parcel. Please confirm with your accountant or registered tax agent before acting.',
  'Cost bases, holding periods and carried-forward losses are as entered by your adviser. Partial sales apportion the cost base by value; your actual parcel selection may differ.',
  'Individual estimates apply a single marginal rate to the whole net capital gain and do not account for offsets, the Medicare levy surcharge, or the gain moving you into a higher bracket.',
  'Foreign residents: Australian CGT generally applies only to taxable Australian property, and portfolio holdings in listed shares are usually not. You may be taxed on these gains in your country of residence at its own rates - please obtain advice in that jurisdiction.',
]

function pct(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
