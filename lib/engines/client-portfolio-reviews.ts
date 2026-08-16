import { supabase } from '../supabase'
import type { UploadedHolding } from './client-portfolio-upload'
import type { RiskProfile } from './model-portfolios'
import type { AssetClassWeightOverrides, HoldingWeightOverrides } from './client-weight-overrides'

const TABLE = 'client_portfolio_reviews'

export type ExtractionMeta = {
  clientName: string | null
  asAtDate: string | null
  totalPortfolioValue: number | null
}

export type ClientPortfolioReviewState = {
  holdings: UploadedHolding[]
  meta: ExtractionMeta
  riskOverride: RiskProfile | 'auto'
  manualPortfolioValue: string
  additionalCash: string
  assetClassOverrides: AssetClassWeightOverrides
  holdingOverrides: HoldingWeightOverrides
}

export type ClientPortfolioReview = {
  id: string
  clientName: string
  updatedAt: string
  state: ClientPortfolioReviewState
}

type ReviewRow = {
  id: string
  client_name: string
  risk_override: string | null
  manual_portfolio_value: string | null
  additional_cash: string | null
  holdings: UploadedHolding[]
  extraction_meta: ExtractionMeta
  asset_class_overrides: AssetClassWeightOverrides
  holding_overrides: HoldingWeightOverrides
  updated_at: string
}

function mapRow(row: ReviewRow): ClientPortfolioReview {
  return {
    id: row.id,
    clientName: row.client_name,
    updatedAt: row.updated_at,
    state: {
      holdings: row.holdings ?? [],
      meta: row.extraction_meta ?? { clientName: null, asAtDate: null, totalPortfolioValue: null },
      riskOverride: (row.risk_override as RiskProfile | 'auto' | null) ?? 'auto',
      manualPortfolioValue: row.manual_portfolio_value ?? '',
      additionalCash: row.additional_cash ?? '',
      assetClassOverrides: row.asset_class_overrides ?? {},
      holdingOverrides: row.holding_overrides ?? {},
    },
  }
}

/** Every saved review, most recently updated first - for a "resume a client" picker. */
export async function listClientReviews(): Promise<{ id: string; clientName: string; updatedAt: string }[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, client_name, updated_at')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to load saved client reviews: ${error.message}`)
  return (data ?? []).map((row) => ({
    id: row.id,
    clientName: row.client_name,
    updatedAt: row.updated_at,
  }))
}

export async function fetchClientReview(id: string): Promise<ClientPortfolioReview> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
  if (error) throw new Error(`Failed to load client review: ${error.message}`)
  return mapRow(data as ReviewRow)
}

/**
 * Creates a new review if `id` is null/undefined, otherwise updates the
 * existing one in place. Called on a debounce as the adviser works, so a
 * client's review is never more than a couple of seconds of typing away
 * from being safe - closing the tab and coming back tomorrow picks up
 * exactly where it left off, without touching the house model at all.
 */
export async function saveClientReview(
  id: string | null,
  clientName: string,
  state: ClientPortfolioReviewState,
): Promise<string> {
  const payload = {
    client_name: clientName,
    risk_override: state.riskOverride,
    manual_portfolio_value: state.manualPortfolioValue,
    additional_cash: state.additionalCash,
    holdings: state.holdings,
    extraction_meta: state.meta,
    asset_class_overrides: state.assetClassOverrides,
    holding_overrides: state.holdingOverrides,
    updated_at: new Date().toISOString(),
  }

  if (id) {
    const { error } = await supabase.from(TABLE).update(payload).eq('id', id)
    if (error) throw new Error(`Failed to save client review: ${error.message}`)
    return id
  }

  const { data, error } = await supabase.from(TABLE).insert(payload).select('id').single()
  if (error) throw new Error(`Failed to save client review: ${error.message}`)
  return (data as { id: string }).id
}

export async function deleteClientReview(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw new Error(`Failed to delete client review: ${error.message}`)
}
