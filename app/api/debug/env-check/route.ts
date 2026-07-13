// TEMPORARY diagnostic route — checks the shape of Supabase env vars
// without exposing their actual values, to rule out whitespace/typo
// issues causing "fetch failed" errors. Safe to delete once resolved.

export const runtime = "nodejs";

function inspect(value: string | undefined, name: string) {
  if (value === undefined) {
    return { name, present: false };
  }

  return {
    name,
    present: true,
    length: value.length,
    startsWithHttps: value.startsWith("https://"),
    hasLeadingWhitespace: value !== value.trimStart(),
    hasTrailingWhitespace: value !== value.trimEnd(),
    hasNewline: /[\r\n]/.test(value),
    firstChars: value.slice(0, 12),
    lastChars: value.slice(-8),
  };
}

export async function GET() {
  const url = inspect(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = inspect(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
  const anthropicKey = inspect(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY");

  let liveConnectionTest: { ok: boolean; status?: number; error?: string } = {
    ok: false,
  };

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (rawUrl) {
    try {
      const testUrl = `${rawUrl.trim()}/rest/v1/weekly_briefs?select=id&limit=1`;
      const response = await fetch(testUrl, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        },
      });
      liveConnectionTest = { ok: response.ok, status: response.status };
    } catch (error) {
      liveConnectionTest = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return Response.json({ url, anonKey, anthropicKey, liveConnectionTest });
}
