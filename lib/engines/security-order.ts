import { ASSET_CLASSES } from './model-portfolio-core'

/**
 * The ONE ordering rule for securities anywhere they're listed on the way to
 * the client proposal: grouped by asset class (in the house's standard
 * ASSET_CLASSES order), then alphabetical by code within each class.
 *
 * Applied at the source (fetchCoreSecurities, the model build, the
 * Construction comparison, cash deployment, CGT lines) so every screen and the
 * PDF inherit it - a security added today or in a year lands in its
 * alphabetical slot automatically. Don't sort by display_order, weight or
 * trade size in a holdings list; route it through here instead.
 */
const collator = new Intl.Collator('en-AU', { numeric: true, sensitivity: 'base' })

export function compareSecurityCodes(
  a: { code: string; name?: string | null },
  b: { code: string; name?: string | null },
): number {
  return collator.compare(a.code, b.code) || collator.compare(a.name ?? '', b.name ?? '')
}

function assetClassRank(name: string | null | undefined): number {
  const index = ASSET_CLASSES.findIndex((ac) => ac.name === name)
  return index === -1 ? ASSET_CLASSES.length : index
}

export function compareByAssetClassThenCode(
  a: { code: string; name?: string | null; assetClass?: string | null },
  b: { code: string; name?: string | null; assetClass?: string | null },
): number {
  return assetClassRank(a.assetClass) - assetClassRank(b.assetClass) || compareSecurityCodes(a, b)
}

/** Returns a new array in the standard order; never mutates the input. */
export function sortSecurities<T extends { code: string; name?: string | null; assetClass?: string | null }>(
  items: readonly T[],
): T[] {
  return [...items].sort(compareByAssetClassThenCode)
}
