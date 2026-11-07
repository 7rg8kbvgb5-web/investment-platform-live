import { supabase } from '../supabase'
import { fetchCoreSecurities } from './model-portfolio-core'
import { normaliseCode } from './codes'
import { ensureApproved } from './approved-list'
import { logModelChange, publishModelVersion } from './model-versioning'

// Investment Committee decision queue.
//
// The live scans (Monitoring, Fund Reviews) flag a "better risk-adjusted
// alternative" with a real, named replacement security. Those flags are
// only proposals - this is where they get a formal committee decision,
// with rationale, who decided and when, so there is a permanent record of
// how and why the house view changed. Advisers can also raise a swap
// manually. An approved swap can then be applied to the house model in
// one step, which is what flows it through to every client's Construction
// comparison.

const TABLE = 'investment_committee_decisions'
const SECURITIES_TABLE = 'model_portfolio_securities'

export type DecisionSource = 'monitoring' | 'fund_review' | 'manual'
export type DecisionStatus = 'pending' | 'approved' | 'rejected' | 'deferred'
export type DecisionSeverity = 'critical' | 'high' | 'medium' | 'low'

export type CommitteeDecision = {
  id: string
  source: DecisionSource
  sourceAlertId: string | null
  assetClass: string | null
  currentCode: string
  currentName: string | null
  proposedCode: string
  proposedName: string | null
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
  source: DecisionSource
  source_alert_id: string | null
  asset_class: string | null
  current_code: string
  current_name: string | null
  proposed_code: string
  proposed_name: string | null
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
    source: row.source,
    sourceAlertId: row.source_alert_id,
    assetClass: row.asset_class,
    currentCode: row.current_code,
    currentName: row.current_name,
    proposedCode: row.proposed_code,
    proposedName: row.proposed_name,
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

export async function listCommitteeDecisions(): Promise<CommitteeDecision[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to load Investment Committee queue: ${error.message}`)
  return (data ?? []).map((row) => mapRow(row as DecisionRow))
}

/** Approved swaps - used to flag affected holdings in a client's Construction review. */
export async function listApprovedSwaps(): Promise<CommitteeDecision[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'approved')
    .order('decided_at', { ascending: false })
  if (error) throw new Error(`Failed to load approved swaps: ${error.message}`)
  return (data ?? []).map((row) => mapRow(row as DecisionRow))
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

/**
 * Pulls every not-dismissed "better alternative" flag from Monitoring and
 * Fund Reviews into the queue. Safe to call repeatedly: an alert already
 * queued is skipped, and so is a swap (same current -> proposed pair)
 * that's already pending or deferred, so repeated scans re-flagging the
 * same idea don't clutter the queue. Returns how many were added.
 */
export async function syncProposedSwaps(): Promise<number> {
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
    supabase.from(TABLE).select('source_alert_id, current_code, proposed_code, status'),
    fetchCoreSecurities(),
  ])

  if (monitoringRes.error) throw new Error(`Failed to read Monitoring alerts: ${monitoringRes.error.message}`)
  if (fundRes.error) throw new Error(`Failed to read Fund Review alerts: ${fundRes.error.message}`)
  if (existingRes.error) throw new Error(`Failed to read Investment Committee queue: ${existingRes.error.message}`)

  const existing = (existingRes.data ?? []) as {
    source_alert_id: string | null
    current_code: string
    proposed_code: string
    status: DecisionStatus
  }[]
  const queuedAlertIds = new Set(existing.map((r) => r.source_alert_id).filter(Boolean))
  const openPairs = new Set(
    existing
      .filter((r) => r.status === 'pending' || r.status === 'deferred')
      .map((r) => pairKey(r.current_code, r.proposed_code)),
  )

  const securityByCode = new Map(securities.map((s) => [normaliseCode(s.code), s]))
  const inserts: Omit<DecisionRow, 'id' | 'status' | 'decision_rationale' | 'decided_by' | 'decided_at' | 'applied_to_model' | 'applied_at' | 'created_at'>[] = []

  function consider(entry: (typeof inserts)[number]) {
    if (entry.source_alert_id && queuedAlertIds.has(entry.source_alert_id)) return
    const key = pairKey(entry.current_code, entry.proposed_code)
    if (openPairs.has(key)) return
    openPairs.add(key)
    inserts.push(entry)
  }

  for (const alert of (monitoringRes.data ?? []) as MonitoringAltRow[]) {
    const currentCode = alert.affected_codes?.[0]
    if (!currentCode || !alert.suggested_alternative_code) continue
    const held = securityByCode.get(normaliseCode(currentCode))
    consider({
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

  for (const alert of (fundRes.data ?? []) as FundAltRow[]) {
    if (!alert.suggested_alternative_code) continue
    const held = securityByCode.get(normaliseCode(alert.fund_code))
    consider({
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

  if (inserts.length === 0) return 0
  const { error } = await supabase.from(TABLE).insert(inserts)
  if (error) throw new Error(`Failed to add proposals to the queue: ${error.message}`)
  return inserts.length
}

export async function createManualProposal(input: {
  currentCode: string
  proposedCode: string
  proposedName?: string | null
  reasoning: string
  severity?: DecisionSeverity
}): Promise<CommitteeDecision> {
  const securities = await fetchCoreSecurities()
  const held = securities.find((s) => normaliseCode(s.code) === normaliseCode(input.currentCode))
  if (!held) {
    throw new Error(`${input.currentCode.toUpperCase()} isn't in the model portfolio, so there's nothing to swap out.`)
  }
  const proposedCode = input.proposedCode.trim().toUpperCase()
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
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

/**
 * Records the committee's decision. A rationale and decider are required
 * for approve/reject - that's the point of the audit trail. The scan alert
 * that raised it (if any) is marked reviewed so it stops showing as new.
 */
export async function recordDecision(input: {
  id: string
  status: Exclude<DecisionStatus, 'pending'>
  rationale: string
  decidedBy: string
}): Promise<CommitteeDecision> {
  const rationale = input.rationale.trim()
  const decidedBy = input.decidedBy.trim()
  if (!rationale) throw new Error('A rationale is required for the decision record.')
  if (!decidedBy) throw new Error('Record who made the decision.')

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: input.status,
      decision_rationale: rationale,
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('*')
    .single()
  if (error) throw new Error(`Failed to record decision: ${error.message}`)
  const decision = mapRow(data as DecisionRow)

  if (decision.sourceAlertId && decision.source !== 'manual') {
    const alertTable = decision.source === 'monitoring' ? 'investment_monitoring_alerts' : 'fund_review_alerts'
    // Best effort - the decision itself is already recorded.
    await supabase.from(alertTable).update({ status: 'reviewed' }).eq('id', decision.sourceAlertId)
  }

  return decision
}

/**
 * Applies an approved swap to the shared house model. The proposed
 * security takes over the current one's in-class weight. If the proposed
 * security is already in the same asset class, the weight is merged into
 * it and the current holding removed. Yield is cleared on a replaced
 * security (it belonged to the old one) - set it on the Model Portfolio tab.
 */
export async function applySwapToModel(id: string): Promise<CommitteeDecision> {
  const { data: row, error: readError } = await supabase.from(TABLE).select('*').eq('id', id).single()
  if (readError) throw new Error(`Failed to load decision: ${readError.message}`)
  const decision = mapRow(row as DecisionRow)
  if (decision.status !== 'approved') throw new Error('Only approved swaps can be applied to the model.')
  if (decision.appliedToModel) throw new Error('This swap has already been applied to the model.')

  const securities = await fetchCoreSecurities()
  const current = securities.find((s) => normaliseCode(s.code) === normaliseCode(decision.currentCode))
  if (!current) {
    throw new Error(`${decision.currentCode} is no longer in the model portfolio - nothing to replace.`)
  }
  const existingProposed = securities.find(
    (s) => normaliseCode(s.code) === normaliseCode(decision.proposedCode) && s.assetClass === current.assetClass,
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
      .update({
        code: decision.proposedCode.trim().toUpperCase(),
        name: decision.proposedName ?? decision.proposedCode,
        rationale,
        yield: null,
      })
      .eq('id', current.id)
    if (replaceError) throw new Error(`Failed to apply swap to the model: ${replaceError.message}`)
  }

  // The replacement joins the Approved List, the change is logged, and the
  // model is published as a new version tied to this decision - so every
  // client review built on the old version shows as needing a refresh.
  await ensureApproved({
    code: decision.proposedCode,
    name: decision.proposedName ?? decision.proposedCode,
    assetClass: current.assetClass,
    notes: `Approved by the Investment Committee as a replacement for ${current.code}.`,
    addedBy: decision.decidedBy,
    icDecisionId: decision.id,
  })
  await logModelChange({
    changeType: 'security_swapped',
    assetClass: current.assetClass,
    code: decision.proposedCode.trim().toUpperCase(),
    before: { code: current.code, name: current.name, inClassWeight: current.inClassWeight },
    after: {
      code: decision.proposedCode.trim().toUpperCase(),
      name: decision.proposedName ?? decision.proposedCode,
      inClassWeight: existingProposed ? round2(existingProposed.inClassWeight + current.inClassWeight) : current.inClassWeight,
    },
    description: `IC-approved swap: ${current.code} → ${decision.proposedCode.trim().toUpperCase()} in ${current.assetClass}`,
    changedBy: decision.decidedBy,
    icDecisionId: decision.id,
  })
  await publishModelVersion({
    summary: `Investment Committee approved replacing ${current.code} with ${decision.proposedCode.trim().toUpperCase()} in ${current.assetClass}.`,
    publishedBy: decision.decidedBy,
    icDecisionId: decision.id,
  })

  const { data: updated, error: markError } = await supabase
    .from(TABLE)
    .update({ applied_to_model: true, applied_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (markError) throw new Error(`Swap applied, but failed to mark it as applied: ${markError.message}`)
  return mapRow(updated as DecisionRow)
}

function pairKey(current: string, proposed: string): string {
  return `${normaliseCode(current)}->${normaliseCode(proposed)}`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
