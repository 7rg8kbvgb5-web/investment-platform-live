import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Who is signed in, for personal touches like the dashboard greeting (server only).
import { firstNameFor, type SignedInAdviser } from './adviser-names'
export { firstNameFor, type SignedInAdviser }

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
