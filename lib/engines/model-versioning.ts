import { supabase } from '../supabase'

// The model's memory. Every edit to the house model is logged here with
// before/after values, who made it and when; published versions snapshot
// the whole model so client advice can be tied to the exact model it was
// built against.

const LOG_TABLE = 'model_change_log'
const VERSIONS_TABLE = 'model_versions'

export type ModelChangeType =
  | 'security_added'
  | 'security_removed'
  | 'security_swapped'
  | 'in_class_weight'
  | 'asset_class_weight'
  | 'yield'
  | 'holding_type'

export type ModelChange = {
  id: string
  changeType: ModelChangeType
  riskProfile: string | null
  assetClass: string | null
  code: string | null
  beforeValue: unknown
  afterValue: unknown
  description: string
  changedBy: string | null
  icDecisionId: string | null
  createdAt: string
}

export type ModelVersion = {
  version: number
  summary: string
  publishedBy: string | null
  icDecisionId: string | null
  publishedAt: string
}

/** The signed-in adviser's email in the browser; null on the server (callers pass an explicit name there). */
export async function currentUserEmail(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const { data } = await supabase.auth.getUser()
    return data.user?.email ?? null
  } catch {
    return null
  }
}

/**
 * Best effort: a failed log write never blocks the edit itself, but is
 * reported to the console so it can be spotted.
 */
export async function logModelChange(entry: {
  changeType: ModelChangeType
  description: string
  riskProfile?: string | null
  assetClass?: string | null
  code?: string | null
  before?: unknown
  after?: unknown
  changedBy?: string | null
  icDecisionId?: string | null
}): Promise<void> {
  const changedBy = entry.changedBy ?? (await currentUserEmail())
  const { error } = await supabase.from(LOG_TABLE).insert({
    change_type: entry.changeType,
    description: entry.description,
    risk_profile: entry.riskProfile ?? null,
    asset_class: entry.assetClass ?? null,
    code: entry.code ?? null,
    before_value: entry.before === undefined ? null : entry.before,
    after_value: entry.after === undefined ? null : entry.after,
    changed_by: changedBy,
    ic_decision_id: entry.icDecisionId ?? null,
  })
  if (error) console.error('Failed to log model change:', error.message)
}

type ChangeRow = {
  id: string
  change_type: ModelChangeType
  risk_profile: string | null
  asset_class: string | null
  code: string | null
  before_value: unknown
  after_value: unknown
  description: string
  changed_by: string | null
  ic_decision_id: string | null
  created_at: string
}

type VersionRow = {
  version: number
  summary: string
  published_by: string | null
  ic_decision_id: string | null
  published_at: string
}

function mapChange(row: ChangeRow): ModelChange {
  return {
    id: row.id,
    changeType: row.change_type,
    riskProfile: row.risk_profile,
    assetClass: row.asset_class,
    code: row.code,
    beforeValue: row.before_value,
    afterValue: row.after_value,
    description: row.description,
    changedBy: row.changed_by,
    icDecisionId: row.ic_decision_id,
    createdAt: row.created_at,
  }
}

function mapVersion(row: VersionRow): ModelVersion {
  return {
    version: row.version,
    summary: row.summary,
    publishedBy: row.published_by,
    icDecisionId: row.ic_decision_id,
    publishedAt: row.published_at,
  }
}

export async function getLatestModelVersion(): Promise<ModelVersion | null> {
  const { data, error } = await supabase
    .from(VERSIONS_TABLE)
    .select('version, summary, published_by, ic_decision_id, published_at')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Failed to load model version: ${error.message}`)
  return data ? mapVersion(data as VersionRow) : null
}

export async function listModelVersions(limit = 20): Promise<ModelVersion[]> {
  const { data, error } = await supabase
    .from(VERSIONS_TABLE)
    .select('version, summary, published_by, ic_decision_id, published_at')
    .order('version', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Failed to load model versions: ${error.message}`)
  return (data ?? []).map((row) => mapVersion(row as VersionRow))
}

export async function listModelChanges(limit = 100): Promise<ModelChange[]> {
  const { data, error } = await supabase
    .from(LOG_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Failed to load model change log: ${error.message}`)
  return (data ?? []).map((row) => mapChange(row as ChangeRow))
}

/** Changes made since the latest published version - i.e. not yet signed off as a version. */
export async function listUnpublishedChanges(): Promise<ModelChange[]> {
  const latest = await getLatestModelVersion()
  let query = supabase.from(LOG_TABLE).select('*').order('created_at', { ascending: false })
  if (latest) query = query.gt('created_at', latest.publishedAt)
  const { data, error } = await query
  if (error) throw new Error(`Failed to load unpublished changes: ${error.message}`)
  return (data ?? []).map((row) => mapChange(row as ChangeRow))
}

/** Snapshots the whole model as the next version number. */
export async function publishModelVersion(input: {
  summary: string
  publishedBy?: string | null
  icDecisionId?: string | null
}): Promise<ModelVersion> {
  const summary = input.summary.trim()
  if (!summary) throw new Error('Describe what changed in this version.')

  const [securitiesRes, weightsRes, latest] = await Promise.all([
    supabase.from('model_portfolio_securities').select('*').order('asset_class').order('display_order'),
    supabase.from('risk_profile_asset_class_weights').select('*'),
    getLatestModelVersion(),
  ])
  if (securitiesRes.error) throw new Error(`Failed to snapshot securities: ${securitiesRes.error.message}`)
  if (weightsRes.error) throw new Error(`Failed to snapshot weights: ${weightsRes.error.message}`)

  const publishedBy = input.publishedBy ?? (await currentUserEmail())
  const { data, error } = await supabase
    .from(VERSIONS_TABLE)
    .insert({
      version: (latest?.version ?? 0) + 1,
      summary,
      published_by: publishedBy,
      ic_decision_id: input.icDecisionId ?? null,
      snapshot: { securities: securitiesRes.data ?? [], weights: weightsRes.data ?? [] },
    })
    .select('version, summary, published_by, ic_decision_id, published_at')
    .single()
  if (error) throw new Error(`Failed to publish model version: ${error.message}`)
  return mapVersion(data as VersionRow)
}
