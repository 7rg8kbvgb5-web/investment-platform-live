import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// One import for every engine, two clients underneath:
//
// - In the browser: the signed-in adviser's session (stored in cookies by
//   the login page). Database rules only allow signed-in users, so this
//   only works once someone has logged in.
// - On the server (API routes, scans, crons): the service-role key, which
//   never leaves the server. Every server route is already gated by the
//   sign-in check in proxy.ts (crons by CRON_SECRET), so nothing reaches
//   these without being authorised first.
//
// Falls back to a placeholder URL so build-time page data collection
// doesn't crash before the real Vercel environment variables exist.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

function makeClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabase = makeClient();
