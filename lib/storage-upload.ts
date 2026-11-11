import { supabase } from './supabase'

const BUCKET = 'research-documents'

/**
 * Browser-side upload of a document to private storage, authorised by the
 * server (see app/api/storage/upload-url). Returns the stored path, which the
 * server routes read and delete. Use this for every upload - never call
 * storage.upload() directly from the browser.
 */
export async function uploadToPrivateStorage(file: File, folder: string): Promise<string> {
  const res = await fetch('/api/storage/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, folder }),
  })
  const data = await res.json().catch(() => null)
  if (!data?.ok || !data.path || !data.token) {
    throw new Error(data?.error ?? `Upload preparation failed (HTTP ${res.status}).`)
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(data.path, data.token, file, { contentType: file.type || 'application/pdf' })
  if (error) throw new Error(error.message)
  return data.path as string
}
