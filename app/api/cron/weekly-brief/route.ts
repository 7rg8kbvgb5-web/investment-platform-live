import { describeAiError } from '../../../../lib/ai-errors'
import { NextRequest } from "next/server";
import { generateWeeklyBrief } from "../../../../lib/engines/weekly-brief";
import { recordJobRun } from "../../../../lib/engines/system-health";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const brief = await generateWeeklyBrief();
    await recordJobRun("weekly-brief", { "weekly-brief": "ok" });
    return Response.json({ ok: true, brief });
  } catch (error) {
    console.error("Weekly brief generation failed:", error);
    await recordJobRun("weekly-brief", { "weekly-brief": describeAiError(error, "failed") });
    return Response.json(
      { ok: false, error: describeAiError(error, "Unknown error") },
      { status: 500 }
    );
  }
}
