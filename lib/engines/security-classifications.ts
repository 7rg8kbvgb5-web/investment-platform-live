import { supabase } from '../supabase'
import { normaliseCode } from './codes'

// Remembered adviser classifications (migration 0026). Once a holding has
// been classified on the Construction tab, every future statement holding
// that code is recognised automatically via buildSecurityUniverse().
// Separate from the Approved List on purpose - see the migration.

const TABLE = 'security_classifications'

export type SecurityClassification = {
  code: string
  name: string | null
  assetClass: string
  updatedAt: string
}

/** All remembered classifications. Returns [] (not an error) if the table isn't there yet. */
export async function listSecurityClassifications(): Promise<SecurityClassification[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('code')
  if (error) return []
  return (data ?? []).map((row: { code: string; name: string | null; asset_class: string; updated_at: string }) => ({
    code: row.code,
    name: row.name,
    assetClass: row.asset_class,
    updatedAt: row.updated_at,
  }))
}

/** Saves (or updates) classifications so they apply to every future upload. */
export async function rememberSecurityClassifications(
  changes: { code: string; name?: string | null; assetClass: string }[],
  options: { onlyIfNew?: boolean } = {},
): Promise<void> {
  if (changes.length === 0) return
  const now = new Date().toISOString()
  const { error } = await supabase.from(TABLE).upsert(
    changes.map((c) => ({
      code: normaliseCode(c.code),
      name: c.name ?? null,
      asset_class: c.assetClass,
      updated_at: now,
    })),
    { onConflict: 'code', ignoreDuplicates: options.onlyIfNew ?? false },
  )
  if (error) throw new Error(`Couldn't save the classification for future uploads: ${error.message}`)
}
