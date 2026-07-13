import { createClient } from '@supabase/supabase-js';

// Falls back to a placeholder URL so that build-time page data collection
// (which evaluates this module even for routes that only run at request
// time) doesn't crash before the real Vercel environment variables are
// configured. Any real request made against the placeholder will fail
// clearly at call time rather than at build time.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
