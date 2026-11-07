/** Canonical form for comparing security codes across uploads, the model and the Approved List. */
export function normaliseCode(code: string): string {
  return code.trim().toUpperCase()
}
