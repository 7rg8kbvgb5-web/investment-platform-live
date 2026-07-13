import { securityMasterData } from "../../domain/types/security-master-data";
import { modelPortfolios } from "./model-portfolios";

export type SecurityUniverseEntry = {
  code: string;
  name: string;
  sector: string;
  assetClass: string;
  assetClassType: "Growth" | "Defensive";
  /** True if this security is on the Approved List (security master), giving access to House View / conviction. */
  inSecurityMaster: boolean;
  /** True if this security appears in at least one model portfolio's target holdings. */
  inModelUniverse: boolean;
};

/**
 * Builds a code -> security lookup from real, already-existing app data:
 * the security master (approval status, house view) where available, and
 * the model portfolios (asset class, sector, indicative name) for the
 * broader universe of ETFs, managed funds, bonds and cash that the
 * security master doesn't yet cover.
 *
 * This replaces a previous hardcoded 12-ticker lookup table. It is still
 * not exhaustive — anything a client holds that isn't in the security
 * master or any model portfolio will come back unmapped, and the UI
 * should say so plainly rather than guess.
 */
export function buildSecurityUniverse(): Map<string, SecurityUniverseEntry> {
  const universe = new Map<string, SecurityUniverseEntry>();

  for (const assetClass of modelPortfolios.flatMap((p) => p.assetClasses)) {
    for (const holding of assetClass.holdings) {
      const code = normaliseCode(holding.code);
      if (universe.has(code)) continue;

      universe.set(code, {
        code,
        name: holding.name,
        sector: holding.sector ?? assetClass.name,
        assetClass: assetClass.name,
        assetClassType: assetClass.type,
        inSecurityMaster: false,
        inModelUniverse: true,
      });
    }
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
