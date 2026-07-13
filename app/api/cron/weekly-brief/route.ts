import { NextRequest } from "next/server";
import { generateWeeklyBrief } from "../../../../lib/engines/weekly-brief";

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
    return Response.json({ ok: true, brief });
  } catch (error) {
    console.error("Weekly brief generation failed:", error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
