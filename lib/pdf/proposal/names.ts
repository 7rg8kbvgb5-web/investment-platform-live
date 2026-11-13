// Client-facing security names: tidy what data sources return (non-breaking
// spaces, exchange boilerplate) without changing which security it is.

export function displaySecurityName(name: string): string {
  let n = name.replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim()
  const isCdi = /CHESS Depositary|\bCDIs?\b/i.test(n)
  // "(ASX: RMD – CHESS Depositary Interests, 10 CDIs per ordinary share)" and similar.
  n = n.replace(/\s*\((?:ASX|NYSE|NASDAQ)\s*:[^)]*\)/gi, '').trim()
  if (isCdi && !/\(CDI\)$/i.test(n)) n = `${n} (CDI)`
  return n
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-11-12" -> "12 November 2026"; anything else is returned as given. */
export function displayDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!m) return value
  const month = MONTHS[Number(m[2]) - 1]
  return month ? `${Number(m[3])} ${month} ${m[1]}` : value
}
