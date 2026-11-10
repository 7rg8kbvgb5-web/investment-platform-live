import { supabase } from '../supabase';
import { compareSecurityCodes, sortSecurities } from './security-order';
import { logModelChange } from './model-versioning';
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

/** The full shared core: every security in every asset class, identical for all risk profiles. */
export async function fetchCoreSecurities(): Promise<CoreSecurity[]> {
  const { data, error } = await supabase
    .from(SECURITIES_TABLE)
    .select('*')
    .order('asset_class', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load the core model portfolio: ${error.message}`);
  }
  return sortSecurities((data ?? []).map(mapSecurityRow));
}

/** One risk profile's asset-class-level target weights (% of the whole portfolio each class carries). */
export async function fetchRiskProfileWeights(
  riskProfile: RiskProfile
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from(WEIGHTS_TABLE)
    .select('asset_class, target_weight')
    .eq('risk_profile', riskProfile);

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
export async function fetchAllRiskProfileWeights(): Promise<
  Record<RiskProfile, Record<string, number>>
> {
  const { data, error } = await supabase
    .from(WEIGHTS_TABLE)
    .select('risk_profile, asset_class, target_weight');

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
export async function fetchModelPortfolio(riskProfile: RiskProfile): Promise<ModelPortfolio> {
  const [securities, weights] = await Promise.all([
    fetchCoreSecurities(),
    fetchRiskProfileWeights(riskProfile),
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
}): Promise<CoreSecurity> {
  const { data, error } = await supabase
    .from(SECURITIES_TABLE)
    .insert({
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
  targetWeight: number
): Promise<void> {
  const { data: beforeRow } = await supabase
    .from(WEIGHTS_TABLE)
    .select('target_weight')
    .eq('risk_profile', riskProfile)
    .eq('asset_class', assetClass)
    .maybeSingle();
  const beforeWeight = beforeRow ? Number((beforeRow as { target_weight: number }).target_weight) : null;
  const { error } = await supabase.from(WEIGHTS_TABLE).upsert(
    {
      risk_profile: riskProfile,
      asset_class: assetClass,
      target_weight: targetWeight,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'risk_profile,asset_class' }
  );
  if (error) {
    throw new Error(`Failed to update ${riskProfile} ${assetClass} weight: ${error.message}`);
  }
  if (beforeWeight !== targetWeight) {
    await logModelChange({
      changeType: 'asset_class_weight',
      riskProfile,
      assetClass,
      before: beforeWeight,
      after: targetWeight,
      description: `${riskProfile}: ${assetClass} ${beforeWeight ?? 0}% → ${targetWeight}%`,
    });
  }
}
