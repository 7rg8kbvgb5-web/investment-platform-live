import { getLatestWeeklyBrief } from "../../../../lib/engines/weekly-brief";

export const runtime = "nodejs";

export async function GET() {
  try {
    const brief = await getLatestWeeklyBrief();
    return Response.json({ ok: true, brief });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
