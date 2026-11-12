import { supabase } from '../supabase';
import { compareSecurityCodes, sortSecurities } from './security-order';
import { logModelChange } from './model-versioning';
import { DEFAULT_MODEL_ID, isMissingModelColumn, resolveModelId } from '../model-context';
import { ensureApproved } from './approved-list';
import type {
  RiskProfile,
  ModelPortfolio,
  ModelAssetClass,
  ModelHolding,
  AssetClassType,
} from './model-portfolios';

export type AssetClassMeta = {
  name: string;
  type: AssetClassType;
  description: string;
};

// Canonical asset class list and order - structural, not something
// advisers add or remove day to day, so kept as static metadata rather
// than a Supabase table. The securities within each class, and each
// risk profile's weighting of each class, are the genuinely
// adviser-editable parts and live in Supabase below.
export const ASSET_CLASSES: AssetClassMeta[] = [
  {
    name: 'Australian Equities',
    type: 'Growth',
    description:
      'Direct Australian equities selected through the house view, sector positioning and security ranking process.',
  },
  {
    name: 'International Equities',
    type: 'Growth',
    description:
      'International equity exposure used to diversify sector, currency and geographic risk.',
  },
  {
    name: 'Listed Property / Infrastructure',
    type: 'Growth',
    description:
      'Real asset exposure providing diversification, income and inflation sensitivity.',
  },
  {
    name: 'Alternatives',
    type: 'Growth',
    description:
      'Alternative investments used selectively to improve diversification and broaden return sources.',
  },
  {
    name: 'Australian Fixed Interest',
    type: 'Defensive',
    description:
      'Domestic fixed-income exposure focused on income, capital stability and liquidity.',
  },
  {
    name: 'Global Fixed Interest',
    type: 'Defensive',
    description:
      'Global fixed-income exposure for diversification across regions, issuers and interest-rate cycles.',
  },
  {
    name: 'Cash',
    type: 'Defensive',
    description:
      'Liquidity reserve for flexibility, income needs and tactical opportunities.',
  },
];

export const RISK_PROFILES: RiskProfile[] = [
  'Conservative',
  'Moderate',
  'Balanced',
  'Growth',
  'High Growth',
];

const OBJECTIVES: Record<RiskProfile, string> = {
  Conservative:
    'Designed for investors prioritising capital stability, liquidity and income, with modest exposure to growth assets.',
  Moderate:
    'Designed for investors seeking moderate growth while retaining a meaningful allocation to defensive assets.',
  Balanced:
    'Designed for investors seeking a balance between long-term capital growth, income generation and downside risk management.',
  Growth:
    'Designed for investors seeking long-term capital growth, with a higher allocation to growth assets and tolerance for market volatility.',
  'High Growth':
    'Designed for investors with a long investment timeframe seeking maximum long-term growth and a high tolerance for volatility.',
};

export type HoldingType =
  | 'direct_equity'
  | 'listed_fund'
  | 'unlisted_fund'
  | 'direct_bond'
  | 'cash'
  | 'other';

export const HOLDING_TYPE_LABELS: Record<HoldingType, string> = {
  direct_equity: 'Direct Equity',
  listed_fund: 'Listed Fund',
  unlisted_fund: 'Unlisted Fund',
  direct_bond: 'Direct Bond',
  cash: 'Cash',
  other: 'Other',
};

export type CoreSecurity = {
  id: string;
  /** Which adviser's model this row belongs to (migration 0028). */
  modelId: string;
  assetClass: string;
  code: string;
  name: string;
  sector: string | null;
  inClassWeight: number;
  rationale: string;
  inSecurityMaster: boolean;
  displayOrder: number;
  /** Forward (estimated, current FY) distribution yield, percent. Null if not stated. */
  yield: number | null;
  holdingType: HoldingType;
  /** Expected franking of distributions, 0-100%. Null if not stated. */
  frankingPct: number | null;
};

type CoreSecurityRow = {
  id: string;
  model_id?: string | null;
  asset_class: string;
  code: string;
  name: string;
  sector: string | null;
  in_class_weight: number;
  rationale: string;
  in_security_master: boolean;
  display_order: number;
  yield: number | null;
  holding_type: HoldingType;
  franking_pct?: number | null;
};

function mapSecurityRow(row: CoreSecurityRow): CoreSecurity {
  return {
    id: row.id,
    modelId: row.model_id ?? DEFAULT_MODEL_ID,
    assetClass: row.asset_class,
    code: row.code,
    name: row.name,
    sector: row.sector,
    inClassWeight: Number(row.in_class_weight),
    rationale: row.rationale,
    inSecurityMaster: row.in_security_master,
    displayOrder: row.display_order,
    yield: row.yield === null || row.yield === undefined ? null : Number(row.yield),
    holdingType: row.holding_type ?? 'direct_equity',
    frankingPct:
      row.franking_pct === null || row.franking_pct === undefined ? null : Number(row.franking_pct),
  };
}

const SECURITIES_TABLE = 'model_portfolio_securities';
const WEIGHTS_TABLE = 'risk_profile_asset_class_weights';

/**
 * One adviser model's securities: every security in every asset class,
 * identical for all risk profiles. Defaults to the selected model (browser)
 * or Sean's (server) - server callers tied to a model pass it explicitly.
 */
export async function fetchCoreSecurities(modelId?: string | null): Promise<CoreSecurity[]> {
  const model = resolveModelId(modelId);
  const query = () =>
    supabase.from(SECURITIES_TABLE).select('*').order('asset_class', { ascending: true }).order('display_order', { ascending: true });
  let { data, error } = await query().eq('model_id', model);
  if (isMissingModelColumn(error)) ({ data, error } = await query()); // before migration 0028

  if (error) {
    throw new Error(`Failed to load the core model portfolio: ${error.message}`);
  }
  return sortSecurities((data ?? []).map((r) => mapSecurityRow(r as CoreSecurityRow)));
}

/**
 * Every security in every adviser's model, one entry per code - for the
 * scans (Monitoring, Fund Reviews, Sector Health, weekly brief, prices),
 * which watch everything any adviser holds.
 */
export async function fetchAllModelSecurities(): Promise<CoreSecurity[]> {
  const { data, error } = await supabase
    .from(SECURITIES_TABLE)
    .select('*')
    .order('asset_class', { ascending: true })
    .order('display_order', { ascending: true });
  if (error) throw new Error(`Failed to load model securities: ${error.message}`);
  const byCode = new Map<string, CoreSecurity>();
  for (const row of data ?? []) {
    const sec = mapSecurityRow(row as CoreSecurityRow);
    const key = sec.code.toUpperCase();
    if (!byCode.has(key)) byCode.set(key, sec);
  }
  return sortSecurities(Array.from(byCode.values()));
}

/** Which models hold each code - lets alerts say whose model they affect. */
export async function fetchModelsHoldingCodes(): Promise<Map<string, string[]>> {
  const { data, error } = await supabase.from(SECURITIES_TABLE).select('code, model_id');
  const out = new Map<string, string[]>();
  if (error) return out;
  for (const row of (data ?? []) as { code: string; model_id: string | null }[]) {
    const key = row.code.toUpperCase();
    const list = out.get(key) ?? [];
    const m = row.model_id ?? DEFAULT_MODEL_ID;
    if (!list.includes(m)) list.push(m);
    out.set(key, list);
  }
  return out;
}

/** One risk profile's asset-class-level target weights (% of the whole portfolio each class carries). */
export async function fetchRiskProfileWeights(
  riskProfile: RiskProfile,
  modelId?: string | null
): Promise<Record<string, number>> {
  const model = resolveModelId(modelId);
  const query = () => supabase.from(WEIGHTS_TABLE).select('asset_class, target_weight').eq('risk_profile', riskProfile);
  let { data, error } = await query().eq('model_id', model);
  if (isMissingModelColumn(error)) ({ data, error } = await query());

  if (error) {
    throw new Error(`Failed to load ${riskProfile} weights: ${error.message}`);
  }

  const weights: Record<string, number> = {};
  for (const row of data ?? []) {
    weights[row.asset_class] = Number(row.target_weight);
  }
  return weights;
}

/** All five risk profiles' asset-class weights in one call - used for risk classification and cross-profile summaries. */
export async function fetchAllRiskProfileWeights(modelId?: string | null): Promise<
  Record<RiskProfile, Record<string, number>>
> {
  const model = resolveModelId(modelId);
  const query = () => supabase.from(WEIGHTS_TABLE).select('risk_profile, asset_class, target_weight');
  let { data, error } = await query().eq('model_id', model);
  if (isMissingModelColumn(error)) ({ data, error } = await query());

  if (error) {
    throw new Error(`Failed to load risk profile weights: ${error.message}`);
  }

  const result = Object.fromEntries(RISK_PROFILES.map((p) => [p, {}])) as Record<
    RiskProfile,
    Record<string, number>
  >;
  for (const row of data ?? []) {
    result[row.risk_profile as RiskProfile][row.asset_class] = Number(row.target_weight);
  }
  return result;
}

/** Growth/defensive totals per risk profile, derived live from Supabase weights + the structural asset-class types - used by risk classification instead of a hardcoded table. */
export function computeGrowthDefensiveByProfile(
  allWeights: Record<RiskProfile, Record<string, number>>
): Array<{ riskProfile: RiskProfile; growthWeight: number; defensiveWeight: number }> {
  return RISK_PROFILES.map((riskProfile) => {
    const weights = allWeights[riskProfile] ?? {};
    const growthWeight = round2(
      ASSET_CLASSES.filter((ac) => ac.type === 'Growth').reduce(
        (sum, ac) => sum + (weights[ac.name] ?? 0),
        0
      )
    );
    const defensiveWeight = round2(
      ASSET_CLASSES.filter((ac) => ac.type === 'Defensive').reduce(
        (sum, ac) => sum + (weights[ac.name] ?? 0),
        0
      )
    );
    return { riskProfile, growthWeight, defensiveWeight };
  });
}

/**
 * Composes the shared core securities and one risk profile's weights into
 * the same ModelPortfolio shape the rest of the app already expects, so
 * every existing downstream consumer (comparison engine, analytics,
 * security universe) keeps working unchanged - only where the data comes
 * from changes, not its shape. Prefer fetchCoreSecurities +
 * fetchRiskProfileWeights directly when the caller needs to edit
 * individual securities (this collapses ids away).
 */
export async function fetchModelPortfolio(riskProfile: RiskProfile, modelId?: string | null): Promise<ModelPortfolio> {
  const model = resolveModelId(modelId);
  const [securities, weights] = await Promise.all([
    fetchCoreSecurities(model),
    fetchRiskProfileWeights(riskProfile, model),
  ]);

  const growthWeight = round2(
    ASSET_CLASSES.filter((ac) => ac.type === 'Growth').reduce(
      (sum, ac) => sum + (weights[ac.name] ?? 0),
      0
    )
  );
  const defensiveWeight = round2(
    ASSET_CLASSES.filter((ac) => ac.type === 'Defensive').reduce(
      (sum, ac) => sum + (weights[ac.name] ?? 0),
      0
    )
  );

  const assetClasses: ModelAssetClass[] = ASSET_CLASSES.map((meta) => {
    const targetWeight = weights[meta.name] ?? 0;
    const classSecurities = securities
      .filter((s) => s.assetClass === meta.name)
      .sort(compareSecurityCodes);

    const holdings: ModelHolding[] = classSecurities.map((s) => ({
      code: s.code,
      name: s.name,
      sector: s.sector ?? undefined,
      weight: round2((targetWeight * s.inClassWeight) / 100),
      rationale: s.rationale,
      yield: s.yield ?? undefined,
      frankingPct: s.frankingPct ?? undefined,
      holdingType: s.holdingType ?? undefined,
    }));

    return {
      name: meta.name,
      type: meta.type,
      targetWeight,
      description: meta.description,
      holdings,
    };
  });

  return {
    riskProfile,
    objective: OBJECTIVES[riskProfile],
    growthWeight,
    defensiveWeight,
    assetClasses,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// --- Writers: house-model edits, persisted immediately ---
// Security edits (add/remove/reweight) touch model_portfolio_securities,
// which is shared across all five risk profiles - editing a security
// while looking at "Balanced" changes it everywhere. Asset-class weight
// edits touch risk_profile_asset_class_weights scoped to one profile.

export async function addCoreSecurity(input: {
  assetClass: string;
  code: string;
  name: string;
  sector?: string;
  rationale?: string;
  inSecurityMaster?: boolean;
  yield?: number | null;
  holdingType?: HoldingType;
  frankingPct?: number | null;
  modelId?: string | null;
}): Promise<CoreSecurity> {
  const model = resolveModelId(input.modelId);
  const { data, error } = await supabase
    .from(SECURITIES_TABLE)
    .insert({
      model_id: model,
      asset_class: input.assetClass,
      code: input.code.toUpperCase(),
      name: input.name,
      sector: input.sector ?? null,
      in_class_weight: 0,
      rationale: input.rationale ?? 'Added manually.',
      in_security_master: input.inSecurityMaster ?? false,
      display_order: 999,
      yield: input.yield ?? null,
      holding_type: input.holdingType ?? 'direct_equity',
      ...(typeof input.frankingPct === 'number' ? { franking_pct: input.frankingPct } : {}),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add ${input.code}: ${error.message}`);
  }
  const added = mapSecurityRow(data as CoreSecurityRow);

  // Anything in the model must be on the Approved List.
  try {
    await ensureApproved({
      code: added.code,
      name: added.name,
      assetClass: added.assetClass,
      sector: added.sector,
      notes: 'Added to the model portfolio.',
    });
  } catch (err) {
    console.error(err);
  }
  await logModelChange({
    modelId: model,
    changeType: 'security_added',
    assetClass: added.assetClass,
    code: added.code,
    after: { name: added.name, inClassWeight: added.inClassWeight },
    description: `Added ${added.code} (${added.name}) to ${added.assetClass}`,
  });
  return added;
}

async function readSecurity(id: string): Promise<CoreSecurityRow | null> {
  const { data } = await supabase.from(SECURITIES_TABLE).select('*').eq('id', id).maybeSingle();
  return (data as CoreSecurityRow | null) ?? null;
}

export async function updateCoreSecurityYield(id: string, yieldPct: number | null): Promise<void> {
  const before = await readSecurity(id);
  const { error } = await supabase
    .from(SECURITIES_TABLE)
    .update({ yield: yieldPct, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    throw new Error(`Failed to update security yield: ${error.message}`);
  }
  if (before && Number(before.yield ?? NaN) !== Number(yieldPct ?? NaN)) {
    await logModelChange({
      modelId: before.model_id ?? DEFAULT_MODEL_ID,
      changeType: 'yield',
      assetClass: before.asset_class,
      code: before.code,
      before: before.yield,
      after: yieldPct,
      description: `${before.code} forward yield ${before.yield ?? '—'}% → ${yieldPct ?? '—'}%`,
    });
  }
}

export async function updateCoreSecurityFranking(id: string, frankingPct: number | null): Promise<void> {
  const before = await readSecurity(id);
  const value = frankingPct === null ? null : Math.max(0, Math.min(100, frankingPct));
  const { error } = await supabase
    .from(SECURITIES_TABLE)
    .update({ franking_pct: value, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    throw new Error(
      error.message.includes('franking_pct')
        ? 'Run migration 0023 in Supabase to store franking levels.'
        : `Failed to update franking: ${error.message}`
    );
  }
  if (before && Number(before.franking_pct ?? NaN) !== Number(value ?? NaN)) {
    await logModelChange({
      modelId: before.model_id ?? DEFAULT_MODEL_ID,
      changeType: 'franking',
      assetClass: before.asset_class,
      code: before.code,
      before: before.franking_pct ?? null,
      after: value,
      description: `${before.code} franking ${before.franking_pct ?? '—'}% → ${value ?? '—'}%`,
    });
  }
}

export async function updateCoreSecurityHoldingType(id: string, holdingType: HoldingType): Promise<void> {
  const before = await readSecurity(id);
  const { error } = await supabase
    .from(SECURITIES_TABLE)
    .update({ holding_type: holdingType, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    throw new Error(`Failed to update holding type: ${error.message}`);
  }
  if (before && before.holding_type !== holdingType) {
    await logModelChange({
      modelId: before.model_id ?? DEFAULT_MODEL_ID,
      changeType: 'holding_type',
      assetClass: before.asset_class,
      code: before.code,
      before: before.holding_type,
      after: holdingType,
      description: `${before.code} holding type ${before.holding_type ?? '—'} → ${holdingType}`,
    });
  }
}

export async function removeCoreSecurity(id: string): Promise<void> {
  const before = await readSecurity(id);
  const { error } = await supabase.from(SECURITIES_TABLE).delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to remove security: ${error.message}`);
  }
  if (before) {
    await logModelChange({
      modelId: before.model_id ?? DEFAULT_MODEL_ID,
      changeType: 'security_removed',
      assetClass: before.asset_class,
      code: before.code,
      before: { name: before.name, inClassWeight: Number(before.in_class_weight) },
      description: `Removed ${before.code} (${before.name}) from ${before.asset_class}`,
    });
  }
}

export async function updateCoreSecurityInClassWeight(
  id: string,
  inClassWeight: number
): Promise<void> {
  const before = await readSecurity(id);
  const { error } = await supabase
    .from(SECURITIES_TABLE)
    .update({ in_class_weight: inClassWeight, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    throw new Error(`Failed to update security weight: ${error.message}`);
  }
  if (before && Number(before.in_class_weight) !== inClassWeight) {
    await logModelChange({
      modelId: before.model_id ?? DEFAULT_MODEL_ID,
      changeType: 'in_class_weight',
      assetClass: before.asset_class,
      code: before.code,
      before: Number(before.in_class_weight),
      after: inClassWeight,
      description: `${before.code} weight within ${before.asset_class} ${Number(before.in_class_weight)}% → ${inClassWeight}%`,
    });
  }
}

export async function updateRiskProfileAssetClassWeight(
  riskProfile: RiskProfile,
  assetClass: string,
  targetWeight: number,
  modelId?: string | null
): Promise<void> {
  const model = resolveModelId(modelId);
  const { data: beforeRow } = await supabase
    .from(WEIGHTS_TABLE)
    .select('target_weight')
    .eq('model_id', model)
    .eq('risk_profile', riskProfile)
    .eq('asset_class', assetClass)
    .maybeSingle();
  const beforeWeight = beforeRow ? Number((beforeRow as { target_weight: number }).target_weight) : null;
  const { error } = await supabase.from(WEIGHTS_TABLE).upsert(
    {
      model_id: model,
      risk_profile: riskProfile,
      asset_class: assetClass,
      target_weight: targetWeight,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'model_id,risk_profile,asset_class' }
  );
  if (error) {
    throw new Error(`Failed to update ${riskProfile} ${assetClass} weight: ${error.message}`);
  }
  if (beforeWeight !== targetWeight) {
    await logModelChange({
      modelId: model,
      changeType: 'asset_class_weight',
      riskProfile,
      assetClass,
      before: beforeWeight,
      after: targetWeight,
      description: `${riskProfile}: ${assetClass} ${beforeWeight ?? 0}% → ${targetWeight}%`,
    });
  }
}

// ─── Strategic asset allocation (migration 0033) ──────────────────────────
// The approved, "correct" asset-class weights per risk profile, held apart
// from the live working weights above. Saving records the live weights as
// strategic (only when they total 100%); resetting copies the strategic
// weights back over the live ones.

const STRATEGIC_TABLE = 'risk_profile_strategic_weights';

/** Within 0.05 of 100% counts as fully invested (allows for one-decimal rounding). */
export function isFullyInvested(total: number): boolean {
  return Math.abs(total - 100) < 0.05;
}

export function sumProfileWeights(weights: Record<string, number>): number {
  return round2(
    ASSET_CLASSES.reduce((sum, ac) => sum + (Number.isFinite(weights[ac.name]) ? weights[ac.name] : 0), 0)
  );
}

function strategicTableMissing(error: { message?: string } | null | undefined): boolean {
  return !!error?.message && /risk_profile_strategic_weights/.test(error.message);
}

export type StrategicAllocations = {
  /** False until migration 0033 has been run in Supabase. */
  available: boolean;
  /** Per profile; a profile missing here has no strategic allocation saved yet. */
  byProfile: Partial<Record<RiskProfile, Record<string, number>>>;
};

export async function fetchStrategicAllocations(modelId?: string | null): Promise<StrategicAllocations> {
  const model = resolveModelId(modelId);
  const { data, error } = await supabase
    .from(STRATEGIC_TABLE)
    .select('risk_profile, asset_class, target_weight')
    .eq('model_id', model);
  if (error) {
    if (strategicTableMissing(error)) return { available: false, byProfile: {} };
    throw new Error(`Failed to load the strategic asset allocation: ${error.message}`);
  }
  const byProfile: Partial<Record<RiskProfile, Record<string, number>>> = {};
  for (const row of (data ?? []) as { risk_profile: RiskProfile; asset_class: string; target_weight: number }[]) {
    (byProfile[row.risk_profile] ??= {})[row.asset_class] = Number(row.target_weight);
  }
  return { available: true, byProfile };
}

/** Records this profile's live weights as its strategic allocation. Refuses unless they total 100%. */
export async function saveStrategicAllocation(
  riskProfile: RiskProfile,
  weights: Record<string, number>,
  modelId?: string | null
): Promise<void> {
  const model = resolveModelId(modelId);
  const total = sumProfileWeights(weights);
  if (!isFullyInvested(total)) {
    throw new Error(`${riskProfile} totals ${total}% - it must total 100% before it can be saved as the strategic allocation.`);
  }
  const now = new Date().toISOString();
  const { currentUserEmail } = await import('./model-versioning');
  const savedBy = await currentUserEmail();
  const { error } = await supabase.from(STRATEGIC_TABLE).upsert(
    ASSET_CLASSES.map((ac) => ({
      model_id: model,
      risk_profile: riskProfile,
      asset_class: ac.name,
      target_weight: Number.isFinite(weights[ac.name]) ? weights[ac.name] : 0,
      saved_by: savedBy,
      updated_at: now,
    })),
    { onConflict: 'model_id,risk_profile,asset_class' }
  );
  if (error) {
    if (strategicTableMissing(error)) throw new Error('Run migration 0033 in Supabase to enable the strategic allocation.');
    throw new Error(`Failed to save the ${riskProfile} strategic allocation: ${error.message}`);
  }
  await logModelChange({
    modelId: model,
    changeType: 'strategic_allocation_saved',
    riskProfile,
    after: weights,
    description: `${riskProfile}: current asset allocation saved as the strategic allocation`,
  });
}

/**
 * Puts this profile's live weights back to its saved strategic allocation.
 * Returns the restored weights. Every asset class is written, so a class
 * that had drifted from 0% is put back to 0% too.
 */
export async function resetToStrategicAllocation(
  riskProfile: RiskProfile,
  modelId?: string | null
): Promise<Record<string, number>> {
  const model = resolveModelId(modelId);
  const { available, byProfile } = await fetchStrategicAllocations(model);
  if (!available) throw new Error('Run migration 0033 in Supabase to enable the strategic allocation.');
  const strategic = byProfile[riskProfile];
  if (!strategic) throw new Error(`No strategic allocation has been saved for ${riskProfile} yet.`);

  const before = await fetchRiskProfileWeights(riskProfile, model);
  const restored: Record<string, number> = {};
  for (const ac of ASSET_CLASSES) restored[ac.name] = strategic[ac.name] ?? 0;

  const now = new Date().toISOString();
  const { error } = await supabase.from(WEIGHTS_TABLE).upsert(
    ASSET_CLASSES.map((ac) => ({
      model_id: model,
      risk_profile: riskProfile,
      asset_class: ac.name,
      target_weight: restored[ac.name],
      updated_at: now,
    })),
    { onConflict: 'model_id,risk_profile,asset_class' }
  );
  if (error) throw new Error(`Failed to reset ${riskProfile}: ${error.message}`);

  const changed = ASSET_CLASSES.filter((ac) => (before[ac.name] ?? 0) !== restored[ac.name]);
  if (changed.length > 0) {
    await logModelChange({
      modelId: model,
      changeType: 'strategic_allocation_reset',
      riskProfile,
      before,
      after: restored,
      description: `${riskProfile}: reset to strategic allocation (${changed
        .map((ac) => `${ac.name} ${before[ac.name] ?? 0}% → ${restored[ac.name]}%`)
        .join(', ')})`,
    });
  }
  return restored;
}
