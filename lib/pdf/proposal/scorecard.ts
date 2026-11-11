import type { ClientAdvice } from '../../engines/client-advice'
import type { PortfolioRiskStats } from './insights'

// "Before and after" scorecard for the proposal: the portfolio today vs as
// recommended, on the measures a client cares about. Every figure comes
// from the same advice and risk calculations used elsewhere in the document.

export type ScorecardRow = {
  group: 'Diversification' | 'Shape' | 'Income' | 'Return and risk'
  label: string
  today: string
  recommended: string
  /** Optional detail under the figures, e.g. which holding is largest. */
  todayNote?: string
  recommendedNote?: string
  /** 'better' / 'worse' only where the direction is unambiguous for this client; otherwise neutral. */
  direction: 'better' | 'worse' | 'neutral'
}

type Holding = { code: string; weight: number; assetClass: string }

export function buildScorecard(input: {
  advice: ClientAdvice
  gdNow: { growth: number; defensive: number }
  gdAfter: { growth: number; defensive: number }
  current: Record<string, number>
  after: Record<string, number>
  riskNow: PortfolioRiskStats | null
  riskAfter: PortfolioRiskStats | null
}): ScorecardRow[] {
  const { advice, gdNow, gdAfter, current, after, riskNow, riskAfter } = input
  const today: Holding[] = advice.currentHoldings.filter((h) => !isCash(h))
  const rec: Holding[] = advice.resultingHoldings.filter((h) => h.weight > 0 && !isCash(h))
  if (today.length === 0 || rec.length === 0) return []

  const rows: ScorecardRow[] = []
  const largestToday = largest(today)
  const largestRec = largest(rec)
  rows.push({
    group: 'Diversification',
    label: 'Investments held',
    today: String(today.length),
    recommended: String(rec.length),
    direction: rec.length > today.length ? 'better' : 'neutral',
  })
  rows.push({
    group: 'Diversification',
    label: 'Largest single holding',
    today: pct(largestToday.weight),
    recommended: pct(largestRec.weight),
    todayNote: largestToday.code,
    recommendedNote: largestRec.code,
    direction: largestRec.weight < largestToday.weight - 0.5 ? 'better' : largestRec.weight > largestToday.weight + 0.5 ? 'worse' : 'neutral',
  })
  const top5Today = topN(today, 5)
  const top5Rec = topN(rec, 5)
  rows.push({
    group: 'Diversification',
    label: 'Top five holdings combined',
    today: pct(top5Today),
    recommended: pct(top5Rec),
    direction: top5Rec < top5Today - 1 ? 'better' : top5Rec > top5Today + 1 ? 'worse' : 'neutral',
  })
  const offshoreToday = (current['International Equities'] ?? 0) + (current['Global Fixed Interest'] ?? 0)
  const offshoreRec = (after['International Equities'] ?? 0) + (after['Global Fixed Interest'] ?? 0)
  rows.push({
    group: 'Diversification',
    label: 'Invested outside Australia',
    today: pct(offshoreToday),
    recommended: pct(offshoreRec),
    direction: 'neutral',
  })

  rows.push({
    group: 'Shape',
    label: 'Growth / defensive',
    today: `${Math.round(gdNow.growth)} / ${Math.round(gdNow.defensive)}`,
    recommended: `${Math.round(gdAfter.growth)} / ${Math.round(gdAfter.defensive)}`,
    recommendedNote: `${advice.riskProfile} profile`,
    direction: 'neutral',
  })
  rows.push({
    group: 'Shape',
    label: 'Held in cash',
    today: pct(current['Cash'] ?? 0),
    recommended: pct(after['Cash'] ?? 0),
    direction: 'neutral',
  })

  if (advice.currentIncome !== null && advice.projectedIncome !== null) {
    rows.push({
      group: 'Income',
      label: 'Estimated annual income',
      today: money(advice.currentIncome),
      recommended: money(advice.projectedIncome),
      todayNote: advice.currentYieldPct !== null ? `${pct(advice.currentYieldPct)} yield` : undefined,
      recommendedNote: advice.projectedYieldPct !== null ? `${pct(advice.projectedYieldPct)} yield` : undefined,
      direction: advice.projectedIncome > advice.currentIncome * 1.01 ? 'better' : advice.projectedIncome < advice.currentIncome * 0.99 ? 'worse' : 'neutral',
    })
  }
  if (advice.currentFrankingCredits !== null && advice.projectedFrankingCredits !== null) {
    rows.push({
      group: 'Income',
      label: 'Franking credits a year',
      today: money(advice.currentFrankingCredits),
      recommended: money(advice.projectedFrankingCredits),
      direction: 'neutral',
    })
  }

  if (riskNow && riskAfter) {
    rows.push({
      group: 'Return and risk',
      label: 'Expected return (incl. franking)',
      today: `${riskNow.expectedReturnInclFranking.toFixed(1)}% p.a.`,
      recommended: `${riskAfter.expectedReturnInclFranking.toFixed(1)}% p.a.`,
      direction: 'neutral',
    })
    rows.push({
      group: 'Return and risk',
      label: 'Typical yearly variation',
      today: `±${riskNow.volatility.toFixed(1)}%`,
      recommended: `±${riskAfter.volatility.toFixed(1)}%`,
      direction: 'neutral',
    })
    // Return per unit of risk - the clearest single measure of a better-built portfolio.
    const effNow = riskNow.volatility > 0 ? riskNow.expectedReturnInclFranking / riskNow.volatility : 0
    const effAfter = riskAfter.volatility > 0 ? riskAfter.expectedReturnInclFranking / riskAfter.volatility : 0
    rows.push({
      group: 'Return and risk',
      label: 'Return for each unit of risk',
      today: effNow.toFixed(2),
      recommended: effAfter.toFixed(2),
      direction: effAfter > effNow + 0.02 ? 'better' : effAfter < effNow - 0.02 ? 'worse' : 'neutral',
    })
  }
  return rows
}

function isCash(h: { code: string; assetClass: string }): boolean {
  return h.assetClass === 'Cash'
}

function largest(list: Holding[]): Holding {
  return list.reduce((a, b) => (b.weight > a.weight ? b : a))
}

function topN(list: Holding[], n: number): number {
  return [...list].sort((a, b) => b.weight - a.weight).slice(0, n).reduce((s, h) => s + h.weight, 0)
}

function pct(v: number): string {
  const r = Math.round(v * 10) / 10
  return `${Number.isInteger(r) ? r : r.toFixed(1)}%`
}

function money(v: number): string {
  return `$${Math.round(v).toLocaleString('en-AU')}`
}
