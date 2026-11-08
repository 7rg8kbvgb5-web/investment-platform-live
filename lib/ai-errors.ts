// Turns raw Anthropic API / network errors into plain-English messages an
// adviser can act on, instead of a JSON error dump on screen.

export function describeAiError(error: unknown, fallback = 'Something went wrong.'): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  const text = raw.toLowerCase()

  if (text.includes('credit balance is too low') || text.includes('billing')) {
    return 'AI features are paused: the Anthropic API account has run out of credit. Top it up at console.anthropic.com → Settings → Billing (turning on auto-reload stops this recurring), then try again.'
  }
  if (text.includes('invalid x-api-key') || text.includes('authentication_error') || text.includes('anthropic_api_key is not configured')) {
    return 'The Anthropic API key is missing or no longer valid. Check ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables.'
  }
  if (text.includes('overloaded') || text.includes('529')) {
    return "Anthropic's service is busy right now. Try again in a minute."
  }
  if (text.includes('rate_limit') || text.includes('429')) {
    return 'Too many AI requests in a short time. Wait a minute and try again.'
  }
  if (text.includes('request too large') || text.includes('413') || text.includes('too many pages')) {
    return 'That document is too large to read in one go. Try a smaller file, or split it into parts.'
  }
  if (text.includes('timeout') || text.includes('timed out') || text.includes('etimedout')) {
    return 'The request took too long and timed out. Try again.'
  }
  return raw || fallback
}
