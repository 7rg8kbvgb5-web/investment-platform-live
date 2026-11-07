// Withdrawn: this endpoint generated a proposal from a mock engine with
// hardcoded sample holdings. It returns 410 until Client Advice is rebuilt
// on real Construction data.
export async function GET() {
  return Response.json(
    { ok: false, error: 'Proposal export is being rebuilt and is temporarily unavailable.' },
    { status: 410 },
  )
}
