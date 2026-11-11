import { supabase } from '../../../../lib/supabase'

export const runtime = 'nodejs'

const BUCKET = 'research-documents'

/**
 * Issues a one-time signed upload URL for private document storage.
 *
 * The browser used to upload straight into the bucket under the adviser's
 * own session, which depends on storage row-level-security policies being
 * exactly right - and fails with "new row violates row-level security
 * policy" when they aren't. Instead the server (service-role key, already
 * behind the sign-in gate in proxy.ts) authorises each upload: it picks the
 * path and hands back a single-use token. The browser then uploads the file
 * directly to storage with that token, so large PDFs still bypass Vercel's
 * ~4.5MB request limit.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawName = typeof body?.fileName === 'string' ? body.fileName : 'document.pdf'
    const rawFolder = typeof body?.folder === 'string' ? body.folder : 'uploads'
    const folder = rawFolder.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9\-_]/g, '') || 'uploads'
    const fileName = rawName.replace(/[^\w.\-]/g, '_').slice(-120)
    const path = `${folder}/${Date.now()}-${fileName}`

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
    if (error || !data) {
      return Response.json(
        { ok: false, error: `Couldn't prepare the upload: ${error?.message ?? 'no upload URL returned'}` },
        { status: 500 },
      )
    }
    return Response.json({ ok: true, path: data.path, token: data.token })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Upload preparation failed.' },
      { status: 500 },
    )
  }
}
