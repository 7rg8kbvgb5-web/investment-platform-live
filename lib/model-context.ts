// Which adviser model the platform is working on.
//
// The selector in the sidebar stores the choice in a cookie, so every page
// and browser-side engine picks it up automatically. Server code that isn't
// tied to a client review passes the model explicitly (pages read the same
// cookie via next/headers); anything tied to a client review uses the
// review's own model; scans cover every model.
//
// No server-only imports here - safe in browser and server code.

export const MODEL_COOKIE = 'om_model'
/** The original house model, now Sean's (migration 0028). */
export const DEFAULT_MODEL_ID = 'sean'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

/** The selected model in the browser; on the server, the default unless a model is passed. */
export function resolveModelId(modelId?: string | null): string {
  if (modelId) return modelId
  return readCookie(MODEL_COOKIE) || DEFAULT_MODEL_ID
}

export function setSelectedModelId(modelId: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${MODEL_COOKIE}=${encodeURIComponent(modelId)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export function hasSelectedModelCookie(): boolean {
  return readCookie(MODEL_COOKIE) !== null
}

/** True when the database doesn't have model_id yet (before migration 0028). */
export function isMissingModelColumn(error: { message?: string } | null | undefined): boolean {
  return !!error?.message && /model_id/.test(error.message) && /(column|does not exist|schema cache)/i.test(error.message)
}
