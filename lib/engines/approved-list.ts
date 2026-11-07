import { supabase } from '../supabase'
import { normaliseCode } from './codes'

// The Approved List: the universe the model portfolio may draw on. Lives
// in Supabase (migration 0019), replacing the old static security-master
// file. Every model holding is on it - adding a security to the model, or
// applying an IC-approved swap, adds it here automatically.

const TABLE = 'approved_securities'

export type ApprovedStatus = 'approved' | 'watchlist' | 'under_review' | 'removed'

export const APPROVED_STATUS_LABELS: Record<ApprovedStatus, string> = {
  approved: 'Approved',
  watchlist: 'Watchlist',
  under_review: 'Under review',
  removed: 'Removed',
}

export type ApprovedSecurity = {
  id: string
  code: string
  name: string
  assetClass: string | null
  sector: string | null
  status: ApprovedStatus
  notes: string | null
  addedBy: string | null
  icDecisionId: string | null
  createdAt: string
  updatedAt: string
}

type Row = {
  id: string
  code: string
  name: string
  asset_class: string | null
  sector: string | null
  status: ApprovedStatus
  notes: string | null
  added_by: string | null
  ic_decision_id: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: Row): ApprovedSecurity {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    assetClass: row.asset_class,
    sector: row.sector,
    status: row.status,
    notes: row.notes,
    addedBy: row.added_by,
    icDecisionId: row.ic_decision_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listApprovedSecurities(): Promise<ApprovedSecurity[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('code')
  if (error) throw new Error(`Failed to load the Approved List: ${error.message}`)
  return (data ?? []).map((row) => mapRow(row as Row))
}

/**
 * Adds a security, or - if it's already on the list - makes sure it's
 * approved (a security being put into the model can't stay on watchlist
 * or removed). Existing notes/asset class are kept.
 */
export async function ensureApproved(input: {
  code: string
  name: string
  assetClass?: string | null
  sector?: string | null
  notes?: string | null
  addedBy?: string | null
  icDecisionId?: string | null
}): Promise<void> {
  const code = normaliseCode(input.code)
  const { data: existing, error: readError } = await supabase.from(TABLE).select('*').eq('code', code).maybeSingle()
  if (readError) throw new Error(`Failed to check the Approved List: ${readError.message}`)

  if (existing) {
    const row = existing as Row
    const { error } = await supabase
      .from(TABLE)
      .update({
        status: 'approved',
        asset_class: row.asset_class ?? input.assetClass ?? null,
        sector: row.sector ?? input.sector ?? null,
        ic_decision_id: input.icDecisionId ?? row.ic_decision_id,
        notes: input.notes && row.status !== 'approved' ? input.notes : row.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    if (error) throw new Error(`Failed to update the Approved List: ${error.message}`)
    return
  }

  const { error } = await supabase.from(TABLE).insert({
    code,
    name: input.name,
    asset_class: input.assetClass ?? null,
    sector: input.sector ?? null,
    status: 'approved',
    notes: input.notes ?? null,
    added_by: input.addedBy ?? null,
    ic_decision_id: input.icDecisionId ?? null,
  })
  if (error) throw new Error(`Failed to add ${code} to the Approved List: ${error.message}`)
}

export async function addApprovedSecurity(input: {
  code: string
  name: string
  assetClass?: string | null
  sector?: string | null
  status?: ApprovedStatus
  notes?: string | null
  addedBy?: string | null
}): Promise<ApprovedSecurity> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      code: normaliseCode(input.code),
      name: input.name.trim(),
      asset_class: input.assetClass ?? null,
      sector: input.sector?.trim() || null,
      status: input.status ?? 'approved',
      notes: input.notes?.trim() || null,
      added_by: input.addedBy ?? null,
    })
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') throw new Error(`${normaliseCode(input.code)} is already on the Approved List.`)
    throw new Error(`Failed to add to the Approved List: ${error.message}`)
  }
  return mapRow(data as Row)
}

export async function updateApprovedStatus(id: string, status: ApprovedStatus, notes?: string | null): Promise<void> {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (notes !== undefined) update.notes = notes
  const { error } = await supabase.from(TABLE).update(update).eq('id', id)
  if (error) throw new Error(`Failed to update the Approved List: ${error.message}`)
}
