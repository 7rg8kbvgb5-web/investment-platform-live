import { generateWeeklyBrief } from "../../../../lib/engines/weekly-brief";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Manual trigger for the "Run Now" button in the app. Unlike
 * /api/cron/weekly-brief, this doesn't require CRON_SECRET — it's meant
 * to be called by an adviser already using the platform, not by an
 * external scheduler. The secret-gated route stays reserved for Vercel's
 * actual cron caller.
 */
export async function POST() {
  try {
    const brief = await generateWeeklyBrief();
    return Response.json({ ok: true, brief });
  } catch (error) {
    console.error("Manual weekly brief generation failed:", error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
