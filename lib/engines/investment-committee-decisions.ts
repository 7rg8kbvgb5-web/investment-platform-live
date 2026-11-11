import { supabase } from '../supabase'
import { DEFAULT_MODEL_ID, isMissingModelColumn, resolveModelId } from '../model-context'
import { fetchCoreSecurities, RISK_PROFILES } from './model-portfolio-core'
import { normaliseCode } from './codes'
import { ensureApproved } from './approved-list'
import { logModelChange, publishModelVersion } from './model-versioning'
import { getLatestTacticalAssetClassView } from './tactical-asset-view'
import { getLatestSectorHealthScores } from './sector-health-live'
import { computeConvictionRating } from './conviction-rating'
import { listCurrentTopIdeas } from './research-library'

// Investment Committee decision queue - where every input that could change
// the house model gets a formal decision.
//
// Three kinds of proposal:
//   swap       - replace a model holding with a named alternative. Raised by
//                Monitoring / Fund Review scans or manually.
//   allocation - tilt an asset class's weight across the risk profiles.
//                Raised from Tactical View overweight/underweight calls.
//   review     - put a holding, or a sector's holdings, in front of the
//                committee. Raised when conviction turns negative or a
//                sector's health score deteriorates.
//
// Every decision is recorded with rationale, decider and date. Approved
// swaps and allocation changes can be applied to the house model in one
// step, which logs the change and publishes a new model version.

const TABLE = 'investment_committee_decisions'
const SECURITIES_TABLE = 'model_portfolio_securities'
const WEIGHTS_TABLE = 'risk_profile_asset_class_weights'

export type ProposalType = 'swap' | 'allocation' | 'review'
export type DecisionSource = 'monitoring' | 'fund_review' | 'manual' | 'tactical' | 'conviction' | 'sector_health' | 'house_view'
export type DecisionStatus = 'pending' | 'approved' | 'rejected' | 'deferred'
export type DecisionSeverity = 'critical' | 'high' | 'medium' | 'low'

export const DEFAULT_TACTICAL_TILT_PP = 2

export type CommitteeDecision = {
  id: string
  /** The adviser model this decision belongs to - each adviser approves their own (migration 0028). */
  modelId: string
  proposalType: ProposalType
  source: DecisionSource
  sourceAlertId: string | null
  sourceKey: string | null
  assetClass: string | null
  currentCode: string | null
  currentName: string | null
  proposedCode: string | null
  proposedName: string | null
  /** Allocation proposals: which risk profiles the tilt applies to (null = all). */
  riskProfiles: string[] | null
  /** Allocation proposals: percentage points added to the asset class (negative = reduce). */
  tiltPp: number | null
  /** Allocation proposals: the asset class that funds (or absorbs) the tilt. */
  offsetAssetClass: string | null
  title: string
  reasoning: string
  severity: DecisionSeverity
  status: DecisionStatus
  decisionRationale: string | null
  decidedBy: string | null
  decidedAt: string | null
  appliedToModel: boolean
  appliedAt: string | null
  createdAt: string
}

type DecisionRow = {
  id: string
  model_id?: string | null
  proposal_type: ProposalType | null
  source: DecisionSource
  source_alert_id: string | null
  source_key: string | null
  asset_class: string | null
  current_code: string | null
  current_name: string | null
  proposed_code: string | null
  proposed_name: string | null
  risk_profiles: string[] | null
  tilt_pp: number | null
  offset_asset_class: string | null
  title: string
  reasoning: string
  severity: DecisionSeverity
  status: DecisionStatus
  decision_rationale: string | null
  decided_by: string | null
  decided_at: string | null
  applied_to_model: boolean
  applied_at: string | null
  created_at: string
}

function mapRow(row: DecisionRow): CommitteeDecision {
  return {
    id: row.id,
    modelId: row.model_id ?? DEFAULT_MODEL_ID,
    proposalType: row.proposal_type ?? 'swap',
    source: row.source,
    sourceAlertId: row.source_alert_id,
    sourceKey: row.source_key ?? null,
    assetClass: row.asset_class,
    currentCode: row.current_code,
    currentName: row.current_name,
    proposedCode: row.proposed_code,
    proposedName: row.proposed_name,
    riskProfiles: row.risk_profiles ?? null,
    tiltPp: row.tilt_pp === null || row.tilt_pp === undefined ? null : Number(row.tilt_pp),
    offsetAssetClass: row.offset_asset_class ?? null,
    title: row.title,
    reasoning: row.reasoning,
    severity: row.severity,
    status: row.status,
    decisionRationale: row.decision_rationale,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    appliedToModel: row.applied_to_model,
    appliedAt: row.applied_at,
    createdAt: row.created_at,
  }
}

/** One adviser model's queue (the selected model unless one is passed). */
export async function listCommitteeDecisions(modelId?: string | null): Promise<CommitteeDecision[]> {
  const query = () => supabase.from(TABLE).select('*').order('created_at', { ascending: false })
  let { data, error } = await query().eq('model_id', resolveModelId(modelId))
  if (isMissingModelColumn(error)) ({ data, error } = await query())
  if (error) throw new Error(`Failed to load Investment Committee queue: ${error.message}`)
  return (data ?? []).map((row) => mapRow(row as DecisionRow))
}

/** Approved swaps - used to flag affected holdings in a client's Construction review. */
export async function listApprovedSwaps(modelId?: string | null, options: { allModels?: boolean } = {}): Promise<CommitteeDecision[]> {
  const query = () => supabase.from(TABLE).select('*').eq('status', 'approved').order('decided_at', { ascending: false })
  let { data, error } = options.allModels ? await query() : await query().eq('model_id', resolveModelId(modelId))
  if (isMissingModelColumn(error)) ({ data, error } = await query())
  if (error) throw new Error(`Failed to load approved swaps: ${error.message}`)
  return (data ?? [])
    .map((row) => mapRow(row as DecisionRow))
    .filter((d) => d.proposalType === 'swap' && d.currentCode && d.proposedCode)
}

// --- Sync: pull every input into the queue ---

type Insert = Partial<Omit<DecisionRow, 'id' | 'created_at'>> & {
  source: DecisionSource
  title: string
  reasoning: string
}

type MonitoringAltRow = {
  id: string
  title: string
  summary: string
  severity: DecisionSeverity
  affected_asset_class: string | null
  affected_codes: string[] | null
  suggested_alternative_code: string | null
  suggested_alternative_name: string | null
}

type FundAltRow = {
  id: string
  fund_code: string
  fund_name: string
  title: string
  summary: string
  severity: DecisionSeverity
  suggested_alternative_code: string | null
  suggested_alternative_name: string | null
}

export type SyncResult = { added: number; bySource: Partial<Record<DecisionSource, number>>; warnings: string[] }

/**
 * Pulls every input into the queue: named swaps from Monitoring and Fund
 * Reviews, overweight/underweight calls from the Tactical View, holdings
 * whose conviction has turned negative, and sectors rated Underweight by
 * Sector Health. Safe to call repeatedly - an item already queued (same
 * alert, or same source key) is skipped, and so is anything that already
 * has an open (pending/deferred) item for the same subject.
 *
 * Pass includeConviction=false to skip the conviction pass (it reads three
 * research sources per model holding).
 */
export async function syncProposals(options: { includeConviction?: boolean } = {}): Promise<SyncResult> {
  // Every adviser model gets its own queue: scan findings are raised in each
  // model that holds the affected security.
  const { data: models, error: modelsError } = await supabase.from('portfolio_models').select('id')
  const modelIds = modelsError || !models || models.length === 0 ? [DEFAULT_MODEL_ID] : models.map((m: { id: string }) => m.id)
  const total: SyncResult = { added: 0, bySource: {}, warnings: [] }
  for (const modelId of modelIds) {
    const r = await syncProposalsForModel(modelId, options, !modelsError)
    total.added += r.added
    for (const [k, v] of Object.entries(r.bySource)) total.bySource[k as DecisionSource] = (total.bySource[k as DecisionSource] ?? 0) + (v ?? 0)
    for (const w of r.warnings) if (!total.warnings.includes(w)) total.warnings.push(w)
  }
  return total
}

async function syncProposalsForModel(
  modelId: string,
  options: { includeConviction?: boolean },
  modelAware: boolean,
): Promise<SyncResult> {
  const includeConviction = options.includeConviction ?? true
  const warnings: string[] = []

  const [monitoringRes, fundRes, existingRes, securities] = await Promise.all([
    supabase
      .from('investment_monitoring_alerts')
      .select(
        'id, title, summary, severity, affected_asset_class, affected_codes, suggested_alternative_code, suggested_alternative_name',
      )
      .eq('category', 'alternative')
      .neq('status', 'dismissed')
      .not('suggested_alternative_code', 'is', null),
    supabase
      .from('fund_review_alerts')
      .select('id, fund_code, fund_name, title, summary, severity, suggested_alternative_code, suggested_alternative_name')
      .eq('category', 'alternative')
      .neq('status', 'dismissed')
      .not('suggested_alternative_code', 'is', null),
    modelAware ? supabase.from(TABLE).select('*').eq('model_id', modelId) : supabase.from(TABLE).select('*'),
    fetchCoreSecurities(modelId),
  ])

  if (existingRes.error) throw new Error(`Failed to read Investment Committee queue: ${existingRes.error.message}`)
  if (monitoringRes.error) warnings.push(`Monitoring alerts unavailable: ${monitoringRes.error.message}`)
  if (fundRes.error) warnings.push(`Fund Review alerts unavailable: ${fundRes.error.message}`)

  const existing = ((existingRes.data ?? []) as DecisionRow[]).map(mapRow)
  const open = existing.filter((d) => d.status === 'pending' || d.status === 'deferred')
  const queuedAlertIds = new Set(existing.map((d) => d.sourceAlertId).filter(Boolean))
  const queuedKeys = new Set(existing.map((d) => d.sourceKey).filter(Boolean))
  const openSubjects = new Set(open.map(subjectKey))

  const securityByCode = new Map(securities.map((s) => [normaliseCode(s.code), s]))
  const inserts: Insert[] = []

  function consider(entry: Insert) {
    if (modelAware) entry.model_id = modelId
    if (entry.source_alert_id && queuedAlertIds.has(entry.source_alert_id)) return
    if (entry.source_key && queuedKeys.has(entry.source_key)) return
    const subject = subjectKeyFromInsert(entry)
    if (openSubjects.has(subject)) return
    openSubjects.add(subject)
    if (entry.source_key) queuedKeys.add(entry.source_key)
    inserts.push(entry)
  }

  // 1. Named swaps from Monitoring.
  for (const alert of (monitoringRes.data ?? []) as MonitoringAltRow[]) {
    const currentCode = alert.affected_codes?.[0]
    if (!currentCode || !alert.suggested_alternative_code) continue
    const held = securityByCode.get(normaliseCode(currentCode))
    if (!held) continue // not in this adviser's model
    consider({
      proposal_type: 'swap',
      source: 'monitoring',
      source_alert_id: alert.id,
      asset_class: held?.assetClass ?? alert.affected_asset_class,
      current_code: currentCode,
      current_name: held?.name ?? null,
      proposed_code: alert.suggested_alternative_code,
      proposed_name: alert.suggested_alternative_name,
      title: alert.title,
      reasoning: alert.summary,
      severity: alert.severity,
    })
  }

  // 2. Named swaps from Fund Reviews.
  for (const alert of (fundRes.data ?? []) as FundAltRow[]) {
    if (!alert.suggested_alternative_code) continue
    const held = securityByCode.get(normaliseCode(alert.fund_code))
    if (!held) continue // not in this adviser's model
    consider({
      proposal_type: 'swap',
      source: 'fund_review',
      source_alert_id: alert.id,
      asset_class: held?.assetClass ?? null,
      current_code: alert.fund_code,
      current_name: held?.name ?? alert.fund_name,
      proposed_code: alert.suggested_alternative_code,
      proposed_name: alert.suggested_alternative_name,
      title: alert.title,
      reasoning: alert.summary,
      severity: alert.severity,
    })
  }

  // 3. Tactical View calls -> allocation tilts across all risk profiles.
  try {
    const view = await getLatestTacticalAssetClassView()
    for (const call of view?.calls ?? []) {
      if (call.stance === 'N') continue
      const tilt = call.stance === 'OW' ? DEFAULT_TACTICAL_TILT_PP : -DEFAULT_TACTICAL_TILT_PP
      const offset = call.assetClass === 'Cash' ? 'Australian Fixed Interest' : 'Cash'
      consider({
        proposal_type: 'allocation',
        source: 'tactical',
        source_key: `tactical:${view!.id}:${call.assetClass}`,
        asset_class: call.assetClass,
        risk_profiles: null,
        tilt_pp: tilt,
        offset_asset_class: offset,
        title: `Tactical ${call.stance === 'OW' ? 'overweight' : 'underweight'}: ${call.assetClass}`,
        reasoning: call.rationale,
        severity: 'medium',
      })
    }
  } catch (err) {
    warnings.push(`Tactical View unavailable: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 4. Sector Health -> review of the model's holdings in a deteriorating sector.
  try {
    const scores = await getLatestSectorHealthScores()
    for (const score of scores) {
      if (score.recommendation !== 'Underweight' && score.recommendation !== 'Strong Underweight') continue
      const holdings = securities.filter((s) => (s.sector ?? s.assetClass) === score.sector)
      if (holdings.length === 0) continue
      consider({
        proposal_type: 'review',
        source: 'sector_health',
        source_key: `sector:${score.scanId}:${score.sector}`,
        asset_class: holdings[0].assetClass,
        current_code: holdings.length === 1 ? holdings[0].code : null,
        current_name: holdings.length === 1 ? holdings[0].name : null,
        title: `Sector review: ${score.sector} rated ${score.recommendation} (score ${Math.round(score.totalScore)})`,
        reasoning: `${score.rationale ?? 'Sector health has deteriorated.'} Model holdings in this sector: ${holdings
          .map((h) => h.code)
          .join(', ')}.`,
        severity: score.recommendation === 'Strong Underweight' ? 'high' : 'medium',
      })
    }
  } catch (err) {
    warnings.push(`Sector Health unavailable: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 5. House Top Ideas the model doesn't hold -> review: should it be in the model?
  try {
    const topIdeas = await listCurrentTopIdeas()
    for (const list of topIdeas) {
      if (list.source === 'Other') continue
      for (const idea of list.ideas) {
        if (securityByCode.has(normaliseCode(idea.code))) continue
        consider({
          proposal_type: 'review',
          source: 'house_view',
          source_key: `house_view:${list.documentId}:${normaliseCode(idea.code)}`,
          current_code: idea.code,
          current_name: idea.name,
          title: `${list.source} Top Idea not held in the model: ${idea.code}${idea.name ? ` (${idea.name})` : ''}`,
          reasoning: `${idea.code} is on ${list.source}'s current Top Ideas list ("${list.title}")${idea.rating ? `, rated ${idea.rating}` : ''}${idea.priceTarget !== null ? ` with a price target of ${idea.priceTarget}` : ''}. ${idea.note ?? ''} The model doesn't hold it - the committee should decide whether it belongs, and if so what it would replace.`.trim(),
          severity: 'medium',
        })
      }
    }
  } catch (err) {
    warnings.push(`Top Ideas unavailable: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 6. Conviction -> review of any model holding whose combined view has turned negative.
  if (includeConviction) {
    const results = await Promise.all(
      securities.map(async (s) => {
        try {
          return { s, rating: await computeConvictionRating(s.code) }
        } catch {
          return { s, rating: null }
        }
      }),
    )
    for (const { s, rating } of results) {
      if (!rating || (rating.houseView !== 'negative' && rating.houseView !== 'strong-negative')) continue
      const sources = rating.sources.map((src) => `${src.source}: ${src.rating}`).join('; ')
      consider({
        proposal_type: 'review',
        source: 'conviction',
        source_key: `conviction:${normaliseCode(s.code)}:${rating.houseView}`,
        asset_class: s.assetClass,
        current_code: s.code,
        current_name: s.name,
        title: `Conviction turned ${rating.houseView.replace('-', ' ')}: ${s.code}`,
        reasoning: `Combined research view on ${s.name} is now ${rating.houseView.replace('-', ' ')} (${sources}). The committee should decide whether to retain it or find a replacement.`,
        severity: rating.houseView === 'strong-negative' ? 'high' : 'medium',
      })
    }
  }

  const bySource: Partial<Record<DecisionSource, number>> = {}
  for (const i of inserts) bySource[i.source] = (bySource[i.source] ?? 0) + 1

  if (inserts.length > 0) {
    const { error } = await supabase.from(TABLE).insert(inserts)
    if (error) {
      // Before migration 0020, only swaps can be stored - fall back to those.
      const swapsOnly = inserts.filter((i) => i.proposal_type === 'swap' && (i.source === 'monitoring' || i.source === 'fund_review'))
      if (swapsOnly.length > 0 && swapsOnly.length < inserts.length) {
        const legacy = swapsOnly.map(({ proposal_type: _pt, source_key: _sk, risk_profiles: _rp, tilt_pp: _t, offset_asset_class: _o, ...rest }) => rest)
        const { error: legacyError } = await supabase.from(TABLE).insert(legacy)
        if (legacyError) throw new Error(`Failed to add proposals to the queue: ${legacyError.message}`)
        warnings.push('Only swaps were added - run migration 0020 to queue tactical, sector and conviction items.')
        return { added: swapsOnly.length, bySource: {}, warnings }
      }
      throw new Error(`Failed to add proposals to the queue: ${error.message}`)
    }
  }

  return { added: inserts.length, bySource, warnings }
}

/** Kept for existing callers. */
export async function syncProposedSwaps(): Promise<number> {
  const result = await syncProposals({ includeConviction: false })
  return result.added
}

function subjectKey(d: CommitteeDecision): string {
  if (d.proposalType === 'allocation') return `allocation:${d.assetClass}`
  if (d.proposalType === 'review') return `review:${d.currentCode ? normaliseCode(d.currentCode) : d.title}`
  return `swap:${normaliseCode(d.currentCode ?? '')}->${normaliseCode(d.proposedCode ?? '')}`
}

function subjectKeyFromInsert(i: Insert): string {
  const type = i.proposal_type ?? 'swap'
  if (type === 'allocation') return `allocation:${i.asset_class}`
  if (type === 'review') return `review:${i.current_code ? normaliseCode(i.current_code) : i.title}`
  return `swap:${normaliseCode(i.current_code ?? '')}->${normaliseCode(i.proposed_code ?? '')}`
}

// --- Manual proposals ---

export async function createManualProposal(input: {
  currentCode: string
  proposedCode: string
  proposedName?: string | null
  reasoning: string
  severity?: DecisionSeverity
  modelId?: string | null
}): Promise<CommitteeDecision> {
  const model = resolveModelId(input.modelId)
  const securities = await fetchCoreSecurities(model)
  const held = securities.find((s) => normaliseCode(s.code) === normaliseCode(input.currentCode))
  if (!held) {
    throw new Error(`${input.currentCode.toUpperCase()} isn't in the model portfolio, so there's nothing to swap out.`)
  }
  const proposedCode = input.proposedCode.trim().toUpperCase()
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      model_id: model,
      source: 'manual',
      asset_class: held.assetClass,
      current_code: held.code,
      current_name: held.name,
      proposed_code: proposedCode,
      proposed_name: input.proposedName?.trim() || null,
      title: `Replace ${held.code} with ${proposedCode}`,
      reasoning: input.reasoning.trim(),
      severity: input.severity ?? 'medium',
    })
    .select('*')
    .single()
  if (error) throw new Error(`Failed to add proposal: ${error.message}`)
  return mapRow(data as DecisionRow)
}

// --- Decisions ---

/**
 * Records the committee's decision. A rationale and decider are required.
 * For allocation proposals the committee can adjust the tilt size and the
 * funding asset class as part of the decision. The scan alert that raised
 * a swap (if any) is marked reviewed so it stops showing as new.
 */
export async function recordDecision(input: {
  id: string
  status: Exclude<DecisionStatus, 'pending'>
  rationale: string
  decidedBy: string
  tiltPp?: number | null
  offsetAssetClass?: string | null
}): Promise<CommitteeDecision> {
  const rationale = input.rationale.trim()
  const decidedBy = input.decidedBy.trim()
  if (!rationale) throw new Error('A rationale is required for the decision record.')
  if (!decidedBy) throw new Error('Record who made the decision.')

  const update: Record<string, unknown> = {
    status: input.status,
    decision_rationale: rationale,
    decided_by: decidedBy,
    decided_at: new Date().toISOString(),
  }
  if (typeof input.tiltPp === 'number' && Number.isFinite(input.tiltPp)) update.tilt_pp = input.tiltPp
  if (input.offsetAssetClass) update.offset_asset_class = input.offsetAssetClass

  const { data, error } = await supabase.from(TABLE).update(update).eq('id', input.id).select('*').single()
  if (error) throw new Error(`Failed to record decision: ${error.message}`)
  const decision = mapRow(data as DecisionRow)

  if (decision.sourceAlertId && (decision.source === 'monitoring' || decision.source === 'fund_review')) {
    const alertTable = decision.source === 'monitoring' ? 'investment_monitoring_alerts' : 'fund_review_alerts'
    await supabase.from(alertTable).update({ status: 'reviewed' }).eq('id', decision.sourceAlertId)
  }

  return decision
}

// --- Applying approved changes to the house model ---

export async function applySwapToModel(id: string): Promise<CommitteeDecision> {
  const { data: row, error: readError } = await supabase.from(TABLE).select('*').eq('id', id).single()
  if (readError) throw new Error(`Failed to load decision: ${readError.message}`)
  const decision = mapRow(row as DecisionRow)
  if (decision.status !== 'approved') throw new Error('Only approved proposals can be applied to the model.')
  if (decision.appliedToModel) throw new Error('This has already been applied to the model.')

  if (decision.proposalType === 'allocation') await applyAllocation(decision)
  else if (decision.proposalType === 'swap') await applySwap(decision)
  else throw new Error('A review decision has nothing to apply directly - raise a swap if a replacement is needed.')

  const { data: updated, error: markError } = await supabase
    .from(TABLE)
    .update({ applied_to_model: true, applied_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (markError) throw new Error(`Applied, but failed to mark it as applied: ${markError.message}`)
  return mapRow(updated as DecisionRow)
}

/**
 * The proposed security takes over the current one's in-class weight. If
 * it's already in the same asset class, the weights are merged and the
 * current holding removed. Yield is cleared on a replaced security (it
 * belonged to the old one).
 */
async function applySwap(decision: CommitteeDecision): Promise<void> {
  if (!decision.currentCode || !decision.proposedCode) throw new Error('This swap is missing a security code.')
  const proposedCode = decision.proposedCode.trim().toUpperCase()

  const securities = await fetchCoreSecurities(decision.modelId)
  const current = securities.find((s) => normaliseCode(s.code) === normaliseCode(decision.currentCode!))
  if (!current) throw new Error(`${decision.currentCode} is no longer in the model portfolio - nothing to replace.`)
  const existingProposed = securities.find(
    (s) => normaliseCode(s.code) === normaliseCode(proposedCode) && s.assetClass === current.assetClass,
  )

  const rationale = `Investment Committee approved ${new Date().toLocaleDateString('en-AU')}: ${decision.decisionRationale ?? decision.reasoning}`

  if (existingProposed) {
    const { error: mergeError } = await supabase
      .from(SECURITIES_TABLE)
      .update({ in_class_weight: round2(existingProposed.inClassWeight + current.inClassWeight) })
      .eq('id', existingProposed.id)
    if (mergeError) throw new Error(`Failed to update ${existingProposed.code}: ${mergeError.message}`)
    const { error: removeError } = await supabase.from(SECURITIES_TABLE).delete().eq('id', current.id)
    if (removeError) throw new Error(`Failed to remove ${current.code}: ${removeError.message}`)
  } else {
    const { error: replaceError } = await supabase
      .from(SECURITIES_TABLE)
      .update({ code: proposedCode, name: decision.proposedName ?? proposedCode, rationale, yield: null })
      .eq('id', current.id)
    if (replaceError) throw new Error(`Failed to apply swap to the model: ${replaceError.message}`)
  }

  await ensureApproved({
    code: proposedCode,
    name: decision.proposedName ?? proposedCode,
    assetClass: current.assetClass,
    notes: `Approved by the Investment Committee as a replacement for ${current.code}.`,
    addedBy: decision.decidedBy,
    icDecisionId: decision.id,
  })
  await logModelChange({
    modelId: decision.modelId,
    changeType: 'security_swapped',
    assetClass: current.assetClass,
    code: proposedCode,
    before: { code: current.code, name: current.name, inClassWeight: current.inClassWeight },
    after: {
      code: proposedCode,
      name: decision.proposedName ?? proposedCode,
      inClassWeight: existingProposed ? round2(existingProposed.inClassWeight + current.inClassWeight) : current.inClassWeight,
    },
    description: `IC-approved swap: ${current.code} → ${proposedCode} in ${current.assetClass}`,
    changedBy: decision.decidedBy,
    icDecisionId: decision.id,
  })
  await publishModelVersion({
    modelId: decision.modelId,
    summary: `Investment Committee approved replacing ${current.code} with ${proposedCode} in ${current.assetClass}.`,
    publishedBy: decision.decidedBy,
    icDecisionId: decision.id,
  })
}

/**
 * Tilts the asset class by tiltPp in each affected risk profile, funded
 * from (or returned to) the offset asset class. Neither weight is taken
 * below zero - if the funding class doesn't have enough, the tilt for that
 * profile is reduced to what's available, so every profile still sums to
 * the same total.
 */
async function applyAllocation(decision: CommitteeDecision): Promise<void> {
  const assetClass = decision.assetClass
  const offset = decision.offsetAssetClass
  const tilt = decision.tiltPp ?? 0
  if (!assetClass || !offset) throw new Error('This allocation change is missing its asset classes.')
  if (assetClass === offset) throw new Error('The tilt and its funding asset class must differ.')
  if (tilt === 0) throw new Error('The tilt is zero - nothing to apply.')

  const profiles = decision.riskProfiles && decision.riskProfiles.length > 0 ? decision.riskProfiles : RISK_PROFILES
  const { data, error } = await supabase
    .from(WEIGHTS_TABLE)
    .select('risk_profile, asset_class, target_weight')
    .eq('model_id', decision.modelId)
    .in('risk_profile', profiles)
    .in('asset_class', [assetClass, offset])
  if (error) throw new Error(`Failed to read risk profile weights: ${error.message}`)
  const rows = (data ?? []) as { risk_profile: string; asset_class: string; target_weight: number }[]
  const weightOf = (profile: string, ac: string) =>
    Number(rows.find((r) => r.risk_profile === profile && r.asset_class === ac)?.target_weight ?? 0)

  const applied: string[] = []
  for (const profile of profiles) {
    const target = weightOf(profile, assetClass)
    const funding = weightOf(profile, offset)
    // Positive tilt: limited by what the funding class holds. Negative: by what the target holds.
    const effective = tilt > 0 ? Math.min(tilt, funding) : -Math.min(-tilt, target)
    if (effective === 0) continue
    const newTarget = round2(target + effective)
    const newFunding = round2(funding - effective)

    const now = new Date().toISOString()
    const { error: upsertError } = await supabase.from(WEIGHTS_TABLE).upsert(
      [
        { model_id: decision.modelId, risk_profile: profile, asset_class: assetClass, target_weight: newTarget, updated_at: now },
        { model_id: decision.modelId, risk_profile: profile, asset_class: offset, target_weight: newFunding, updated_at: now },
      ],
      { onConflict: 'model_id,risk_profile,asset_class' },
    )
    if (upsertError) throw new Error(`Failed to update ${profile}: ${upsertError.message}`)

    await logModelChange({
      modelId: decision.modelId,
      changeType: 'asset_class_weight',
      riskProfile: profile,
      assetClass,
      before: target,
      after: newTarget,
      description: `${profile}: ${assetClass} ${target}% → ${newTarget}% (IC-approved tactical tilt)`,
      changedBy: decision.decidedBy,
      icDecisionId: decision.id,
    })
    await logModelChange({
      modelId: decision.modelId,
      changeType: 'asset_class_weight',
      riskProfile: profile,
      assetClass: offset,
      before: funding,
      after: newFunding,
      description: `${profile}: ${offset} ${funding}% → ${newFunding}% (funding the ${assetClass} tilt)`,
      changedBy: decision.decidedBy,
      icDecisionId: decision.id,
    })
    applied.push(`${profile} ${effective > 0 ? '+' : ''}${round2(effective)}pp`)
  }

  if (applied.length === 0) throw new Error(`No room to tilt - ${tilt > 0 ? offset : assetClass} is already at 0% in every profile.`)

  await publishModelVersion({
    modelId: decision.modelId,
    summary: `Investment Committee approved a tactical ${tilt > 0 ? 'overweight' : 'underweight'} in ${assetClass}, funded via ${offset} (${applied.join(', ')}).`,
    publishedBy: decision.decidedBy,
    icDecisionId: decision.id,
  })
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
