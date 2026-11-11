import { cookies } from 'next/headers'
import { DEFAULT_MODEL_ID, MODEL_COOKIE } from './model-context'

/** The selected adviser model, for server components and route handlers. */
export async function selectedModelIdFromCookies(): Promise<string> {
  try {
    const store = await cookies()
    return store.get(MODEL_COOKIE)?.value || DEFAULT_MODEL_ID
  } catch {
    return DEFAULT_MODEL_ID
  }
}
