import { supabase } from '../supabase'
import { getQuote, isEodhdConfigured } from '../eodhd-client'

// System health for the dashboard banner: is every scan current and
// succeeding, are live prices flowing, is the database up to date with the
// code, and are the server settings in place. Every check is independent
// and time-boxed - one slow or failing check never blocks the dashboard.

export type HealthLevel = 'error' | 'warning'

export type HealthIssue = {
  level: HealthLevel
  area: 'Scans' | 'Prices' | 'Database' | 'Settings'
  message: string
  /** What to do about it, in one line. */
  action: string
  href?: string
}

export type SystemHealth = {
  checkedAt: string
  issues: HealthIssue[]
}

const DAY = 86_400_000

// ─── Job run log (migration 0034) ────────────────────────────────────────

/** Best effort: recording a run never fails the job itself. */
export async function recordJobRun(job: string, results: Record<string, string>): Promise<void> {
  try {
    const ok = Object.values(results).every((r) => r === 'ok')
    await supabase.from('system_job_runs').insert({ job, ok, results })
  } catch (error) {
    console.error(`Couldn't record the ${job} run:`, error)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function isMissingSchema(message: string | undefined): boolean {
  return !!message && /(does not exist|schema cache|could not find)/i.test(message)
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))])
}

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / DAY
}

function ageText(iso: string): string {
  const d = Math.floor(daysAgo(iso))
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

// ─── Scans ───────────────────────────────────────────────────────────────

// How old each scan's latest output may be before it's flagged. The daily
// job runs weekdays only, so Monitoring allows for a weekend; the others
// run once a week on rotation.
const SCANS: Array<{ name: string; table: string; column: string; maxDays: number; href: string }> = [
  { name: 'Monitoring scan', table: 'investment_monitoring_alerts', column: 'generated_at', maxDays: 4, href: '/monitoring' },
  { name: 'Fund Reviews scan', table: 'fund_review_alerts', column: 'generated_at', maxDays: 9, href: '/fund-reviews' },
  { name: 'Tactical Asset Class View', table: 'tactical_asset_class_view', column: 'generated_at', maxDays: 9, href: '/market-view' },
  { name: 'Sector Health scan', table: 'sector_health_scores', column: 'generated_at', maxDays: 9, href: '/data-analytics' },
  { name: 'Weekly brief', table: 'weekly_briefs', column: 'generated_at', maxDays: 9, href: '/research' },
]

const STEP_LABELS: Record<string, string> = {
  monitoring: 'Monitoring',
  'fund-reviews': 'Fund Reviews',
  'tactical-view': 'Tactical Asset Class View',
  'sector-health': 'Sector Health',
  'investment-committee-sync': 'Investment Committee sync',
  'weekly-brief': 'Weekly brief',
}

async function checkScans(): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = []

  const latest = await Promise.all(
    SCANS.map(async (scan) => {
      const { data, error } = await supabase
        .from(scan.table)
        .select(scan.column)
        .order(scan.column, { ascending: false })
        .limit(1)
        .maybeSingle()
      return { scan, at: error ? null : ((data as unknown as Record<string, string> | null)?.[scan.column] ?? null), error }
    }),
  )
  for (const { scan, at, error } of latest) {
    if (error) continue // a missing table is reported by the database check
    if (!at) {
      issues.push({
        level: 'warning',
        area: 'Scans',
        message: `${scan.name} has never run.`,
        action: 'Run it once from its page; after that it runs on schedule.',
        href: scan.href,
      })
    } else if (daysAgo(at) > scan.maxDays) {
      issues.push({
        level: 'warning',
        area: 'Scans',
        message: `${scan.name} last ran ${ageText(at)}.`,
        action: 'Check the scheduled job in Vercel, or run it now from its page.',
        href: scan.href,
      })
    }
  }

  // The most recent run of each scheduled job - flag any step that failed.
  const { data: runs, error } = await supabase
    .from('system_job_runs')
    .select('job, ok, results, ran_at')
    .order('ran_at', { ascending: false })
    .limit(20)
  if (!error) {
    const seen = new Set<string>()
    for (const run of (runs ?? []) as { job: string; ok: boolean; results: Record<string, string>; ran_at: string }[]) {
      if (seen.has(run.job)) continue
      seen.add(run.job)
      if (run.ok) continue
      for (const [step, outcome] of Object.entries(run.results ?? {})) {
        if (outcome === 'ok') continue
        issues.push({
          level: 'error',
          area: 'Scans',
          message: `${STEP_LABELS[step] ?? step} failed ${ageText(run.ran_at)}: ${String(outcome).slice(0, 160)}`,
          action: /credit|billing|balance/i.test(String(outcome))
            ? 'Top up the Anthropic API credit at console.anthropic.com.'
            : /key|auth|401/i.test(String(outcome))
              ? 'Check the API key in Vercel environment variables.'
              : 'Re-run it from its page; if it fails again, send me the message.',
        })
      }
    }
  }

  return issues
}

// ─── Prices ──────────────────────────────────────────────────────────────

async function checkPrices(): Promise<HealthIssue[]> {
  if (!isEodhdConfigured()) {
    return [
      {
        level: 'error',
        area: 'Prices',
        message: 'Live prices are off - EODHD_API_KEY is not set.',
        action: 'Add EODHD_API_KEY in Vercel environment variables and redeploy.',
      },
    ]
  }
  try {
    const quote = await withTimeout(getQuote('CBA.AU'), 5000, null)
    if (!quote) {
      return [{ level: 'warning', area: 'Prices', message: 'The price feed (EODHD) is slow to respond.', action: 'Usually temporary - check again shortly.' }]
    }
    const tsMs = Number(quote.timestamp) * 1000
    if (Number.isFinite(tsMs) && tsMs > 0 && Date.now() - tsMs > 4 * DAY) {
      return [
        {
          level: 'warning',
          area: 'Prices',
          message: `Prices look stale - the latest quote is from ${new Date(tsMs).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}.`,
          action: 'Check the EODHD subscription is active.',
        },
      ]
    }
    return []
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return [
      {
        level: 'error',
        area: 'Prices',
        message: `The price feed (EODHD) returned an error: ${msg.slice(0, 120)}`,
        action: /401|403|unauth|forbidden/i.test(msg)
          ? 'Check the EODHD key and subscription.'
          : 'Usually temporary - if it persists, check the EODHD account.',
      },
    ]
  }
}

// ─── Database (migrations) ───────────────────────────────────────────────

// One probe per recent migration: a table or column it creates. A missing
// one means that migration hasn't been run in Supabase yet.
const MIGRATION_PROBES: Array<{ migration: string; table: string; column?: string }> = [
  { migration: '0026', table: 'security_classifications' },
  { migration: '0027', table: 'proposal_records' },
  { migration: '0028', table: 'portfolio_models' },
  { migration: '0029', table: 'market_tracker_levels' },
  { migration: '0030', table: 'research_document_securities', column: 'rating_date' },
  { migration: '0031', table: 'security_commentary' },
  { migration: '0032', table: 'client_portfolio_reviews', column: 'commentary_selection' },
  { migration: '0033', table: 'risk_profile_strategic_weights' },
  { migration: '0034', table: 'system_job_runs' },
]

async function checkMigrations(): Promise<HealthIssue[]> {
  const results = await Promise.all(
    MIGRATION_PROBES.map(async (probe) => {
      const { error } = await supabase.from(probe.table).select(probe.column ?? '*').limit(1)
      return { probe, missing: !!error && isMissingSchema(error.message) }
    }),
  )
  const missing = results.filter((r) => r.missing).map((r) => r.probe.migration)
  if (missing.length === 0) return []
  return [
    {
      level: 'error',
      area: 'Database',
      message: `Migration${missing.length === 1 ? '' : 's'} ${missing.join(', ')} ${missing.length === 1 ? 'has' : 'have'} not been run in Supabase.`,
      action: 'Run them in the Supabase SQL editor, in order - the features that need them won’t work until then.',
    },
  ]
}

// ─── Settings ────────────────────────────────────────────────────────────

const REQUIRED_SETTINGS: Array<{ key: string; what: string }> = [
  { key: 'ANTHROPIC_API_KEY', what: 'AI scans, research reading and commentary' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', what: 'scheduled scans and server features' },
  { key: 'CRON_SECRET', what: 'protecting the scheduled jobs' },
  { key: 'ALLOWED_EMAILS', what: 'limiting sign-in to approved advisers' },
]

function checkSettings(): HealthIssue[] {
  return REQUIRED_SETTINGS.filter((s) => !process.env[s.key]).map((s) => ({
    level: 'error' as const,
    area: 'Settings' as const,
    message: `${s.key} is not set - needed for ${s.what}.`,
    action: 'Add it in Vercel → Settings → Environment Variables, then redeploy.',
  }))
}

// ─── Roll-up ─────────────────────────────────────────────────────────────

export async function getSystemHealth(): Promise<SystemHealth> {
  const timeboxed = (p: Promise<HealthIssue[]>) => withTimeout(p.catch(() => [] as HealthIssue[]), 7000, [] as HealthIssue[])
  const [migrations, scans, prices] = await Promise.all([
    timeboxed(checkMigrations()),
    timeboxed(checkScans()),
    timeboxed(checkPrices()),
  ])
  const issues = [...checkSettings(), ...migrations, ...scans, ...prices]
  issues.sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))
  return { checkedAt: new Date().toISOString(), issues }
}
