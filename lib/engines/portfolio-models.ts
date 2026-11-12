import { supabase } from '../supabase'
import { DEFAULT_MODEL_ID } from '../model-context'

// Adviser models (migration 0028). Each adviser can run their own model
// portfolio; within the platform it carries the adviser's name, while
// proposals always present it to the client as the Ord Minnett house model.

const TABLE = 'portfolio_models'

export type PortfolioModel = {
  id: string
  adviserName: string
  ownerEmail: string | null
  copiedFrom: string | null
  createdAt: string
}

/** Every adviser model. Before migration 0028 there's just the original house model. */
export async function listPortfolioModels(): Promise<PortfolioModel[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: true })
  if (error || !data || data.length === 0) {
    return [{ id: DEFAULT_MODEL_ID, adviserName: 'Sean Allitt', ownerEmail: null, copiedFrom: null, createdAt: '' }]
  }
  return data.map((r) => ({
    id: r.id,
    adviserName: r.adviser_name,
    ownerEmail: r.owner_email,
    copiedFrom: r.copied_from,
    createdAt: r.created_at,
  }))
}

/** Records the signed-in adviser as the owner of an unclaimed model (e.g. Sean's, created by the migration). */
export async function claimModel(modelId: string, email: string): Promise<void> {
  await supabase.from(TABLE).update({ owner_email: email }).eq('id', modelId).is('owner_email', null)
}

export function modelLabel(model: Pick<PortfolioModel, 'adviserName'>): string {
  const first = model.adviserName.trim().split(/\s+/)[0]
  return `${first}'s model`
}

/**
 * Creates an adviser's own model as a copy of an existing one - every
 * security, in-class weight, yield and the asset allocation for each risk
 * profile - and publishes it as its first version. From then on the two
 * models are fully independent.
 */
export async function createModelFromCopy(input: {
  sourceModelId: string
  adviserName: string
  ownerEmail: string | null
}): Promise<PortfolioModel> {
  const base = input.adviserName.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'adviser'
  const existing = await listPortfolioModels()
  let id = base
  for (let n = 2; existing.some((m) => m.id === id); n++) id = `${base}${n}`

  const { data: created, error: createError } = await supabase
    .from(TABLE)
    .insert({ id, adviser_name: input.adviserName.trim(), owner_email: input.ownerEmail, copied_from: input.sourceModelId })
    .select('*')
    .single()
  if (createError) {
    throw new Error(
      createError.message.includes('portfolio_models')
        ? 'Run migration 0028 in Supabase to create adviser models.'
        : `Couldn't create the model: ${createError.message}`,
    )
  }

  const strip = <T extends Record<string, unknown>>(row: T) => {
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = row as Record<string, unknown>
    void _id
    void _c
    void _u
    return { ...rest, model_id: id }
  }

  const [secRes, weightRes] = await Promise.all([
    supabase.from('model_portfolio_securities').select('*').eq('model_id', input.sourceModelId),
    supabase.from('risk_profile_asset_class_weights').select('*').eq('model_id', input.sourceModelId),
  ])
  if (secRes.error) throw new Error(`Couldn't copy securities: ${secRes.error.message}`)
  if (weightRes.error) throw new Error(`Couldn't copy the asset allocation: ${weightRes.error.message}`)

  if ((secRes.data ?? []).length > 0) {
    const { error } = await supabase.from('model_portfolio_securities').insert((secRes.data ?? []).map(strip))
    if (error) throw new Error(`Couldn't copy securities: ${error.message}`)
  }
  if ((weightRes.data ?? []).length > 0) {
    const { error } = await supabase.from('risk_profile_asset_class_weights').insert((weightRes.data ?? []).map(strip))
    if (error) throw new Error(`Couldn't copy the asset allocation: ${error.message}`)
  }

  // Strategic allocation (migration 0033) - best effort, skipped if not yet run.
  const strategicRes = await supabase.from('risk_profile_strategic_weights').select('*').eq('model_id', input.sourceModelId)
  if (!strategicRes.error && (strategicRes.data ?? []).length > 0) {
    await supabase
      .from('risk_profile_strategic_weights')
      .insert((strategicRes.data ?? []).map((row) => {
        const { updated_at: _u, ...rest } = row as Record<string, unknown>
        void _u
        return { ...rest, model_id: id }
      }))
  }

  const { publishModelVersion } = await import('./model-versioning')
  await publishModelVersion({
    modelId: id,
    summary: `Model created for ${input.adviserName.trim()} as a copy of the ${input.sourceModelId} model.`,
    publishedBy: input.ownerEmail,
  }).catch(() => undefined)

  return {
    id: created.id,
    adviserName: created.adviser_name,
    ownerEmail: created.owner_email,
    copiedFrom: created.copied_from,
    createdAt: created.created_at,
  }
}
