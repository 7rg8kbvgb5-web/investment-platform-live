import { proposalDownloadUrl } from '../../../../../lib/engines/proposal-records'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return Response.json({ ok: false, error: 'No record given.' }, { status: 400 })
  const url = await proposalDownloadUrl(id)
  if (!url) return Response.json({ ok: false, error: 'That proposal PDF is not available.' }, { status: 404 })
  return Response.redirect(url, 302)
}
