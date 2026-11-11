import { listProposalRecords } from '../../../../lib/engines/proposal-records'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const review = new URL(request.url).searchParams.get('review')
  if (!review) return Response.json({ ok: false, error: 'No review given.' }, { status: 400 })
  return Response.json({ ok: true, records: await listProposalRecords(review) })
}
