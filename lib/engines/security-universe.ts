import { securityMasterData } from "../../domain/types/security-master-data";
import { fetchCoreSecurities, ASSET_CLASSES } from "./model-portfolio-core";

export type SecurityUniverseEntry = {
  code: string;
  name: string;
  sector: string;
  assetClass: string;
  assetClassType: "Growth" | "Defensive";
  /** True if this security is on the Approved List (security master), giving access to House View / conviction. */
  inSecurityMaster: boolean;
  /** True if this security appears in the live model portfolio's actual holdings. */
  inModelUniverse: boolean;
};

/**
 * Builds a code -> security lookup from real, already-existing app data:
 * the security master (approval status, house view) where available, and
 * the LIVE model portfolio (fetchCoreSecurities, Supabase) for asset
 * class, sector, and indicative name.
 *
 * This used to read from a static model-portfolios.ts file that didn't
 * reflect edits made on the Model Portfolio tab, so the "suggested
 * candidates" list when adding a security (and anything else built on
 * this universe) could drift from what the model actually holds. It now
 * reads the live core directly, so it's always current - at the cost of
 * being async (a Supabase read) rather than a synchronous in-memory
 * lookup, which every caller needs to account for.
 *
 * Still not exhaustive - anything a client holds that isn't in the
 * security master or the live model portfolio will come back unmapped,
 * and the UI should say so plainly rather than guess.
 */
export async function buildSecurityUniverse(): Promise<Map<string, SecurityUniverseEntry>> {
  const universe = new Map<string, SecurityUniverseEntry>();

  const modelSecurities = await fetchCoreSecurities();
  for (const security of modelSecurities) {
    const code = normaliseCode(security.code);
    if (universe.has(code)) continue;

    const assetClassMeta = ASSET_CLASSES.find((ac) => ac.name === security.assetClass);

    universe.set(code, {
      code,
      name: security.name,
      sector: security.sector ?? security.assetClass,
      assetClass: security.assetClass,
      assetClassType: assetClassMeta?.type ?? "Growth",
      inSecurityMaster: false,
      inModelUniverse: true,
    });
  }

  for (const security of securityMasterData) {
    const code = normaliseCode(security.code);
    const existing = universe.get(code);

    universe.set(code, {
      code,
      name: security.name,
      sector: security.sector,
      // The security master doesn't track asset class directly (it's an
      // equities-only approved list today), so fall back to whatever the
      // model universe says, or a sensible equities default.
      assetClass: existing?.assetClass ?? "Australian Equities",
      assetClassType: existing?.assetClassType ?? "Growth",
      inSecurityMaster: true,
      inModelUniverse: existing?.inModelUniverse ?? false,
    });
  }

  return universe;
}

export function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}
