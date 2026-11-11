// Adviser names - safe in browser and server code.
//
// First name comes from, in order:
//   1. the adviser's own saved name (Supabase user metadata, set from the
//      dashboard the first time an unknown adviser signs in)
//   2. the known-adviser list below, matched on the sign-in email
//   3. nothing - the dashboard then asks for it once
const KNOWN_ADVISERS: { match: RegExp; firstName: string }[] = [
  { match: /allitt/i, firstName: 'Sean' },
  { match: /ognenovski|^louie/i, firstName: 'Louie' },
]

export type SignedInAdviser = { email: string | null; firstName: string | null }

export function firstNameFor(email: string | null | undefined, metadata: Record<string, unknown> | undefined): string | null {
  const saved = metadata?.first_name ?? metadata?.full_name ?? metadata?.name
  if (typeof saved === 'string' && saved.trim()) return saved.trim().split(/\s+/)[0]
  if (!email) return null
  const local = email.split('@')[0]
  return KNOWN_ADVISERS.find((a) => a.match.test(local))?.firstName ?? null
}
