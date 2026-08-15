import { supabase } from '../supabase';
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
  return (data ?? []).map(mapSecurityRow);
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
export async function fetchAllRiskProfileWeights(): Promise
  Record<RiskProfile, Record<string, number>>
> {
  const { data, error } = await supabase
    .from(WEIGHTS_TABLE)
    .select('risk_profile, asset_class, target_weight');

  if (error) {
    throw new Error(`Failed to load risk profile weights: ${error.message}`);
  }

  const result = Object.fromEntries(RISK_PROFILES.map((p) => [p, {}])) as Record
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
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const holdings: ModelHolding[] = classSecurities.map((s) => ({
      code: s.code,
      name: s.name,
      sector: s.sector ?? undefined,
      weight: round2((targetWeight * s.inClassWeight) / 100),
      rationale: s.rationale,
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
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add ${input.code}: ${error.message}`);
  }
  return mapSecurityRow(data as CoreSecurityRow);
}

export async function removeCoreSecurity(id: string): Promise<void> {
  const { error } = await supabase.from(SECURITIES_TABLE).delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to remove security: ${error.message}`);
  }
}

export async function updateCoreSecurityInClassWeight(
  id: string,
  inClassWeight: number
): Promise<void> {
  const { error } = await supabase
    .from(SECURITIES_TABLE)
    .update({ in_class_weight: inClassWeight, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    throw new Error(`Failed to update security weight: ${error.message}`);
  }
}

export async function updateRiskProfileAssetClassWeight(
  riskProfile: RiskProfile,
  assetClass: string,
  targetWeight: number
): Promise<void> {
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
}
