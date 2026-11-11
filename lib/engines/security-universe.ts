import { listApprovedSecurities } from "./approved-list";
import { normaliseCode } from "./codes";
import { fetchCoreSecurities, ASSET_CLASSES } from "./model-portfolio-core";
import { listSecurityClassifications } from "./security-classifications";

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
  /** Wholesale bonds: ISIN, recorded in the rationale when added via bond lookup. Lets statements that list bonds by ISIN match. */
  isin?: string;
  /** True when the only thing the platform knows is the adviser's remembered classification (migration 0026). */
  adviserClassified?: boolean;
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
export async function buildSecurityUniverse(modelId?: string | null): Promise<Map<string, SecurityUniverseEntry>> {
  const universe = new Map<string, SecurityUniverseEntry>();

  const modelSecurities = await fetchCoreSecurities(modelId);
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
      isin: security.rationale?.match(/ISIN ([A-Z]{2}[A-Z0-9]{9}[0-9])/)?.[1],
    });
  }

  // Approved List securities not held in the model (live, from Supabase).
  // Removed securities are still mapped - a client may well hold one - but
  // flagged as not approved. If the list can't be read, the model alone
  // still gives a usable universe.
  let approved: Awaited<ReturnType<typeof listApprovedSecurities>> = [];
  try {
    approved = await listApprovedSecurities();
  } catch {
    approved = [];
  }
  for (const security of approved) {
    const code = normaliseCode(security.code);
    const existing = universe.get(code);
    const assetClass = existing?.assetClass ?? security.assetClass ?? "Australian Equities";
    const assetClassMeta = ASSET_CLASSES.find((ac) => ac.name === assetClass);

    universe.set(code, {
      code,
      name: existing?.name ?? security.name,
      sector: existing?.sector ?? security.sector ?? assetClass,
      assetClass,
      assetClassType: existing?.assetClassType ?? assetClassMeta?.type ?? "Growth",
      inSecurityMaster: security.status === "approved",
      inModelUniverse: existing?.inModelUniverse ?? false,
      isin: existing?.isin,
    });
  }

  // Lowest priority: classifications advisers have made on the Construction
  // tab, remembered so the same security is recognised on future statements.
  const remembered = await listSecurityClassifications();
  for (const c of remembered) {
    const code = normaliseCode(c.code);
    if (universe.has(code)) continue;
    const assetClassMeta = ASSET_CLASSES.find((ac) => ac.name === c.assetClass);
    if (!assetClassMeta) continue;
    universe.set(code, {
      code,
      name: c.name ?? code,
      sector: "Classified by adviser",
      assetClass: assetClassMeta.name,
      assetClassType: assetClassMeta.type,
      inSecurityMaster: false,
      inModelUniverse: false,
      adviserClassified: true,
    });
  }

  return universe;
}

export { normaliseCode } from "./codes";
