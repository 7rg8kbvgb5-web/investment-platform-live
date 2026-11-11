import { supabase } from '../supabase'

// The advice file: every proposal PDF issued, stored under the review
// reference (never a client name), with a snapshot of exactly what it was
// based on - advice, model version, assumptions and fees - so it can be
// reproduced and referred back to (migration 0027).

const TABLE = 'proposal_records'
const BUCKET = 'research-documents'

export type ProposalRecord = {
  id: string
  reviewId: string
  reviewReference: string
  riskProfile: string | null
  modelVersion: number | null
  approach: string | null
  totalValue: number | null
  generatedBy: string | null
  generatedAt: string
  hasPdf: boolean
}

export async function recordProposal(input: {
  reviewId: string
  reviewReference: string
  riskProfile: string
  modelVersion: number | null
  approach: string
  totalValue: number | null
  pdf: Uint8Array
  snapshot: unknown
  generatedBy: string | null
}): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const path = `proposals/${input.reviewId}/${stamp}.pdf`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.pdf, { contentType: 'application/pdf', upsert: false })
  const { error } = await supabase.from(TABLE).insert({
    review_id: input.reviewId,
    review_reference: input.reviewReference,
    risk_profile: input.riskProfile,
    model_version: input.modelVersion,
    approach: input.approach,
    total_value: input.totalValue,
    storage_path: uploadError ? null : path,
    snapshot: input.snapshot,
    generated_by: input.generatedBy,
  })
  if (error) throw new Error(`Couldn't record the proposal: ${error.message}`)
}

export async function listProposalRecords(reviewId: string): Promise<ProposalRecord[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, review_id, review_reference, risk_profile, model_version, approach, total_value, generated_by, generated_at, storage_path')
    .eq('review_id', reviewId)
    .order('generated_at', { ascending: false })
  if (error) return []
  return (data ?? []).map((r) => ({
    id: r.id,
    reviewId: r.review_id,
    reviewReference: r.review_reference,
    riskProfile: r.risk_profile,
    modelVersion: r.model_version,
    approach: r.approach,
    totalValue: r.total_value === null ? null : Number(r.total_value),
    generatedBy: r.generated_by,
    generatedAt: r.generated_at,
    hasPdf: !!r.storage_path,
  }))
}

/** A short-lived link to an archived proposal PDF. */
export async function proposalDownloadUrl(id: string): Promise<string | null> {
  const { data } = await supabase.from(TABLE).select('storage_path').eq('id', id).maybeSingle()
  if (!data?.storage_path) return null
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(data.storage_path, 300)
  return signed?.signedUrl ?? null
}
