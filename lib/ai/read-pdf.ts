import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../supabase'

// Shared PDF reading for client statements and research documents.
//
// Files are uploaded to private storage by the browser first, then read
// here by path - Vercel caps request bodies at ~4.5MB, which a scanned
// statement or long research note easily exceeds.

const BUCKET = 'research-documents'

export async function downloadStoredPdf(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath)
  if (error || !data) throw new Error(`Couldn't read the uploaded file: ${error?.message ?? 'not found'}`)
  const buffer = Buffer.from(await data.arrayBuffer())
  return buffer.toString('base64')
}

export async function removeStoredFile(storagePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath])
}

/** Sends a PDF to Claude with a system prompt and returns the parsed JSON object it replies with. */
export async function extractJsonFromPdf<T>(input: {
  base64: string
  system: string
  instruction: string
  maxTokens?: number
}): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.')
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: input.maxTokens ?? 16000,
    system: input.system,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.base64 } },
          { type: 'text', text: input.instruction },
        ],
      },
    ],
  })

  const textBlocks = response.content.filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
  const raw = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : ''
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first === -1 || last <= first) {
    throw new Error(
      response.stop_reason === 'max_tokens'
        ? 'The document was too long to read completely. Try splitting it into smaller parts.'
        : 'Could not read a structured result from the document.',
    )
  }
  try {
    return JSON.parse(cleaned.slice(first, last + 1)) as T
  } catch {
    throw new Error('Could not read a structured result from the document.')
  }
}
