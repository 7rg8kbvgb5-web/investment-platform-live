import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Who is signed in, for personal touches like the dashboard greeting.
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

export async function getSignedInAdviser(): Promise<SignedInAdviser> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Read-only here; the sign-in proxy refreshes the session.
          },
        },
      },
    )
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return { email: user?.email ?? null, firstName: firstNameFor(user?.email, user?.user_metadata) }
  } catch {
    return { email: null, firstName: null }
  }
}
