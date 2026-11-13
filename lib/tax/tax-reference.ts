import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../supabase'
import { AI_MODEL, SEARCH_LIMITS } from '../ai/models'

// Tax reference data for capital gains estimates, as published by the ATO.
// A verified default ships with the platform; "Check the ATO for updates"
// asks Claude to re-read the ATO's own pages and returns any changes for
// the adviser to approve, after which the approved set is stored and used.

export type TaxBracket = { from: number; to: number | null; rate: number }

export type TaxReference = {
  financialYear: string
  residentBrackets: TaxBracket[]
  medicareLevy: number
  companyRate: number
  baseRateEntityRate: number
  smsfAccumulationRate: number
  smsfPensionRate: number
  cgtDiscount: { individual: number; trust: number; smsf: number; company: number }
  reformNote: string
  sources: { label: string; url: string }[]
  verifiedAt: string
  verifiedBy: string
}

export const DEFAULT_TAX_REFERENCE: TaxReference = {
  financialYear: '2026-27',
  residentBrackets: [
    { from: 0, to: 18200, rate: 0 },
    { from: 18201, to: 45000, rate: 0.15 },
    { from: 45001, to: 135000, rate: 0.3 },
    { from: 135001, to: 190000, rate: 0.37 },
    { from: 190001, to: null, rate: 0.45 },
  ],
  medicareLevy: 0.02,
  companyRate: 0.3,
  baseRateEntityRate: 0.25,
  smsfAccumulationRate: 0.15,
  smsfPensionRate: 0,
  cgtDiscount: { individual: 0.5, trust: 0.5, smsf: 1 / 3, company: 0 },
  reformNote:
    'Under changes announced in the 2026-27 Federal Budget, from 1 July 2027 the 50% CGT discount for resident individuals, trusts and partnerships is replaced by cost base indexation on gains accruing from that date, with a 30% minimum tax on those gains; gains accrued before 1 July 2027 keep the discount. These estimates use the rules for sales before 1 July 2027.',
  sources: [
    { label: 'ATO – Tax rates: Australian residents', url: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents' },
    { label: 'ATO – CGT discount', url: 'https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/cgt-discount' },
    { label: 'ATO – Capital gains tax reform', url: 'https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/capital-gains-tax-reform' },
    { label: 'ATO – CGT discount for foreign residents', url: 'https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/foreign-residents-and-capital-gains-tax/cgt-discount-for-foreign-residents' },
  ],
  verifiedAt: '2026-11-08',
  verifiedBy: 'Platform default (checked against ato.gov.au)',
}

const TABLE = 'tax_reference'

/** The approved reference set: the latest stored one, else the shipped default. */
export async function getTaxReference(): Promise<TaxReference> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('data')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data) return DEFAULT_TAX_REFERENCE
    // The reform note is explanatory wording maintained in code, not a saved rate.
    return { ...DEFAULT_TAX_REFERENCE, ...(data.data as Partial<TaxReference>), reformNote: DEFAULT_TAX_REFERENCE.reformNote }
  } catch {
    return DEFAULT_TAX_REFERENCE
  }
}

export async function saveTaxReference(reference: TaxReference, approvedBy: string | null): Promise<void> {
  const { error } = await supabase.from(TABLE).insert({
    data: { ...reference, verifiedBy: approvedBy ?? reference.verifiedBy },
    approved_by: approvedBy,
  })
  if (error) throw new Error(`Failed to save tax rates: ${error.message}`)
}

const CHECK_PROMPT = `You verify Australian tax rates for an Ord Minnett private wealth adviser's capital gains estimates.
Use web search restricted to ato.gov.au pages only. Confirm, for the current Australian financial year:
1. Resident individual income tax brackets (excluding Medicare levy).
2. The Medicare levy rate.
3. The company tax rate and the base rate entity company tax rate.
4. The tax rate on complying super fund earnings in accumulation phase, and on pension-phase (retirement phase) earnings.
5. CGT discount percentages for individuals, trusts, complying super funds and companies.
6. Any CGT changes in force or legislated (summarise in one or two sentences, with dates of effect).
Only report what ATO pages state. Respond ONLY with a JSON object, no commentary:
{"financialYear": string, "residentBrackets": [{"from": number, "to": number|null, "rate": number}],
 "medicareLevy": number, "companyRate": number, "baseRateEntityRate": number, "smsfAccumulationRate": number,
 "smsfPensionRate": number, "cgtDiscount": {"individual": number, "trust": number, "smsf": number, "company": number},
 "reformNote": string, "sources": [{"label": string, "url": string}]}
Rates are decimals (0.3 for 30%).`

/** Asks Claude to re-read the ATO and returns a proposed reference set (not saved). */
export async function checkAtoForUpdates(): Promise<TaxReference> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.')
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4000,
    system: CHECK_PROMPT,
    messages: [{ role: 'user', content: 'Check the current ATO rates and return the JSON.' }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: SEARCH_LIMITS.taxReference, allowed_domains: ['ato.gov.au'] }],
  })
  const texts = response.content.filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
  const raw = texts.length ? texts[texts.length - 1].text : ''
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first === -1 || last <= first) throw new Error('Could not read rates from the ATO check.')
  const parsed = JSON.parse(raw.slice(first, last + 1)) as Partial<TaxReference>
  return {
    ...DEFAULT_TAX_REFERENCE,
    ...parsed,
    cgtDiscount: { ...DEFAULT_TAX_REFERENCE.cgtDiscount, ...(parsed.cgtDiscount ?? {}) },
    verifiedAt: new Date().toISOString().slice(0, 10),
    verifiedBy: 'ATO check (pending approval)',
  }
}
