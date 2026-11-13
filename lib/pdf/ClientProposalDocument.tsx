import type { ReactNode } from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ClientAdvice } from '../engines/client-advice'
import { DRIFT_TOLERANCE_PP } from '../engines/client-advice'
import { ASSET_CLASSES, RISK_PROFILES } from '../engines/model-portfolio-core'
import { CGT_DISCLAIMERS, ENTITY_LABELS, type CgtResult } from '../tax/cgt'
import type { TaxReference } from '../tax/tax-reference'
import type { ClientObjectives } from '../engines/client-portfolio-reviews'
import { buildScorecard } from './proposal/scorecard'
import { runStressTest, STRESS_INDEX_NOTE } from '../engines/stress-test'
import { exclusionStatus } from '../engines/exclusions-check'
import type { IncomeCalendar } from '../engines/income-calendar'
import { ADVICE_TEAM } from './proposal/team'
import {
  OM,
  colourFor,
  Donut,
  LegendRow,
  GrowthDefensiveBar,
  ProfileSpectrum,
  PairedBars,
  NetFlowBars,
  LineChart,
  BarChart,
  HBars,
  Weave,
  shortMoney,
} from './proposal/charts'
import {
  CAPITAL_MARKET_ASSUMPTIONS,
  CMA_AS_AT,
  CPI_ASSUMPTION,
  PROFILE_GUIDE,
  BROKERAGE_CAP,
  BOND_TRANSACTION_RATE,
  afterAdviceWeights,
  currentWeights,
  estimateFees,
  portfolioRiskStats,
  projectScenarios,
} from './proposal/insights'

// Client-facing investment proposal. Every figure comes from the same
// calculation as the Client Advice tab (lib/engines/client-advice.ts);
// estimates (expected returns, risk, projections) come from
// lib/pdf/proposal/insights.ts and are labelled as such throughout.
// Ord Minnett palette and serif display type, matching the PARS pitch deck.

const ABN_LINE = 'Ord Minnett Limited ABN 86 002 733 048, AFS Licence 237121'

const s = StyleSheet.create({
  page: { paddingTop: 62, paddingBottom: 64, paddingHorizontal: 50, fontSize: 9, fontFamily: 'Helvetica', color: OM.ink },
  header: { position: 'absolute', top: 24, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 0.6, borderBottomColor: OM.paleSilver, paddingBottom: 6 },
  wordmark: { fontFamily: 'Times-Bold', fontSize: 10, letterSpacing: 2.2, color: OM.navy },
  headerRight: { fontSize: 7, color: OM.slate, letterSpacing: 0.6 },
  footer: { position: 'absolute', bottom: 26, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, color: OM.slate, borderTopWidth: 0.6, borderTopColor: OM.paleSilver, paddingTop: 6 },
  eyebrow: { fontSize: 7.5, letterSpacing: 1.6, color: OM.red, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  h1: { fontFamily: 'Times-Bold', fontSize: 21, color: OM.navy, marginBottom: 6 },
  rule: { width: 34, height: 2, backgroundColor: OM.red, marginBottom: 14 },
  lead: { fontSize: 10.5, lineHeight: 1.55, color: OM.ink, marginBottom: 10 },
  h2: { fontFamily: 'Times-Bold', fontSize: 13, color: OM.navy, marginTop: 14, marginBottom: 6 },
  h3: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: OM.navy, letterSpacing: 0.8, marginBottom: 5 },
  p: { fontSize: 9, lineHeight: 1.55, color: OM.ink, marginBottom: 6 },
  small: { fontSize: 7.5, lineHeight: 1.45, color: OM.slate, marginBottom: 4 },
  muted: { color: OM.slate },
  bold: { fontFamily: 'Helvetica-Bold' },
  tiles: { flexDirection: 'row', marginBottom: 12 },
  tile: { flexGrow: 1, flexBasis: 0, backgroundColor: OM.paleGrey, paddingVertical: 9, paddingHorizontal: 10, marginRight: 6, borderTopWidth: 2, borderTopColor: OM.navy },
  tileLast: { marginRight: 0 },
  tileLabel: { fontSize: 6.5, color: OM.slate, letterSpacing: 0.9, marginBottom: 4 },
  tileValue: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: OM.navy },
  tileNote: { fontSize: 6.5, color: OM.slate, marginTop: 2 },
  row: { flexDirection: 'row' },
  col: { flexGrow: 1, flexBasis: 0 },
  card: { backgroundColor: OM.paleGrey, padding: 12 },
  callout: { borderLeftWidth: 2.5, borderLeftColor: OM.red, backgroundColor: OM.paleGrey, paddingVertical: 10, paddingHorizontal: 12, marginVertical: 8 },
  table: { borderTopWidth: 1.2, borderTopColor: OM.navy, marginBottom: 6 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: OM.grid, paddingVertical: 4 },
  trGroup: { flexDirection: 'row', paddingTop: 8, paddingBottom: 3, borderBottomWidth: 0.8, borderBottomColor: OM.paleSilver },
  trTotal: { flexDirection: 'row', paddingVertical: 5, borderTopWidth: 0.8, borderTopColor: OM.navy },
  th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: OM.slate, letterSpacing: 0.6 },
  td: { fontSize: 8 },
  code: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: OM.navy },
  bullet: { flexDirection: 'row', marginBottom: 5 },
  bulletDot: { width: 10, fontSize: 9, color: OM.red, fontFamily: 'Helvetica-Bold' },
  bulletText: { flexGrow: 1, flexBasis: 0, fontSize: 9, lineHeight: 1.5 },
  step: { flexDirection: 'row', marginBottom: 9 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: OM.navy, color: OM.white, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingTop: 6, marginRight: 10 },
  // cover
  cover: { backgroundColor: OM.navy, color: OM.white, padding: 0 },
})

function fmt(value: number): string {
  return value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}
function pct(v: number, dp = 1): string {
  return `${(Math.round(v * 10 ** dp) / 10 ** dp).toFixed(dp)}%`
}

function Chrome({ client }: { client: string }) {
  return (
    <>
      <View style={s.header} fixed>
        <Text style={s.wordmark}>ORD MINNETT</Text>
        <Text style={s.headerRight}>INVESTMENT PROPOSAL · {client.toUpperCase()}</Text>
      </View>
      <View style={s.footer} fixed>
        <Text>{ABN_LINE} · Private and confidential</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </>
  )
}

function SectionTitle({ n, eyebrow, title }: { n: number; eyebrow: string; title: string }) {
  return (
    <View minPresenceAhead={120}>
      <Text style={s.eyebrow}>
        {String(n).padStart(2, '0')} · {eyebrow.toUpperCase()}
      </Text>
      <Text style={s.h1}>{title}</Text>
      <View style={s.rule} />
    </View>
  )
}

function Tile({ label, value, note, last }: { label: string; value: string; note?: string; last?: boolean }) {
  return (
    <View style={last ? [s.tile, s.tileLast] : s.tile}>
      <Text style={s.tileLabel}>{label.toUpperCase()}</Text>
      <Text style={s.tileValue}>{value}</Text>
      {note ? <Text style={s.tileNote}>{note}</Text> : null}
    </View>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <View style={s.bullet} wrap={false}>
      <Text style={s.bulletDot}>–</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  )
}

function growthDefensive(weights: Record<string, number>) {
  let g = 0
  let d = 0
  for (const [k, v] of Object.entries(weights)) {
    const type = ASSET_CLASSES.find((a) => a.name === k)?.type
    if (type === 'Growth') g += v
    else if (type === 'Defensive') d += v
  }
  const t = g + d || 1
  return { growth: (g / t) * 100, defensive: (d / t) * 100 }
}

const GOAL_LABEL: Record<NonNullable<ClientObjectives['primaryGoal']>, string> = {
  growth: 'Long-term growth',
  balanced: 'Growth and income',
  income: 'Reliable income',
  preservation: 'Capital preservation',
}

export function ClientProposalDocument({
  advice,
  adviserNotes,
  objectives,
  preparedOn,
  capitalGains,
  commentary = {},
  research = {},
  incomeCalendar = null,
}: {
  advice: ClientAdvice
  adviserNotes: string
  objectives?: ClientObjectives | null
  preparedOn: string
  capitalGains?: { result: CgtResult; reference: TaxReference } | null
  /** Adviser-approved commentary keyed "CODE:buy" / "CODE:sell" / "CODE:exposure". */
  commentary?: Record<string, string>
  /** Ord Minnett research view per holding code: rating, price target, upside to target. */
  research?: Record<string, { rating: string; lean: 'bullish' | 'neutral' | 'bearish'; priceTarget: number | null; upside: number | null }>
  /** Month-by-month income on the recommended portfolio (lib/engines/income-calendar.ts). */
  incomeCalendar?: IncomeCalendar | null
}) {
  const note = (code: string, kind: 'buy' | 'sell' | 'exposure') => commentary[`${code.trim().toUpperCase()}:${kind}`] ?? null
  const client = advice.clientName
  const buys = advice.trades.filter((t) => t.action === 'buy' || t.action === 'increase')
  const sells = advice.trades.filter((t) => t.action === 'sell' || t.action === 'reduce')
  const buyTotal = buys.reduce((sum, t) => sum + Math.abs(t.value ?? 0), 0)
  const sellTotal = sells.reduce((sum, t) => sum + Math.abs(t.value ?? 0), 0)
  const stagedCount = sells.filter((t) => t.treatment === 'staged_exit').length

  const after = afterAdviceWeights(advice)
  const current = currentWeights(advice)
  const hasCurrent = !advice.isNewMoney && Object.keys(current).length > 0
  const gdAfter = growthDefensive(after)
  const gdNow = growthDefensive(current)
  // Franking is worked out from each portfolio's own holdings (yield x franked % x 30/70).
  const riskAfter = portfolioRiskStats(after, advice.frankingBenefitByClass?.projected)
  const riskNow = hasCurrent ? portfolioRiskStats(current, advice.frankingBenefitByClass?.current) : null
  const fees = estimateFees(advice)
  // Investment rationale page: the briefs the adviser ticked, grouped.
  const tradedCodes = new Set(advice.trades.map((t) => t.code.trim().toUpperCase()))
  const TRADE_TAG = { buy: 'NEW PURCHASE', increase: 'TOP-UP', sell: 'FULL SALE', reduce: 'PARTIAL SALE' } as const
  const rationale = [
    {
      title: 'Purchases',
      items: buys
        .map((t) => ({ code: t.code, name: t.name, tag: TRADE_TAG[t.action] as string, text: note(t.code, 'buy') }))
        .filter((i): i is typeof i & { text: string } => !!i.text),
    },
    {
      title: 'Sales',
      items: sells
        .map((t) => ({ code: t.code, name: t.name, tag: TRADE_TAG[t.action] as string, text: note(t.code, 'sell') }))
        .filter((i): i is typeof i & { text: string } => !!i.text),
    },
    {
      title: 'Holdings you keep',
      items: advice.resultingHoldings
        .filter((h) => !tradedCodes.has(h.code.trim().toUpperCase()))
        .map((h) => ({
          code: h.code,
          name: h.name,
          tag: h.holdingType === 'listed_fund' ? 'ETF / LISTED FUND' : h.holdingType === 'unlisted_fund' ? 'UNLISTED FUND' : 'HELD',
          text: note(h.code, 'exposure'),
        }))
        .filter((i): i is typeof i & { text: string } => !!i.text),
    },
  ].filter((g) => g.items.length > 0)
  const scorecard = hasCurrent ? buildScorecard({ advice, gdNow, gdAfter, current, after, riskNow, riskAfter }) : []
  // The three clearest improvements lead the page.
  const highlights = scorecard.filter((r) => r.direction === 'better').slice(0, 3)
  const total = advice.totalAfter
  // Recommended-holdings table: an extra column for the Ord Minnett view when research is available.
  const hasResearch = Object.keys(research).length > 0
  const HW = hasResearch
    ? { code: '12%', sec: '32%', res: '16%', w: '9%', v: '13%', y: '9%', f: '9%', lead: '60%', rest: '18%' }
    : { code: '16%', sec: '40%', res: '0%', w: '11%', v: '14%', y: '10%', f: '9%', lead: '56%', rest: '19%' }
  const guide = PROFILE_GUIDE[advice.riskProfile]

  const classRows = ASSET_CLASSES.map((ac) => ({
    label: ac.name,
    type: ac.type,
    current: current[ac.name] ?? 0,
    target: advice.assetClasses.find((r) => r.assetClass === ac.name)?.modelWeight ?? 0,
    after: after[ac.name] ?? 0,
    colour: colourFor(ac.name),
  })).filter((r) => r.current > 0 || r.after > 0 || r.target > 0)

  // Income
  const yieldPct = advice.projectedYieldPct ?? 0
  const showIncomeToday =
    !advice.isNewMoney && advice.currentIncome !== null && advice.projectedIncome !== null && advice.currentIncomeCoveragePct >= 80
  const incomeChange = showIncomeToday ? (advice.projectedIncome as number) - (advice.currentIncome as number) : null
  const incomeNeed = objectives?.incomeNeed ?? null
  const hasObjectives =
    !!objectives && (!!objectives.primaryGoal || !!objectives.incomeNeed || !!objectives.timeframeYears || !!objectives.constraints?.trim())
  const incomeByClass = ASSET_CLASSES.map((ac) => ({
    label: ac.name,
    colour: colourFor(ac.name),
    value: advice.resultingHoldings
      .filter((h) => h.assetClass === ac.name && typeof h.yield === 'number')
      .reduce((sum, h) => sum + ((h.value ?? (total ? (h.weight / 100) * total : 0)) * (h.yield as number)) / 100, 0),
  })).filter((r) => r.value > 0)

  const scenarios =
    total && riskAfter
      ? projectScenarios({
          startValue: total,
          // Headline return includes franking credits (assumed received and reinvested).
          expectedReturn: riskAfter.expectedReturnInclFranking,
          feePct: fees?.effectiveRatePct ?? 0,
          yieldPct,
        })
      : null
  const base = scenarios?.find((x) => x.key === 'base')
  const low = scenarios?.find((x) => x.key === 'low')
  const high = scenarios?.find((x) => x.key === 'high')

  // Stress test: past market shocks applied to each allocation.
  const stressAfter = runStressTest(after, total)
  const stressNow = hasCurrent ? runStressTest(current, advice.existingValue) : null
  const worst = stressAfter.reduce((a, b) => (b.returnPct < a.returnPct ? b : a), stressAfter[0])
  const stressMax = Math.max(1, ...stressAfter.map((r) => Math.abs(r.returnPct)), ...(stressNow ?? []).map((r) => Math.abs(r.returnPct)))

  // Exclusions: only stated in the proposal once a check has passed on these exact holdings.
  const exclusions = exclusionStatus(objectives?.constraints, objectives?.exclusionCheck, advice.resultingHoldings.map((h) => h.code))

  // Net flow per asset class
  const flows = ASSET_CLASSES.map((ac) => ({
    label: ac.name,
    value: advice.trades.filter((t) => t.assetClass === ac.name).reduce((sum, t) => sum + (t.value ?? 0), 0),
  })).filter((r) => Math.abs(r.value) >= 1)

  // Key changes, in plain English
  const keyChanges: string[] = []
  if (hasCurrent) {
    keyChanges.push(
      `Your growth / defensive mix moves from ${Math.round(gdNow.growth)}/${Math.round(gdNow.defensive)} to ${Math.round(gdAfter.growth)}/${Math.round(gdAfter.defensive)}, in line with a ${advice.riskProfile} investor.`,
    )
    const moves = classRows
      .map((r) => ({ label: r.label, from: r.current, to: r.after, d: r.after - r.current }))
      .filter((m) => Math.abs(m.d) >= 2)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      .slice(0, 2)
    for (const m of moves)
      keyChanges.push(`${m.label} ${m.d > 0 ? 'rises' : 'falls'} from ${pct(m.from, m.from % 1 ? 1 : 0)} to ${pct(m.to, m.to % 1 ? 1 : 0)} of the portfolio.`)
  }
  if (advice.trades.length > 0) {
    keyChanges.push(
      `${buys.length} purchase${buys.length === 1 ? '' : 's'}${buyTotal ? ` totalling ${fmt(buyTotal)}` : ''}${sells.length ? ` and ${sells.length} sale${sells.length === 1 ? '' : 's'}${sellTotal ? ` totalling ${fmt(sellTotal)}` : ''}` : ''}${stagedCount ? `, ${stagedCount} of them as a staged exit over time` : ''}.`,
    )
  }
  if (advice.retainedHoldings.length > 0)
    keyChanges.push(`${advice.retainedHoldings.length} holding${advice.retainedHoldings.length === 1 ? ' is' : 's are'} retained outside the model for the reasons set out under Recommended changes.`)
  if (advice.projectedIncome !== null)
    keyChanges.push(
      showIncomeToday && incomeChange !== null
        ? `Estimated income ${incomeChange >= 0 ? 'rises' : 'changes'} from ${fmt(advice.currentIncome as number)} to ${fmt(advice.projectedIncome)} a year${advice.projectedFrankingCredits ? `, plus about ${fmt(advice.projectedFrankingCredits)} in franking credits` : ''}.`
        : `Estimated income of ${fmt(advice.projectedIncome)} a year${advice.projectedFrankingCredits ? `, plus about ${fmt(advice.projectedFrankingCredits)} in franking credits` : ''}.`,
    )

  const recommendation = advice.isNewMoney
    ? `We recommend investing ${fmt(advice.newCash)} in a ${advice.riskProfile} portfolio built from the Ord Minnett house model: a diversified mix of quality Australian and international investments, matched to your objectives and your tolerance for risk.`
    : advice.approach === 'new-cash'
      ? `We recommend investing the new ${fmt(advice.newCash)} into the asset classes furthest below their targets, using the securities in our house model. No existing holdings are sold, so no capital gains are realised and turnover is kept to a minimum.`
      : `We recommend repositioning your portfolio to the Ord Minnett ${advice.riskProfile} house model${advice.newCash > 0 ? `, including the new ${fmt(advice.newCash)}` : ''}. The changes align your investments with your risk profile, concentrate capital in our highest-conviction holdings and improve the reliability of your income.`

  let n = 0
  const next = () => ++n

  return (
    <Document title={`Investment Proposal - ${client}`} author="Ord Minnett" subject={`${advice.riskProfile} portfolio proposal`}>
      {/* ---------- Cover ---------- */}
      <Page size="A4" style={s.cover}>
        <View style={{ paddingTop: 70, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Times-Bold', fontSize: 22, letterSpacing: 6, color: OM.white }}>ORD MINNETT</Text>
          <View style={{ width: 40, height: 1.5, backgroundColor: OM.red, marginTop: 10 }} />
        </View>
        <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60 }}>
          <Text style={{ fontSize: 8.5, letterSpacing: 3, color: OM.paleSilver, marginBottom: 18 }}>PRIVATE WEALTH</Text>
          <Text style={{ fontFamily: 'Times-Italic', fontSize: 30, color: OM.white }}>Your Investment</Text>
          <Text style={{ fontFamily: 'Times-Bold', fontSize: 34, color: OM.white, marginTop: 2 }}>Proposal</Text>
          <View style={{ width: 70, height: 2, backgroundColor: OM.red, marginTop: 14, marginBottom: 22 }} />
          <Text style={{ fontSize: 12, color: OM.white, marginBottom: 6 }}>Prepared for {client}</Text>
          <Text style={{ fontSize: 10, color: OM.paleSilver, marginBottom: 4 }}>{advice.riskProfile} portfolio</Text>
          <Text style={{ fontSize: 10, color: OM.paleSilver }}>{preparedOn}</Text>
          <Text style={{ fontSize: 7, letterSpacing: 2, color: OM.paleSilver, marginTop: 26 }}>YOUR ADVISERS</Text>
          <Text style={{ fontSize: 10, color: OM.white, marginTop: 5 }}>{ADVICE_TEAM.map((m) => m.name).join('  ·  ')}</Text>
        </View>
        <Weave width={595} height={170} />
        <View style={{ position: 'absolute', bottom: 18, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ fontSize: 6.5, color: OM.paleSilver }}>{ABN_LINE} · Private and confidential</Text>
        </View>
      </Page>

      {/* ---------- 1. Executive summary ---------- */}
      <Page size="A4" style={s.page}>
        <Chrome client={client} />
        <SectionTitle n={next()} eyebrow="Executive summary" title="Our recommendation" />
        {hasObjectives && objectives ? (
          <View style={[s.card, { marginBottom: 10 }]} wrap={false}>
            <Text style={[s.h3, { color: OM.red }]}>YOUR OBJECTIVES</Text>
            <View style={s.row}>
              {objectives.primaryGoal ? (
                <View style={[s.col, { marginRight: 10 }]}>
                  <Text style={s.tileLabel}>PRIMARY GOAL</Text>
                  <Text style={[s.p, s.bold, { color: OM.navy, marginBottom: 0 }]}>{GOAL_LABEL[objectives.primaryGoal]}</Text>
                </View>
              ) : null}
              {objectives.incomeNeed ? (
                <View style={[s.col, { marginRight: 10 }]}>
                  <Text style={s.tileLabel}>INCOME REQUIRED</Text>
                  <Text style={[s.p, s.bold, { color: OM.navy, marginBottom: 0 }]}>{fmt(objectives.incomeNeed)} a year</Text>
                </View>
              ) : null}
              {objectives.timeframeYears ? (
                <View style={s.col}>
                  <Text style={s.tileLabel}>TIMEFRAME</Text>
                  <Text style={[s.p, s.bold, { color: OM.navy, marginBottom: 0 }]}>{objectives.timeframeYears} years</Text>
                </View>
              ) : null}
            </View>
            {objectives.constraints?.trim() ? <Text style={[s.small, { marginTop: 6, marginBottom: 0 }]}>{objectives.constraints.trim()}</Text> : null}
            {exclusions.state === 'clear' ? (
              <Text style={[s.small, { marginTop: 4, marginBottom: 0, color: OM.navy }]}>
                Every recommended holding has been checked against your exclusions ({exclusions.check.exclusions.join(', ')}) and none
                conflict.
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text style={s.lead}>{recommendation}</Text>

        <View style={s.tiles}>
          <Tile
            label={advice.isNewMoney ? 'Amount to invest' : 'Portfolio value'}
            value={total ? shortMoney(total) : '—'}
            note={!advice.isNewMoney && advice.newCash > 0 ? `incl. ${shortMoney(advice.newCash)} new cash` : undefined}
          />
          <Tile label="Risk profile" value={advice.riskProfile} note={guide.timeframe} />
          <Tile
            label="Expected return"
            value={riskAfter ? `${pct(riskAfter.expectedReturnInclFranking)} p.a.` : '—'}
            note={
              riskAfter && fees
                ? `incl. franking · ${pct(riskAfter.expectedReturnInclFranking - fees.effectiveRatePct)} after fees`
                : 'long term, before fees, incl. franking (estimate)'
            }
          />
          <Tile
            label="Estimated income"
            value={advice.projectedIncome !== null ? shortMoney(advice.projectedIncome) : '—'}
            note={advice.projectedYieldPct !== null ? `${pct(advice.projectedYieldPct)} yield, first year` : undefined}
            last
          />
        </View>

        <View style={[s.row, { marginTop: 4 }]}>
          <View style={[s.col, { marginRight: 18 }]}>
            <Text style={s.h3}>WHAT CHANGES</Text>
            {keyChanges.length > 0 ? keyChanges.map((k) => <Bullet key={k}>{k}</Bullet>) : <Bullet>Your portfolio is already in line with the model.</Bullet>}
          </View>
          <View style={{ width: 170, alignItems: 'center' }}>
            <Text style={[s.h3, { alignSelf: 'flex-start' }]}>RECOMMENDED ALLOCATION</Text>
            <Donut
              size={120}
              segments={classRows.map((r) => ({ label: r.label, value: r.after, colour: r.colour }))}
              caption={`${Math.round(gdAfter.growth)} / ${Math.round(gdAfter.defensive)}`}
              subCaption="GROWTH / DEFENSIVE"
            />
          </View>
        </View>

        {adviserNotes.trim() ? (
          <View style={s.callout} wrap={false}>
            <Text style={[s.h3, { color: OM.red }]}>A NOTE FROM YOUR ADVISER</Text>
            <Text style={s.p}>{adviserNotes.trim()}</Text>
          </View>
        ) : null}

        {advice.relevantDecisions.filter((d) => d.appliedToModel).length > 0 ? (
          <View wrap={false}>
            <Text style={s.h2}>Investment Committee decisions affecting you</Text>
            {advice.relevantDecisions
              .filter((d) => d.appliedToModel)
              .map((d) => (
                <Bullet key={d.id}>
                  Our Investment Committee has approved replacing {d.currentCode} with {d.proposedCode}
                  {d.proposedName ? ` (${d.proposedName})` : ''}.{d.decisionRationale ? ` ${d.decisionRationale}` : ''}
                </Bullet>
              ))}
          </View>
        ) : null}
      </Page>

      {/* ---------- Before and after ---------- */}
      {scorecard.length > 0 ? (
        <Page size="A4" style={s.page}>
          <Chrome client={client} />
          <SectionTitle n={next()} eyebrow="Before and after" title="How your portfolio changes" />
          <Text style={s.p}>
            The measures that matter most, for your portfolio today and as recommended. Each figure is drawn from the
            same analysis as the rest of this proposal.
          </Text>
          {highlights.length > 0 ? (
            <View style={{ flexDirection: 'row', marginTop: 4, marginBottom: 14 }}>
              {highlights.map((r, i) => (
                <View
                  key={r.label}
                  style={{
                    flex: 1,
                    backgroundColor: OM.navy,
                    padding: 12,
                    marginRight: i < highlights.length - 1 ? 8 : 0,
                  }}
                >
                  <Text style={{ fontSize: 6.5, letterSpacing: 1, color: OM.paleSilver }}>{r.label.toUpperCase()}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: OM.paleSilver, marginRight: 6, marginBottom: 2 }}>{r.today}</Text>
                    <Text style={{ fontSize: 9, color: OM.red, marginRight: 6, marginBottom: 3, fontFamily: 'Helvetica-Bold' }}>to</Text>
                    <Text style={{ fontSize: 20, color: OM.white, fontFamily: 'Times-Bold' }}>{r.recommended}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <View style={s.table}>
            <View style={s.tr}>
              <Text style={[s.th, { width: '40%' }]}>MEASURE</Text>
              <Text style={[s.th, { width: '22%', textAlign: 'right' }]}>TODAY</Text>
              <Text style={[s.th, { width: '24%', textAlign: 'right' }]}>RECOMMENDED</Text>
              <Text style={[s.th, { width: '14%', textAlign: 'right' }]} />
            </View>
            {(['Diversification', 'Shape', 'Income', 'Return and risk'] as const).map((group) => {
              const rows = scorecard.filter((r) => r.group === group)
              if (rows.length === 0) return null
              return (
                <View key={group} wrap={false}>
                  <View style={s.trGroup}>
                    <Text style={[s.td, s.bold, { color: OM.navy }]}>{group}</Text>
                  </View>
                  {rows.map((r) => (
                    <View style={[s.tr, { paddingVertical: 6 }]} key={r.label}>
                      <Text style={[s.td, { width: '40%', fontSize: 8.5 }]}>{r.label}</Text>
                      <View style={{ width: '22%', alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 10, color: OM.slate }}>{r.today}</Text>
                        {r.todayNote ? <Text style={{ fontSize: 6.5, color: OM.silver, marginTop: 1 }}>{r.todayNote}</Text> : null}
                      </View>
                      <View style={{ width: '24%', alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 11, color: OM.navy, fontFamily: 'Helvetica-Bold' }}>{r.recommended}</Text>
                        {r.recommendedNote ? <Text style={{ fontSize: 6.5, color: OM.silver, marginTop: 1 }}>{r.recommendedNote}</Text> : null}
                      </View>
                      <View style={{ width: '14%', alignItems: 'flex-end', justifyContent: 'center' }}>
                        {r.direction === 'better' ? (
                          <Text style={{ fontSize: 6.5, letterSpacing: 0.8, color: OM.white, backgroundColor: OM.navy, paddingVertical: 2, paddingHorizontal: 5 }}>IMPROVES</Text>
                        ) : r.direction === 'worse' ? (
                          <Text style={{ fontSize: 6.5, letterSpacing: 0.8, color: OM.slate, borderWidth: 0.5, borderColor: OM.paleSilver, paddingVertical: 2, paddingHorizontal: 5 }}>TRADE-OFF</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
          <Text style={s.small}>
            Income and franking are first-year estimates from forward yields; expected return and variation are long-term
            estimates based on the capital market assumptions under Important information. &quot;Return for each unit of
            risk&quot; divides expected return by typical yearly variation - higher means the portfolio is working harder
            for the risk it takes.
          </Text>
        </Page>
      ) : null}

      {/* ---------- 2. Investor profile ---------- */}
      <Page size="A4" style={s.page}>
        <Chrome client={client} />
        <SectionTitle n={next()} eyebrow="Your investor profile" title={`What it means to be a ${advice.riskProfile} investor`} />
        <ProfileSpectrum profiles={RISK_PROFILES} active={advice.riskProfile} />
        <Text style={[s.lead, { marginTop: 8 }]}>{guide.investor}</Text>
        <Text style={s.p}>{advice.model.objective} {guide.expect}</Text>
        {advice.riskProfileSource === 'estimated' ? (
          <Text style={s.small}>
            Your risk profile is to be confirmed with your adviser; this proposal is prepared on a {advice.riskProfile} basis.
          </Text>
        ) : null}

        <View style={[s.row, { marginTop: 10 }]}>
          <View style={[s.col, { marginRight: 16 }]}>
            <Text style={s.h3}>GROWTH AND DEFENSIVE ASSETS</Text>
            {hasCurrent ? <GrowthDefensiveBar label="YOUR PORTFOLIO TODAY" growth={gdNow.growth} defensive={gdNow.defensive} /> : null}
            <GrowthDefensiveBar label="RECOMMENDED" growth={gdAfter.growth} defensive={gdAfter.defensive} />
            <Text style={s.small}>
              Growth assets (shares, property, infrastructure, alternatives) drive long-term returns but move more in
              value. Defensive assets (fixed interest and cash) provide stability and income.
            </Text>
          </View>
          <View style={[s.col, s.card]}>
            <Text style={s.h3}>SUGGESTED MINIMUM TIMEFRAME</Text>
            <Text style={{ fontFamily: 'Times-Bold', fontSize: 18, color: OM.navy, marginBottom: 4 }}>{guide.timeframe}</Text>
            <Text style={s.small}>
              Investing for at least this long gives the portfolio time to recover from the negative years that are a
              normal part of investing in growth assets.
            </Text>
          </View>
        </View>

        {riskAfter ? (
          <View wrap={false}>
            <Text style={s.h2}>Risk and return at a glance</Text>
            <View style={s.table}>
              <View style={s.tr}>
                <Text style={[s.th, { width: '46%' }]}>MEASURE (ESTIMATES)</Text>
                {riskNow ? <Text style={[s.th, { width: '27%', textAlign: 'right' }]}>YOUR PORTFOLIO TODAY</Text> : null}
                <Text style={[s.th, { width: riskNow ? '27%' : '54%', textAlign: 'right' }]}>RECOMMENDED</Text>
              </View>
              {[
                { l: 'Expected long-term return (p.a., before fees)', a: riskNow ? pct(riskNow.expectedReturn) : '', b: pct(riskAfter.expectedReturn) },
                { l: 'Plus franking credits (p.a.)', a: riskNow ? pct(riskNow.frankingBenefit) : '', b: pct(riskAfter.frankingBenefit) },
                { l: 'Expected return including franking (p.a., before fees)', a: riskNow ? pct(riskNow.expectedReturnInclFranking) : '', b: pct(riskAfter.expectedReturnInclFranking) },
                { l: 'Volatility (typical yearly variation)', a: riskNow ? pct(riskNow.volatility) : '', b: pct(riskAfter.volatility) },
                { l: 'Typical year: two years in three fall within', a: riskNow ? `${pct(riskNow.typicalLow)} to ${pct(riskNow.typicalHigh)}` : '', b: `${pct(riskAfter.typicalLow)} to ${pct(riskAfter.typicalHigh)}` },
                { l: 'A severe year (1 in 20)', a: riskNow ? pct(riskNow.severeYear) : '', b: pct(riskAfter.severeYear) },
                { l: 'Expected negative years in every 20', a: riskNow ? riskNow.negativeYearsPer20.toFixed(1) : '', b: riskAfter.negativeYearsPer20.toFixed(1) },
                { l: 'Standard Risk Measure', a: riskNow ? `${riskNow.srm.band} · ${riskNow.srm.label}` : '', b: `${riskAfter.srm.band} · ${riskAfter.srm.label}` },
              ].map((r) => (
                <View style={s.tr} key={r.l}>
                  <Text style={[s.td, { width: '46%' }]}>{r.l}</Text>
                  {riskNow ? <Text style={[s.td, { width: '27%', textAlign: 'right' }, s.muted]}>{r.a}</Text> : null}
                  <Text style={[s.td, s.bold, { width: riskNow ? '27%' : '54%', textAlign: 'right', color: OM.navy }]}>{r.b}</Text>
                </View>
              ))}
            </View>
            {total ? (
              <View style={s.callout}>
                <Text style={s.p}>
                  In dollar terms, on a portfolio of {fmt(total)}: in a typical year the value could move between about{' '}
                  <Text style={s.bold}>{fmt((total * riskAfter.typicalLow) / 100)}</Text> and{' '}
                  <Text style={s.bold}>{fmt((total * riskAfter.typicalHigh) / 100)}</Text>. In a severe year, roughly one
                  year in twenty, it could fall by around <Text style={s.bold}>{fmt(Math.abs((total * riskAfter.severeYear) / 100))}</Text>{' '}
                  or more. Staying invested through these periods is central to achieving the long-term return.
                </Text>
              </View>
            ) : null}
            <Text style={s.small}>
              The Standard Risk Measure is the industry-standard guide to the expected number of negative annual
              returns over any 20-year period (1 = very low, 7 = very high). It does not show how large a negative
              return could be. All figures are estimates based on the assumptions under Important information.
            </Text>
          </View>
        ) : null}
      </Page>

      {/* ---------- 3. Portfolio today vs recommended ---------- */}
      <Page size="A4" style={s.page}>
        <Chrome client={client} />
        <SectionTitle
          n={next()}
          eyebrow="Asset allocation"
          title={hasCurrent ? 'Your portfolio today and as recommended' : 'Your recommended portfolio'}
        />
        <Text style={s.p}>
          Asset allocation, how your wealth is spread across types of investment, is the single biggest driver of
          how a portfolio behaves. The recommended allocation follows the Ord Minnett {advice.riskProfile} house model
          {advice.hasBespokeWeights ? ', tailored to your circumstances' : ''}.
        </Text>

        <View style={[s.row, { marginTop: 6, marginBottom: 10, justifyContent: 'space-around' }]}>
          {hasCurrent ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={[s.h3, { marginBottom: 8 }]}>TODAY</Text>
              <Donut
                size={140}
                segments={classRows.map((r) => ({ label: r.label, value: r.current, colour: r.colour }))}
                caption={`${Math.round(gdNow.growth)} / ${Math.round(gdNow.defensive)}`}
                subCaption="GROWTH / DEFENSIVE"
              />
            </View>
          ) : null}
          <View style={{ alignItems: 'center' }}>
            <Text style={[s.h3, { marginBottom: 8 }]}>RECOMMENDED</Text>
            <Donut
              size={140}
              segments={classRows.map((r) => ({ label: r.label, value: r.after, colour: r.colour }))}
              caption={`${Math.round(gdAfter.growth)} / ${Math.round(gdAfter.defensive)}`}
              subCaption="GROWTH / DEFENSIVE"
            />
          </View>
          <View style={{ width: 150, justifyContent: 'center' }}>
            {classRows.map((r) => (
              <LegendRow key={r.label} colour={r.colour} label={r.label} />
            ))}
          </View>
        </View>

        <Text style={s.h2}>By asset class</Text>
        <PairedBars rows={classRows.map((r) => ({ label: r.label, current: r.current, after: r.after, colour: r.colour }))} showCurrent={hasCurrent} />
        {hasCurrent ? <Text style={s.small}>Outlined bars show today&apos;s weights; solid bars the recommended weights.</Text> : null}

        <View style={[s.table, { marginTop: 10 }]}>
          <View style={s.tr}>
            <Text style={[s.th, { width: '36%' }]}>ASSET CLASS</Text>
            <Text style={[s.th, { width: '12%' }]}>TYPE</Text>
            {hasCurrent ? <Text style={[s.th, { width: '12%', textAlign: 'right' }]}>TODAY</Text> : null}
            <Text style={[s.th, { width: '12%', textAlign: 'right' }]}>MODEL</Text>
            <Text style={[s.th, { width: '16%', textAlign: 'right' }]}>RECOMMENDED</Text>
            {total ? <Text style={[s.th, { width: hasCurrent ? '12%' : '24%', textAlign: 'right' }]}>VALUE</Text> : null}
          </View>
          {classRows.map((r) => (
            <View style={s.tr} key={r.label}>
              <View style={{ width: '36%', flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 6, height: 6, backgroundColor: r.colour, marginRight: 5 }} />
                <Text style={s.td}>{r.label}</Text>
              </View>
              <Text style={[s.td, s.muted, { width: '12%' }]}>{r.type}</Text>
              {hasCurrent ? <Text style={[s.td, s.muted, { width: '12%', textAlign: 'right' }]}>{pct(r.current)}</Text> : null}
              <Text style={[s.td, s.muted, { width: '12%', textAlign: 'right' }]}>{pct(r.target)}</Text>
              <Text style={[s.td, s.bold, { width: '16%', textAlign: 'right', color: OM.navy }]}>{pct(r.after)}</Text>
              {total ? <Text style={[s.td, { width: hasCurrent ? '12%' : '24%', textAlign: 'right' }]}>{fmt((r.after / 100) * total)}</Text> : null}
            </View>
          ))}
        </View>
        {hasCurrent && advice.unclassifiedWeightPct > 0 ? (
          <Text style={s.small}>
            {pct(advice.unclassifiedWeightPct)} of your current portfolio is still being assessed and is not shown above.
          </Text>
        ) : null}
      </Page>

      {/* ---------- 4. Recommended changes ---------- */}
      <Page size="A4" style={s.page}>
        <Chrome client={client} />
        <SectionTitle n={next()} eyebrow="Recommended changes" title="The transactions we recommend" />
        {advice.trades.length === 0 ? (
          <Text style={s.lead}>Your portfolio is in line with the model. No transactions are recommended at this time.</Text>
        ) : (
          <>
            <View style={s.tiles}>
              <Tile label="Purchases" value={buyTotal ? shortMoney(buyTotal) : String(buys.length)} note={`${buys.length} transaction${buys.length === 1 ? '' : 's'}`} />
              <Tile label="Sales" value={sellTotal ? shortMoney(sellTotal) : String(sells.length)} note={`${sells.length} transaction${sells.length === 1 ? '' : 's'}${stagedCount ? `, ${stagedCount} staged` : ''}`} />
              <Tile label="Holdings after" value={String(advice.resultingHoldings.length || '—')} note="securities in the portfolio" last />
            </View>
            {flows.length > 0 && flows.some((f) => f.value !== 0) ? (
              <View wrap={false} style={{ marginBottom: 6 }}>
                <Text style={s.h3}>NET CHANGE BY ASSET CLASS</Text>
                <NetFlowBars rows={flows} />
              </View>
            ) : null}
          </>
        )}

        {[
          { title: 'Purchases', rows: buys, total: buyTotal },
          { title: 'Sales', rows: sells, total: sellTotal },
        ]
          .filter((g) => g.rows.length > 0)
          .map((group) => (
            <View key={group.title}>
              <Text style={s.h2} minPresenceAhead={60}>
                {group.title}
                {group.total ? `  ·  ${fmt(group.total)}` : ''}
              </Text>
              <View style={s.table}>
                <View style={s.tr} fixed>
                  <Text style={[s.th, { width: '15%' }]}>CODE</Text>
                  <Text style={[s.th, { width: '37%' }]}>SECURITY</Text>
                  <Text style={[s.th, { width: '22%' }]}>ASSET CLASS</Text>
                  <Text style={[s.th, { width: '14%', textAlign: 'right' }]}>VALUE</Text>
                  <Text style={[s.th, { width: '12%', textAlign: 'right' }]}>UNITS</Text>
                </View>
                {group.rows.map((t) => {
                  return (
                  <View key={`${t.code}-${t.action}`} wrap={false}>
                  <View style={s.tr}>
                    <Text style={[s.code, { width: '15%' }]}>{t.code}</Text>
                    <View style={{ width: '37%' }}>
                      <Text style={s.td}>{t.name}</Text>
                      {t.treatment === 'staged_exit' ? <Text style={{ fontSize: 6.5, color: OM.red, marginTop: 1 }}>STAGED EXIT</Text> : null}
                      {t.action === 'increase' || t.action === 'reduce' ? (
                        <Text style={{ fontSize: 6.5, color: OM.slate, marginTop: 1 }}>
                          {t.action === 'increase' ? 'Add to existing holding' : 'Partial sale'} · {pct(t.currentWeight)} to {pct(t.targetWeight)}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[s.td, s.muted, { width: '22%' }]}>{t.assetClass}</Text>
                    <Text style={[s.td, { width: '14%', textAlign: 'right' }]}>{t.value !== null ? fmt(Math.abs(t.value)) : '—'}</Text>
                    <Text style={[s.td, { width: '12%', textAlign: 'right' }]}>
                      {t.units !== null ? Math.abs(t.units).toLocaleString('en-AU') : 'by value'}
                    </Text>
                  </View>
                  </View>
                  )
                })}
              </View>
            </View>
          ))}

        {stagedCount > 0 ? (
          <Text style={s.small}>
            Sales marked as a staged exit are recommended to be completed over time rather than in a single trade, for
            example around an unlisted fund&apos;s redemption windows or at or near a bond&apos;s maturity or call date, to
            manage liquidity and transaction costs.
          </Text>
        ) : null}

        {advice.retainedHoldings.length > 0 ? (
          // Heading, intro and table stay together so the heading is never stranded at a page foot.
          <View wrap={advice.retainedHoldings.length > 10}>
            <Text style={s.h2} minPresenceAhead={160}>Holdings retained outside the model</Text>
            <Text style={s.p}>These investments sit outside the house model and are recommended to be retained for the reasons noted.</Text>
            <View style={s.table}>
              <View style={s.tr}>
                <Text style={[s.th, { width: '15%' }]}>CODE</Text>
                <Text style={[s.th, { width: '30%' }]}>SECURITY</Text>
                <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>VALUE</Text>
                <Text style={[s.th, { width: '40%', paddingLeft: 10 }]}>REASON</Text>
              </View>
              {advice.retainedHoldings.map((h) => (
                <View style={s.tr} key={h.code} wrap={false}>
                  <Text style={[s.code, { width: '15%' }]}>{h.code}</Text>
                  <Text style={[s.td, { width: '30%' }]}>{h.name}</Text>
                  <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>
                    {h.currentValue !== null ? fmt(h.currentValue) : pct(h.currentWeight)}
                  </Text>
                  <Text style={[s.td, s.muted, { width: '40%', paddingLeft: 10 }]}>{h.reason ?? '—'}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={[s.small, { marginTop: 8 }]}>
          Values use market prices at the time of preparation and will move before transactions are placed.{' '}
          {advice.unitRounding
            ? `Unit quantities are rounded to the nearest ${advice.unitRounding} where practical, with the small difference held in cash; full sales are of the whole holding.`
            : 'Unit quantities are rounded to whole units.'}{' '}
          Investments without a listed price are transacted by value.
        </Text>
      </Page>

      {/* ---------- Investment rationale (the adviser's ticked briefs) ---------- */}
      {rationale.length > 0 ? (
        <Page size="A4" style={s.page}>
          <Chrome client={client} />
          <SectionTitle n={next()} eyebrow="Investment rationale" title="Why we recommend these changes" />
          <Text style={s.p}>
            The reasoning behind the key changes to your portfolio, and the role of the investments you continue to hold.
          </Text>
          {rationale.map((group) => (
            <View key={group.title}>
              <Text style={s.h2} minPresenceAhead={70}>{group.title}</Text>
              {group.items.map((it) => (
                <View
                  key={`${it.code}-${it.tag}`}
                  wrap={false}
                  style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: OM.grid }}
                >
                  <View style={{ width: '22%', paddingRight: 8 }}>
                    <Text style={[s.code, { fontSize: 9.5 }]}>{it.code}</Text>
                    <Text style={{ fontSize: 6.5, letterSpacing: 0.8, color: it.tag.includes('SALE') ? OM.red : OM.slate, marginTop: 3 }}>{it.tag}</Text>
                  </View>
                  <View style={{ width: '78%' }}>
                    <Text style={[s.td, s.bold, { fontSize: 9, color: OM.navy, marginBottom: 3 }]}>{it.name}</Text>
                    <Text style={[s.p, { marginBottom: 0 }]}>{it.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </Page>
      ) : null}

      {/* ---------- 5. Recommended portfolio holdings ---------- */}
      {advice.resultingHoldings.length > 0 ? (
        <Page size="A4" style={s.page}>
          <Chrome client={client} />
          <SectionTitle n={next()} eyebrow="Your recommended portfolio" title="The portfolio once implemented" />
          <Text style={s.p}>
            Each holding is selected through our research process, which draws on Ord Minnett and Barrenjoey research
            and is overseen by our Investment Committee. Income estimates use forward-looking yields where available.
          </Text>
          <View style={s.table}>
            <View style={s.tr} fixed>
              <Text style={[s.th, { width: HW.code }]}>CODE</Text>
              <Text style={[s.th, { width: HW.sec }]}>SECURITY</Text>
              {hasResearch ? <Text style={[s.th, { width: HW.res }]}>ORD MINNETT VIEW</Text> : null}
              <Text style={[s.th, { width: HW.w, textAlign: 'right' }]}>WEIGHT</Text>
              <Text style={[s.th, { width: HW.v, textAlign: 'right' }]}>VALUE</Text>
              <Text style={[s.th, { width: HW.y, textAlign: 'right' }]}>YIELD</Text>
              <Text style={[s.th, { width: HW.f, textAlign: 'right' }]}>FRANKED</Text>
            </View>
            {ASSET_CLASSES.map((ac) => {
              const rows = advice.resultingHoldings.filter((h) => h.assetClass === ac.name)
              if (rows.length === 0) return null
              const w = rows.reduce((sum, h) => sum + h.weight, 0)
              const v = rows.reduce((sum, h) => sum + (h.value ?? 0), 0)
              return (
                <View key={ac.name}>
                  <View style={s.trGroup} wrap={false} minPresenceAhead={20}>
                    <View style={{ width: HW.lead, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 6, height: 6, backgroundColor: colourFor(ac.name), marginRight: 5 }} />
                      <Text style={[s.td, s.bold, { color: OM.navy }]}>{ac.name}</Text>
                    </View>
                    <Text style={[s.td, s.bold, { width: HW.w, textAlign: 'right', color: OM.navy }]}>{pct(w)}</Text>
                    <Text style={[s.td, s.bold, { width: HW.v, textAlign: 'right', color: OM.navy }]}>{v ? fmt(v) : ''}</Text>
                    <Text style={{ width: HW.rest }} />
                  </View>
                  {rows.map((h) => {
                    const r = research[h.code.trim().toUpperCase()]
                    return (
                    <View style={s.tr} key={h.code} wrap={false}>
                      <Text style={[s.code, { width: HW.code }]}>{h.code}</Text>
                      <Text style={[s.td, { width: HW.sec }]}>
                        {h.name}
                        {!h.inModel ? <Text style={{ color: OM.slate }}> (retained)</Text> : null}
                      </Text>
                      {hasResearch ? (
                        <View style={{ width: HW.res }}>
                          {r ? (
                            <>
                              <Text style={[s.td, s.bold, { color: r.lean === 'bearish' ? OM.red : OM.navy }]}>{r.rating}</Text>
                              {r.priceTarget !== null ? (
                                <Text style={{ fontSize: 6.5, color: OM.slate, marginTop: 1 }}>
                                  Target ${r.priceTarget.toFixed(2)}
                                  {r.upside !== null ? ` · ${r.upside >= 0 ? '+' : ''}${Math.round(r.upside * 100)}%` : ''}
                                </Text>
                              ) : null}
                            </>
                          ) : (
                            <Text style={[s.td, s.muted]}>—</Text>
                          )}
                        </View>
                      ) : null}
                      <Text style={[s.td, { width: HW.w, textAlign: 'right' }]}>{pct(h.weight)}</Text>
                      <Text style={[s.td, { width: HW.v, textAlign: 'right' }]}>{h.value !== null ? fmt(h.value) : '—'}</Text>
                      <Text style={[s.td, { width: HW.y, textAlign: 'right' }]}>{h.yield !== null ? pct(h.yield) : '—'}</Text>
                      <Text style={[s.td, s.muted, { width: HW.f, textAlign: 'right' }]}>{h.frankingPct !== null ? `${Math.round(h.frankingPct)}%` : '—'}</Text>
                    </View>
                    )
                  })}
                </View>
              )
            })}
            <View style={s.trTotal} wrap={false}>
              <Text style={[s.td, s.bold, { width: HW.lead }]}>Total</Text>
              <Text style={[s.td, s.bold, { width: HW.w, textAlign: 'right' }]}>
                {pct(advice.resultingHoldings.reduce((sum, h) => sum + h.weight, 0))}
              </Text>
              <Text style={[s.td, s.bold, { width: HW.v, textAlign: 'right' }]}>
                {total ? fmt(advice.resultingHoldings.reduce((sum, h) => sum + (h.value ?? 0), 0)) : ''}
              </Text>
              <Text style={[s.td, s.bold, { width: HW.y, textAlign: 'right' }]}>{advice.projectedYieldPct !== null ? pct(advice.projectedYieldPct) : ''}</Text>
              <Text style={{ width: HW.f }} />
            </View>
          </View>
          {advice.cashDeployment && advice.cashDeployment.residualCash > 1 ? (
            <Text style={s.small}>
              About {fmt(advice.cashDeployment.residualCash)} remains in cash after rounding to whole units.
            </Text>
          ) : null}
          {hasResearch ? (
            <Text style={s.small}>
              Ord Minnett view: the research rating and 12-month price target published by Ord Minnett Research at the date
              of this proposal, with the potential move to target from the current price. Price targets are estimates, not
              forecasts or guarantees.
            </Text>
          ) : null}
        </Page>
      ) : null}

      {/* ---------- 6. Income ---------- */}
      {advice.projectedIncome !== null ? (
        <Page size="A4" style={s.page}>
          <Chrome client={client} />
          <SectionTitle n={next()} eyebrow="Income" title="The income your portfolio is expected to generate" />
          <View style={s.tiles}>
            <Tile label="Annual income" value={fmt(advice.projectedIncome)} note="estimated, first year" />
            <Tile label="Running yield" value={advice.projectedYieldPct !== null ? pct(advice.projectedYieldPct) : '—'} />
            <Tile
              label="Franking credits"
              value={advice.projectedFrankingCredits ? fmt(advice.projectedFrankingCredits) : '—'}
              note="estimated, per year"
            />
            <Tile
              label="Grossed-up yield"
              value={advice.projectedGrossedUpYieldPct !== null ? pct(advice.projectedGrossedUpYieldPct) : '—'}
              note="including franking"
              last
            />
          </View>

          {showIncomeToday && incomeChange !== null ? (
            <View style={[s.callout, { flexDirection: 'row', alignItems: 'center' }]} wrap={false}>
              <View style={{ flexGrow: 1, flexBasis: 0 }}>
                <Text style={s.tileLabel}>YOUR INCOME TODAY</Text>
                <Text style={s.tileValue}>{fmt(advice.currentIncome as number)}</Text>
              </View>
              <View style={{ flexGrow: 1, flexBasis: 0 }}>
                <Text style={s.tileLabel}>RECOMMENDED</Text>
                <Text style={s.tileValue}>{fmt(advice.projectedIncome as number)}</Text>
              </View>
              <View style={{ flexGrow: 1, flexBasis: 0 }}>
                <Text style={s.tileLabel}>CHANGE PER YEAR</Text>
                <Text style={[s.tileValue, { color: incomeChange >= 0 ? OM.navy : OM.red }]}>
                  {incomeChange >= 0 ? '+' : '-'}
                  {fmt(Math.abs(incomeChange))}
                </Text>
              </View>
            </View>
          ) : null}

          {incomeNeed ? (
            <Text style={[s.p, { marginBottom: 10 }]}>
              {(advice.projectedIncome as number) >= incomeNeed ? (
                <>
                  The estimated income of <Text style={s.bold}>{fmt(advice.projectedIncome as number)}</Text> covers your
                  stated requirement of {fmt(incomeNeed)} a year
                  {advice.projectedFrankingCredits ? ', before counting franking credits' : ''}.
                </>
              ) : (
                <>
                  The estimated income of <Text style={s.bold}>{fmt(advice.projectedIncome as number)}</Text> is below your
                  stated requirement of {fmt(incomeNeed)} a year. The difference of{' '}
                  {fmt(incomeNeed - (advice.projectedIncome as number))} would be met from capital or cash reserves, which
                  we will monitor at each review.
                </>
              )}
            </Text>
          ) : null}

          {incomeByClass.length > 0 ? (
            <View wrap={false}>
              <Text style={s.h3}>WHERE THE INCOME COMES FROM</Text>
              <HBars rows={incomeByClass} format={(v) => fmt(v)} />
            </View>
          ) : null}

          {incomeCalendar && incomeCalendar.totalIncome > 0 ? (
            <View wrap={false} style={{ marginTop: 6 }}>
              <Text style={s.h3}>WHEN YOUR INCOME IS PAID</Text>
              <BarChart
                width={495}
                height={120}
                yFormat={shortMoney}
                bars={incomeCalendar.months.map((m) => ({ label: m.label, value: m.total }))}
              />
              <Text style={s.small}>
                Estimated income by month across a financial year, from each holding&apos;s recent payment history
                {incomeCalendar.knownTimingPct < 100
                  ? `; timing for ${100 - incomeCalendar.knownTimingPct}% of the income (holdings without a payment history, such as unlisted funds and bonds) is assumed to be quarterly`
                  : ''}
                . Actual payment dates and amounts are set by each company or fund.
              </Text>
            </View>
          ) : null}

          {scenarios && base && low && high ? (
            <View wrap={false}>
              <Text style={s.h2}>Income over the next 10 years</Text>
              <Text style={s.p}>
                Because income is paid on the value of your investments, it is expected to grow as the portfolio grows.
                The bars show the expected annual income; the red lines show the range between a lower-return and a
                higher-return scenario.
              </Text>
              <BarChart
                width={495}
                height={150}
                yFormat={shortMoney}
                bars={base.income.map((v, i) => ({ label: `Yr ${i + 1}`, value: v, low: low.income[i], high: high.income[i] }))}
              />
              <View style={[s.table, { marginTop: 10 }]}>
                <View style={s.tr}>
                  <Text style={[s.th, { width: '28%' }]}>SCENARIO</Text>
                  <Text style={[s.th, { width: '18%', textAlign: 'right' }]}>YEAR 1</Text>
                  <Text style={[s.th, { width: '18%', textAlign: 'right' }]}>YEAR 5</Text>
                  <Text style={[s.th, { width: '18%', textAlign: 'right' }]}>YEAR 10</Text>
                  <Text style={[s.th, { width: '18%', textAlign: 'right' }]}>10-YEAR TOTAL</Text>
                </View>
                {[low, base, high].map((sc) => (
                  <View style={s.tr} key={sc.key}>
                    <Text style={[s.td, sc.key === 'base' ? s.bold : {}, { width: '28%' }]}>{sc.label}</Text>
                    <Text style={[s.td, { width: '18%', textAlign: 'right' }]}>{fmt(sc.income[0])}</Text>
                    <Text style={[s.td, { width: '18%', textAlign: 'right' }]}>{fmt(sc.income[4])}</Text>
                    <Text style={[s.td, { width: '18%', textAlign: 'right' }]}>{fmt(sc.income[9])}</Text>
                    <Text style={[s.td, s.bold, { width: '18%', textAlign: 'right' }]}>{fmt(sc.income.reduce((a, b) => a + b, 0))}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <Text style={s.small}>
            Income estimates use forward yield estimates for {advice.yieldCoveragePct}% of the portfolio by value and
            are not guaranteed; distributions can be reduced or suspended. Franking credits are estimated at the 30%
            company tax rate; their value to you depends on your tax position. Scenarios assume income is reinvested
            and no withdrawals.
          </Text>
        </Page>
      ) : null}

      {/* ---------- 7. Long-term projections ---------- */}
      {scenarios && base && low && high && total ? (
        <Page size="A4" style={s.page}>
          <Chrome client={client} />
          <SectionTitle n={next()} eyebrow="Looking ahead" title="How your portfolio could grow" />
          <Text style={s.p}>
            The chart shows how the portfolio could grow over ten years in three scenarios, after the ongoing advisory
            fee, with income reinvested and no withdrawals. Real outcomes will not follow a smooth line: some years will
            be negative, as set out in your investor profile.
          </Text>
          <LineChart
            width={495}
            height={190}
            xLabels={base.values.map((_, i) => (i === 0 ? 'Today' : i % 2 === 0 ? `Yr ${i}` : ''))}
            series={[
              { label: high.label, values: high.values, colour: OM.dusty },
              { label: base.label, values: base.values, colour: OM.navy, width: 2.4 },
              { label: low.label, values: low.values, colour: OM.silver },
            ]}
            baseline={{ value: total, label: `Starting value ${shortMoney(total)}` }}
          />
          <View style={[s.row, { marginTop: 6, marginBottom: 8 }]}>
            {[high, base, low].map((sc) => (
              <View style={{ marginRight: 14 }} key={sc.key}>
                <LegendRow
                  colour={sc.key === 'high' ? OM.dusty : sc.key === 'base' ? OM.navy : OM.silver}
                  label={`${sc.label}: ${pct(sc.returnPct + (fees?.effectiveRatePct ?? 0))} before fees, ${pct(sc.returnPct)} after`}
                />
              </View>
            ))}
          </View>
          <View style={s.table}>
            <View style={s.tr}>
              <Text style={[s.th, { width: '28%' }]}>SCENARIO (AFTER FEES)</Text>
              <Text style={[s.th, { width: '18%', textAlign: 'right' }]}>YEAR 3</Text>
              <Text style={[s.th, { width: '18%', textAlign: 'right' }]}>YEAR 5</Text>
              <Text style={[s.th, { width: '18%', textAlign: 'right' }]}>YEAR 10</Text>
              <Text style={[s.th, { width: '18%', textAlign: 'right' }]}>IN TODAY&apos;S DOLLARS</Text>
            </View>
            {[low, base, high].map((sc) => (
              <View style={s.tr} key={sc.key}>
                <Text style={[s.td, sc.key === 'base' ? s.bold : {}, { width: '28%' }]}>{sc.label}</Text>
                <Text style={[s.td, { width: '18%', textAlign: 'right' }]}>{fmt(sc.values[3])}</Text>
                <Text style={[s.td, { width: '18%', textAlign: 'right' }]}>{fmt(sc.values[5])}</Text>
                <Text style={[s.td, s.bold, { width: '18%', textAlign: 'right' }]}>{fmt(sc.values[10])}</Text>
                <Text style={[s.td, s.muted, { width: '18%', textAlign: 'right' }]}>{fmt(sc.values[10] / Math.pow(1 + CPI_ASSUMPTION / 100, 10))}</Text>
              </View>
            ))}
          </View>
          <Text style={s.small}>
            Scenario returns are the expected long-term return for this allocation including franking credits (assumed
            to be received in full and reinvested), less the estimated advisory fee, plus or minus two percentage
            points a year. &ldquo;In today&apos;s dollars&rdquo; adjusts the year-10 value for
            inflation of {CPI_ASSUMPTION}% a year. Projections are illustrations, not forecasts or guarantees, and do not
            allow for tax, transaction costs or changes to the portfolio.
          </Text>
        </Page>
      ) : null}

      {/* ---------- Stress test ---------- */}
      {stressAfter.some((r) => r.returnPct !== 0) ? (
        <Page size="A4" style={s.page}>
          <Chrome client={client} />
          <SectionTitle n={next()} eyebrow="Stress test" title="How your portfolio might hold up in a downturn" />
          <Text style={s.p}>
            Markets do not rise in a straight line. To show what a severe setback could look like, we have applied three
            real market events to {hasCurrent ? 'your current portfolio and to the recommended portfolio' : 'the recommended portfolio'}, using
            how each asset class performed at the time.
          </Text>
          {hasCurrent ? (
            <View style={[s.row, { marginBottom: 8 }]}>
              <View style={{ marginRight: 14, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 12, height: 6, backgroundColor: OM.white, borderWidth: 0.7, borderColor: OM.silver, marginRight: 4 }} />
                <Text style={{ fontSize: 7.5, color: OM.slate }}>Current portfolio</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 12, height: 6, backgroundColor: OM.red, marginRight: 4 }} />
                <Text style={{ fontSize: 7.5, color: OM.slate }}>Recommended portfolio</Text>
              </View>
            </View>
          ) : null}
          {stressAfter.map((r, i) => {
            const nowR = stressNow?.[i] ?? null
            const bar = (v: number, filled: boolean) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'flex-end' }}>
                  {v < 0 ? (
                    <View
                      style={{
                        height: 9,
                        width: `${(Math.abs(v) / stressMax) * 100}%`,
                        backgroundColor: filled ? OM.red : OM.white,
                        borderWidth: filled ? 0 : 0.7,
                        borderColor: OM.silver,
                      }}
                    />
                  ) : null}
                </View>
                <View style={{ width: 1, height: 12, backgroundColor: OM.silver }} />
                <View style={{ width: '30%' }}>
                  {v > 0 ? (
                    <View style={{ height: 9, width: `${(v / stressMax) * 100}%`, backgroundColor: filled ? OM.navy : OM.white, borderWidth: filled ? 0 : 0.7, borderColor: OM.silver }} />
                  ) : null}
                </View>
                <Text style={{ width: '20%', fontSize: 8, textAlign: 'right', fontFamily: filled ? 'Helvetica-Bold' : 'Helvetica', color: v < 0 ? OM.red : OM.navy }}>
                  {v > 0 ? '+' : ''}
                  {v.toFixed(1)}%
                </Text>
              </View>
            )
            return (
              <View key={r.key} style={[s.row, { borderTopWidth: 0.6, borderTopColor: OM.paleSilver, paddingVertical: 10 }]} wrap={false}>
                <View style={{ width: '42%', paddingRight: 12 }}>
                  <Text style={[s.td, s.bold, { color: OM.navy }]}>{r.name}</Text>
                  <Text style={{ fontSize: 7, color: OM.slate, marginBottom: 3 }}>{r.period}</Text>
                  <Text style={{ fontSize: 7.5, lineHeight: 1.4, color: OM.ink }}>{r.summary}</Text>
                </View>
                <View style={{ width: '58%', justifyContent: 'center' }}>
                  {nowR ? bar(nowR.returnPct, false) : null}
                  {bar(r.returnPct, true)}
                  {r.change !== null ? (
                    <Text style={{ fontSize: 7, color: OM.slate, textAlign: 'right' }}>
                      {r.change < 0 ? 'A fall' : 'A rise'} of about {fmt(Math.abs(r.change))} on {fmt(total ?? 0)}
                    </Text>
                  ) : null}
                </View>
              </View>
            )
          })}
          {worst && worst.returnPct < 0 ? (
            <View style={s.callout} wrap={false}>
              <Text style={[s.p, { marginBottom: 0 }]}>
                In the most severe of these events ({worst.name}, {worst.period}), the recommended portfolio would have fallen by about <Text style={s.bold}>{pct(Math.abs(worst.returnPct))}</Text>
                {worst.change !== null ? <> ({fmt(Math.abs(worst.change))})</> : null}
                {stressNow ? (
                  <>
                    , compared with {pct(Math.abs(stressNow.find((x) => x.key === worst.key)?.returnPct ?? 0))} for your current portfolio
                  </>
                ) : null}
                . Markets have recovered from each of these falls, though recovery from the Global Financial Crisis took
                several years. Holding defensive assets alongside growth assets is what cushions a portfolio, and staying
                invested through a downturn has historically mattered more than timing it.
              </Text>
            </View>
          ) : null}
          <Text style={s.small}>
            Results apply each asset class&apos;s approximate return over the period to the portfolio&apos;s asset-class mix.
            An actual portfolio holds specific investments and would have performed differently. Past events are not a
            guide to future returns, and a future downturn could be larger or smaller. {STRESS_INDEX_NOTE}
          </Text>
        </Page>
      ) : null}

      {/* ---------- 8. Fees and costs ---------- */}
      {fees ? (
        <Page size="A4" style={s.page}>
          <Chrome client={client} />
          <SectionTitle n={next()} eyebrow="Fees and costs" title="What this advice costs" />
          <Text style={s.p}>
            Your portfolio is managed through PARS, Ord Minnett&apos;s Portfolio Administration and Reporting Service.
            PARS is non-discretionary: no change is made to your portfolio without your approval, and your investments
            remain legally and beneficially owned in your name. PARS is an administration and reporting service, not a
            custodial platform.
          </Text>
          <Text style={s.h2}>Ongoing advisory fee</Text>
          <View style={s.table}>
            <View style={s.tr}>
              <Text style={[s.th, { width: '55%' }]}>TIER</Text>
              <Text style={[s.th, { width: '22%', textAlign: 'right' }]}>AMOUNT</Text>
              <Text style={[s.th, { width: '23%', textAlign: 'right' }]}>ANNUAL FEE (EX GST)</Text>
            </View>
            {fees.tiers.map((t) => (
              <View style={s.tr} key={t.label}>
                <Text style={[s.td, { width: '55%' }]}>{t.label}</Text>
                <Text style={[s.td, { width: '22%', textAlign: 'right' }]}>{fmt(t.amount)}</Text>
                <Text style={[s.td, { width: '23%', textAlign: 'right' }]}>{fmt(t.fee)}</Text>
              </View>
            ))}
            <View style={s.tr}>
              <Text style={[s.td, { width: '77%' }, s.muted]}>GST</Text>
              <Text style={[s.td, { width: '23%', textAlign: 'right' }]}>{fmt(fees.gst)}</Text>
            </View>
            <View style={s.trTotal}>
              <Text style={[s.td, s.bold, { width: '77%' }]}>
                Estimated annual advisory fee (incl. GST) · {pct(fees.effectiveRatePct, 2)} of the portfolio
              </Text>
              <Text style={[s.td, s.bold, { width: '23%', textAlign: 'right', color: OM.navy }]}>{fmt(fees.feeIncGst)}</Text>
            </View>
          </View>
          <Text style={s.small}>Calculated progressively on a portfolio value of {fmt(total ?? 0)}; the fee moves with the value of your portfolio.</Text>

          {advice.trades.length > 0 ? (
            <>
              <Text style={s.h2}>Estimated costs to implement this proposal</Text>
              <View style={s.table}>
                <View style={s.tr}>
                  <Text style={[s.th, { width: '55%' }]}>ITEM</Text>
                  <Text style={[s.th, { width: '22%', textAlign: 'right' }]}>BASIS</Text>
                  <Text style={[s.th, { width: '23%', textAlign: 'right' }]}>ESTIMATE</Text>
                </View>
                <View style={s.tr}>
                  <Text style={[s.td, { width: '55%' }]}>Brokerage on listed securities ({fees.listedTrades} trades)</Text>
                  <Text style={[s.td, s.muted, { width: '22%', textAlign: 'right' }]}>capped at ${BROKERAGE_CAP} per trade</Text>
                  <Text style={[s.td, { width: '23%', textAlign: 'right' }]}>up to {fmt(fees.brokerageEstimate)}</Text>
                </View>
                {fees.bondTradeValue > 0 ? (
                  <View style={s.tr}>
                    <Text style={[s.td, { width: '55%' }]}>Bond transactions ({fmt(fees.bondTradeValue)} transacted)</Text>
                    <Text style={[s.td, s.muted, { width: '22%', textAlign: 'right' }]}>{BOND_TRANSACTION_RATE}% of value</Text>
                    <Text style={[s.td, { width: '23%', textAlign: 'right' }]}>{fmt(fees.bondCostEstimate)}</Text>
                  </View>
                ) : null}
                <View style={s.trTotal}>
                  <Text style={[s.td, s.bold, { width: '77%' }]}>Estimated one-off implementation costs</Text>
                  <Text style={[s.td, s.bold, { width: '23%', textAlign: 'right', color: OM.navy }]}>up to {fmt(fees.totalTransactionCosts)}</Text>
                </View>
              </View>
            </>
          ) : null}
          <Text style={s.small}>
            Managed funds and exchange-traded funds also carry their own management costs, which are deducted within
            the fund and reflected in its unit price. Where this proposal recommends selling an investment, you may
            realise a capital gain or loss{capitalGains ? ' (see Capital gains and losses)' : ''}. Your fee agreement and Statement of
            Advice set out the fees that apply to you.
          </Text>
        </Page>
      ) : null}

      {/* ---------- 9. Capital gains (optional) ---------- */}
      {capitalGains ? (
        <Page size="A4" style={s.page}>
          <Chrome client={client} />
          <SectionTitle n={next()} eyebrow="Tax" title="Capital gains and losses (estimate)" />
          <Text style={s.p}>
            Estimated capital gains tax on the recommended sales, for investments held in a{' '}
            {ENTITY_LABELS[capitalGains.result.entityType].toLowerCase()}, using rates published by the Australian
            Taxation Office for {capitalGains.reference.financialYear}.
          </Text>
          <View style={s.table}>
            <View style={s.tr}>
              <Text style={[s.th, { width: '15%' }]}>CODE</Text>
              <Text style={[s.th, { width: '29%' }]}>SECURITY</Text>
              <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>PROCEEDS</Text>
              <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>COST BASE</Text>
              <Text style={[s.th, { width: '10%', textAlign: 'center' }]}>12M+</Text>
              <Text style={[s.th, { width: '16%', textAlign: 'right' }]}>GAIN / (LOSS)</Text>
            </View>
            {capitalGains.result.lines.map((l) => (
              <View style={s.tr} key={l.code} wrap={false}>
                <Text style={[s.code, { width: '15%' }]}>{l.code}</Text>
                <Text style={[s.td, { width: '29%' }]}>{l.name}</Text>
                <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>{fmt(l.proceeds)}</Text>
                <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>{l.costBaseApplied !== null ? fmt(l.costBaseApplied) : 'not provided'}</Text>
                <Text style={[s.td, { width: '10%', textAlign: 'center' }]}>{l.over12Months ? 'Yes' : 'No'}</Text>
                <Text style={[s.td, { width: '16%', textAlign: 'right', color: l.gain !== null && l.gain < 0 ? OM.red : OM.ink }]}>
                  {l.gain === null ? '—' : l.gain >= 0 ? fmt(l.gain) : `(${fmt(-l.gain)})`}
                </Text>
              </View>
            ))}
          </View>
          {capitalGains.result.notCalculated ? (
            <View style={s.callout}>
              <Text style={s.p}>
                Not calculated for a foreign resident: Australian CGT generally applies only to taxable Australian
                property, and portfolio holdings in listed shares usually are not. Gains may be taxed in your country of
                residence at its own rates.
              </Text>
            </View>
          ) : (
            <View style={[s.tiles, { marginTop: 10 }]}>
              <Tile label="Net capital gain" value={fmt(capitalGains.result.netCapitalGain)} />
              <Tile label="Estimated tax" value={fmt(capitalGains.result.estimatedTax)} last={capitalGains.result.lossesCarriedForward <= 0} />
              {capitalGains.result.lossesCarriedForward > 0 ? (
                <Tile label="Losses carried forward" value={fmt(capitalGains.result.lossesCarriedForward)} last />
              ) : null}
            </View>
          )}
          {!capitalGains.result.notCalculated ? (
            <Text style={s.small}>
              Capital gains {fmt(capitalGains.result.grossGains)}, less capital losses this year{' '}
              {fmt(capitalGains.result.currentYearLosses)} and carried-forward losses used{' '}
              {fmt(capitalGains.result.carryForwardUsed)}, less the CGT discount {fmt(capitalGains.result.discountApplied)}.
              Tax rate: {capitalGains.result.rateDescription}.
            </Text>
          ) : null}
          {capitalGains.result.missingCostBase.length > 0 ? (
            <Text style={s.small}>Excluded (no cost base provided): {capitalGains.result.missingCostBase.join(', ')}.</Text>
          ) : null}
          <Text style={s.h2}>Important</Text>
          {[capitalGains.reference.reformNote, ...CGT_DISCLAIMERS].map((d) => (
            <Text style={s.small} key={d}>
              – {d}
            </Text>
          ))}
        </Page>
      ) : null}

      {/* ---------- Next steps + ongoing management ---------- */}
      <Page size="A4" style={s.page}>
        <Chrome client={client} />
        <SectionTitle n={next()} eyebrow="Next steps" title="Implementation and ongoing management" />
        {[
          { t: 'Review and discuss', d: 'We walk through this proposal together and answer any questions. Nothing is actioned until you are comfortable with the recommendations.' },
          { t: 'Your approval', d: 'You confirm your instructions by signing the authority to proceed that accompanies your Statement of Advice.' },
          {
            t: 'Implementation',
            d: `Listed transactions are placed promptly through PARS${fees && fees.bondTradeValue > 0 ? ', with bond transactions executed through our wholesale fixed income desk' : ''}.${stagedCount > 0 ? ' Staged exits are completed over the following months as redemption windows and market conditions allow.' : ''}`,
          },
          { t: 'Confirmation and reporting', d: 'You receive confirmation of every transaction and consolidated PARS reporting on your portfolio, its income and its tax position.' },
        ].map((st, i) => (
          <View style={s.step} key={st.t} wrap={false}>
            <Text style={s.stepNum}>{i + 1}</Text>
            <View style={{ flexGrow: 1, flexBasis: 0 }}>
              <Text style={[s.p, s.bold, { color: OM.navy, marginBottom: 2 }]}>{st.t}</Text>
              <Text style={s.p}>{st.d}</Text>
            </View>
          </View>
        ))}

        <Text style={s.h2}>How we look after your portfolio</Text>
        <Bullet>
          <Text style={s.bold}>Continuous monitoring. </Text>
          Every holding in the house model is monitored daily for company, sector and macroeconomic developments, and
          any recommended change is reviewed by our Investment Committee before it reaches your portfolio.
        </Bullet>
        <Bullet>
          <Text style={s.bold}>Disciplined rebalancing. </Text>
          When any asset class moves more than {DRIFT_TOLERANCE_PP} percentage points from its target, we will recommend
          rebalancing to keep your portfolio aligned with your {advice.riskProfile} profile.
        </Bullet>
        <Bullet>
          <Text style={s.bold}>Regular reviews. </Text>
          We review your portfolio, objectives and risk profile with you at least annually, and whenever your
          circumstances change.
        </Bullet>
        <Bullet>
          <Text style={s.bold}>Research advantage. </Text>
          Our recommendations draw on Ord Minnett research and exclusive access to Barrenjoey research, not available
          through any other private wealth channel.
        </Bullet>
      </Page>

      {/* ---------- Your advice team ---------- */}
      <Page size="A4" style={s.page}>
        <Chrome client={client} />
        <SectionTitle n={next()} eyebrow="Your advice team" title="The people looking after your wealth" />
        <Text style={s.lead}>
          Your portfolio is looked after by a dedicated private wealth team, supported by Ord Minnett&apos;s research,
          our Investment Committee and Ord Minnett&apos;s operations team. We are your first point of contact for
          anything to do with your investments.
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          {ADVICE_TEAM.map((m, i) => (
            <View
              key={m.name}
              style={{ flex: 1, borderTopWidth: 2, borderTopColor: OM.navy, backgroundColor: OM.paleGrey, padding: 14, marginRight: i < ADVICE_TEAM.length - 1 ? 10 : 0 }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: OM.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Text style={{ color: OM.white, fontSize: 11, fontFamily: 'Times-Bold' }}>
                  {m.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <Text style={{ fontFamily: 'Times-Bold', fontSize: 14, color: OM.navy }}>{m.name}</Text>
              <Text style={{ fontSize: 8, color: OM.slate, marginTop: 2, marginBottom: 8 }}>{m.title}</Text>
              {m.phone ? <Text style={{ fontSize: 8.5, color: OM.ink, marginBottom: 2 }}>{m.phone}</Text> : null}
              {m.email ? <Text style={{ fontSize: 8.5, color: OM.ink }}>{m.email}</Text> : null}
            </View>
          ))}
        </View>
        <Text style={[s.h2, { marginTop: 22 }]}>Our commitment to you</Text>
        <Bullet>
          <Text style={s.bold}>One integrated view. </Text>
          Your investments are considered alongside your wider circumstances - structures, tax and estate planning - as
          one balance sheet.
        </Bullet>
        <Bullet>
          <Text style={s.bold}>Nothing happens without you. </Text>
          Every change is recommended to you first and only implemented on your instruction.
        </Bullet>
        <Bullet>
          <Text style={s.bold}>Clear, regular reporting. </Text>
          You receive consolidated reporting on your portfolio, its income and its tax position, and a review with us at
          least once a year.
        </Bullet>
      </Page>

      {/* ---------- Authority to proceed ---------- */}
      <Page size="A4" style={s.page}>
        <Chrome client={client} />
        <SectionTitle n={next()} eyebrow="Authority to proceed" title="Your instruction to proceed" />
        <Text style={s.p}>
          Once you are comfortable with the recommendations in this proposal, please sign below to instruct us to
          implement them. This authority should be read together with your Statement of Advice.
        </Text>
        <View style={{ backgroundColor: OM.paleGrey, padding: 14, marginTop: 6, marginBottom: 16 }}>
          <Text style={[s.p, { marginBottom: 4 }]}>I / We confirm that:</Text>
          {[
            'I/we have read this proposal and the accompanying Statement of Advice, and have had the opportunity to ask questions.',
            `I/we instruct Ord Minnett to implement the recommended transactions set out under Recommended changes, in line with the Ord Minnett ${advice.riskProfile} portfolio${advice.currentModelVersion !== null ? ` (house model version ${advice.currentModelVersion})` : ''}.`,
            'I/we understand that prices will move between the date of this proposal and when transactions are placed, and that staged exits will be completed over time.',
            'I/we understand the fees and costs set out in this proposal and the Statement of Advice.',
          ].map((line) => (
            <View key={line} style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 12, fontSize: 9, color: OM.red }}>-</Text>
              <Text style={[s.p, { flex: 1, marginBottom: 0 }]}>{line}</Text>
            </View>
          ))}
        </View>
        {[0, 1].map((i) => (
          <View key={i} style={{ flexDirection: 'row', marginTop: 22 }} wrap={false}>
            {['Signature', 'Full name', 'Date'].map((label, j) => (
              <View key={label} style={{ flex: j === 0 ? 1.4 : 1, marginRight: j < 2 ? 14 : 0 }}>
                <View style={{ borderBottomWidth: 0.8, borderBottomColor: OM.navy, height: 26 }} />
                <Text style={{ fontSize: 7, color: OM.slate, marginTop: 3 }}>
                  {label}
                  {j === 0 ? ` - ${i === 0 ? 'investor' : 'second investor / director / trustee (if applicable)'}` : ''}
                </Text>
              </View>
            ))}
          </View>
        ))}
        <View style={{ flexDirection: 'row', marginTop: 30 }} wrap={false}>
          {['Adviser signature', 'Adviser name', 'Date'].map((label, j) => (
            <View key={label} style={{ flex: j === 0 ? 1.4 : 1, marginRight: j < 2 ? 14 : 0 }}>
              <View style={{ borderBottomWidth: 0.8, borderBottomColor: OM.navy, height: 26 }} />
              <Text style={{ fontSize: 7, color: OM.slate, marginTop: 3 }}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.small, { marginTop: 18 }]}>
          Proposal reference: {advice.reviewId.slice(0, 8).toUpperCase()} · prepared {preparedOn}. Please return a
          signed copy to your adviser.
        </Text>
      </Page>

      {/* ---------- Important information ---------- */}
      <Page size="A4" style={s.page}>
        <Chrome client={client} />
        <SectionTitle n={next()} eyebrow="Important information" title="Assumptions and disclosures" />
        <Text style={s.h3}>CAPITAL MARKET ASSUMPTIONS USED IN THIS PROPOSAL</Text>
        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.th, { width: '50%' }]}>ASSET CLASS</Text>
            <Text style={[s.th, { width: '20%', textAlign: 'right' }]}>EXPECTED RETURN (P.A.)</Text>
            <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>FRANKING</Text>
            <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>VOLATILITY</Text>
          </View>
          {Object.entries(CAPITAL_MARKET_ASSUMPTIONS).map(([k, v]) => (
            <View style={s.tr} key={k}>
              <Text style={[s.td, { width: '50%' }]}>{k}</Text>
              <Text style={[s.td, { width: '20%', textAlign: 'right' }]}>{pct(v.ret)}</Text>
              <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>{v.franking ? `+${pct(v.franking)}` : '—'}</Text>
              <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>{pct(v.vol)}</Text>
            </View>
          ))}
        </View>
        <Text style={s.small}>
          Long-term (10-year) nominal assumptions before fees and tax, as at {CMA_AS_AT}. Franking is the annual
          benefit of franking credits to an Australian investor able to use them in full; investors who cannot (for
          example non-residents) should disregard it. A fully franked dividend carries a credit of 42.9% of the cash
          dividend (the 30% company tax already paid), so the benefit is calculated from each recommended
          holding&apos;s forecast yield and franking level; the figure shown above is used only where a yield is not
          available. Inflation is assumed at{' '}
          {CPI_ASSUMPTION}% a year. Portfolio risk allows for diversification between asset classes. These assumptions
          are estimates, are reviewed periodically, and actual returns will differ.
        </Text>

        <Text style={[s.h3, { marginTop: 12 }]}>BASIS OF THIS PROPOSAL</Text>
        <Text style={s.small}>
          This proposal is based on the Ord Minnett {advice.riskProfile} house model
          {advice.currentModelVersion !== null ? ` (version ${advice.currentModelVersion})` : ''}
          {advice.hasBespokeWeights ? ', adjusted for your circumstances' : ''}
          {advice.asAtDate ? `, your holdings as at ${advice.asAtDate}` : ''} and market prices at the time of preparation.
          It summarises our recommendations and should be read together with your Statement of Advice, which sets out
          the basis of our advice, its costs and any conflicts of interest.
        </Text>
        <Text style={s.small}>
          Projections, expected returns, risk measures and income estimates are illustrations based on the assumptions
          above. They are not forecasts or guarantees of future performance. Past performance is not a reliable indicator
          of future performance. The value of investments and the income from them can fall as well as rise.
        </Text>
        <Text style={s.small}>
          Tax estimates are general in nature. Please confirm the tax implications of any recommendation with your
          accountant or tax adviser before proceeding.
        </Text>
        <Text style={s.small}>
          {ABN_LINE}. Ord Minnett is a Market Participant of ASX Limited. This document is confidential and prepared for
          the named recipient only.
        </Text>
      </Page>
    </Document>
  )
}
