import { supabase } from '../supabase'
import type { UploadedHolding } from './client-portfolio-upload'
import type { RiskProfile } from './model-portfolios'
import type { AssetClassWeightOverrides, HoldingWeightOverrides } from './client-weight-overrides'
import type { TradeOverrides } from './portfolio-review-comparison'
import type { CgtSettings } from '../tax/cgt'

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
  /** 'new-money' = a lump sum being invested with no existing portfolio (additionalCash holds the amount). */
  entryMode?: 'portfolio' | 'new-money'
  /** Adviser-adjusted trade sizes (migration 0024). Written only when set, or when clearing ones that were set. */
  tradeOverrides?: TradeOverrides
  /** House model version this review was last saved against (migration 0019). */
  modelVersion?: number | null
}

export type ClientStatus = 'in_progress' | 'proposed' | 'implemented'

/** Capital gains settings for a review (migration 0025). */
export async function saveCgtSettings(id: string, settings: CgtSettings): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ cgt_settings: settings }).eq('id', id)
  if (error) {
    throw new Error(
      error.message.includes('cgt_settings')
        ? 'Run migration 0025 in Supabase to save capital gains settings.'
        : `Failed to save capital gains settings: ${error.message}`,
    )
  }
}

export type ClientPortfolioReview = {
  id: string
  clientName: string
  updatedAt: string
  state: ClientPortfolioReviewState
  /** Advice lifecycle (migration 0021). */
  status: ClientStatus
  adviceApproach: 'rebalance' | 'new-cash' | null
  adviserNotes: string
  proposedAt: string | null
  implementedAt: string | null
  cgtSettings: CgtSettings | null
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
  entry_mode?: string | null
  model_version?: number | null
  trade_overrides?: TradeOverrides | null
  status?: ClientStatus | null
  advice_approach?: 'rebalance' | 'new-cash' | null
  adviser_notes?: string | null
  proposed_at?: string | null
  implemented_at?: string | null
  cgt_settings?: CgtSettings | null
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
      entryMode: row.entry_mode === 'new-money' ? 'new-money' : 'portfolio',
      modelVersion: row.model_version ?? null,
      tradeOverrides: row.trade_overrides ?? {},
    },
    status: row.status ?? 'in_progress',
    adviceApproach: row.advice_approach ?? null,
    adviserNotes: row.adviser_notes ?? '',
    proposedAt: row.proposed_at ?? null,
    implementedAt: row.implemented_at ?? null,
    cgtSettings: row.cgt_settings ?? null,
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

/** Every review in full - for the client register and drift monitoring. */
export async function listClientReviewsFull(): Promise<ClientPortfolioReview[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('updated_at', { ascending: false })
  if (error) throw new Error(`Failed to load client reviews: ${error.message}`)
  return (data ?? []).map((row) => mapRow(row as ReviewRow))
}

/** Advice-stage fields, set from the Client Advice tab (migration 0021). */
export async function updateClientAdvice(
  id: string,
  fields: {
    status?: ClientStatus
    adviceApproach?: 'rebalance' | 'new-cash'
    adviserNotes?: string
    proposalSnapshot?: unknown
  },
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (fields.adviceApproach) update.advice_approach = fields.adviceApproach
  if (fields.adviserNotes !== undefined) update.adviser_notes = fields.adviserNotes
  if (fields.status) {
    update.status = fields.status
    if (fields.status === 'proposed') update.proposed_at = new Date().toISOString()
    if (fields.status === 'implemented') update.implemented_at = new Date().toISOString()
  }
  if (fields.proposalSnapshot !== undefined) update.proposal_snapshot = fields.proposalSnapshot
  if (Object.keys(update).length === 0) return
  const { error } = await supabase.from(TABLE).update(update).eq('id', id)
  if (error) throw new Error(`Failed to update client advice: ${error.message}`)
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
  const payload: Record<string, unknown> = {
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
  // Only written for new-money reviews, so ordinary portfolio reviews keep
  // saving even before migration 0017 (which adds the column) has been run.
  if (state.entryMode === 'new-money') payload.entry_mode = 'new-money'
  if (typeof state.modelVersion === 'number') payload.model_version = state.modelVersion
  if (state.tradeOverrides !== undefined) payload.trade_overrides = state.tradeOverrides

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
