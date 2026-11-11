import type { ReactNode } from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ClientAdvice } from '../engines/client-advice'
import { DRIFT_TOLERANCE_PP } from '../engines/client-advice'
import { ASSET_CLASSES, RISK_PROFILES } from '../engines/model-portfolio-core'
import { CGT_DISCLAIMERS, ENTITY_LABELS, type CgtResult } from '../tax/cgt'
import type { TaxReference } from '../tax/tax-reference'
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

export function ClientProposalDocument({
  advice,
  adviserNotes,
  preparedOn,
  capitalGains,
}: {
  advice: ClientAdvice
  adviserNotes: string
  preparedOn: string
  capitalGains?: { result: CgtResult; reference: TaxReference } | null
}) {
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
  const riskAfter = portfolioRiskStats(after)
  const riskNow = hasCurrent ? portfolioRiskStats(current) : null
  const fees = estimateFees(advice)
  const total = advice.totalAfter
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
      .map((r) => ({ label: r.label, d: r.after - r.current }))
      .filter((m) => Math.abs(m.d) >= 2)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      .slice(0, 2)
    for (const m of moves)
      keyChanges.push(`${m.label} ${m.d > 0 ? 'increases' : 'reduces'} by ${pct(Math.abs(m.d), 0)} of the portfolio.`)
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
      `Estimated income of ${fmt(advice.projectedIncome)} a year${advice.projectedFrankingCredits ? `, plus about ${fmt(advice.projectedFrankingCredits)} in franking credits` : ''}.`,
    )

  const recommendation = advice.isNewMoney
    ? `We recommend investing ${fmt(advice.newCash)} in a ${advice.riskProfile} portfolio built from the Ord Minnett house model: a diversified mix of quality Australian and international investments, matched to your objectives and your tolerance for risk.`
    : advice.approach === 'new-cash'
      ? `We recommend investing the new ${fmt(advice.newCash)} into the parts of your portfolio furthest below their targets. No existing holdings are sold, so no capital gains are realised and turnover is kept to a minimum.`
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
                {group.rows.map((t) => (
                  <View style={s.tr} key={`${t.code}-${t.action}`} wrap={false}>
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
                ))}
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
          <View>
            <Text style={s.h2} minPresenceAhead={60}>Holdings retained outside the model</Text>
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
          Values use market prices at the time of preparation and will move before transactions are placed. Unit
          quantities are rounded down to whole units; investments without a listed price are transacted by value.
        </Text>
      </Page>

      {/* ---------- 5. Recommended portfolio holdings ---------- */}
      {advice.resultingHoldings.length > 0 ? (
        <Page size="A4" style={s.page}>
          <Chrome client={client} />
          <SectionTitle n={next()} eyebrow="Your recommended portfolio" title="The portfolio once implemented" />
          <Text style={s.p}>
            Each holding is drawn from the Ord Minnett Approved List and selected through our research process, which
            includes Ord Minnett and Barrenjoey research. Income estimates use forward-looking yields where available.
          </Text>
          <View style={s.table}>
            <View style={s.tr} fixed>
              <Text style={[s.th, { width: '16%' }]}>CODE</Text>
              <Text style={[s.th, { width: '40%' }]}>SECURITY</Text>
              <Text style={[s.th, { width: '11%', textAlign: 'right' }]}>WEIGHT</Text>
              <Text style={[s.th, { width: '14%', textAlign: 'right' }]}>VALUE</Text>
              <Text style={[s.th, { width: '10%', textAlign: 'right' }]}>YIELD</Text>
              <Text style={[s.th, { width: '9%', textAlign: 'right' }]}>FRANKED</Text>
            </View>
            {ASSET_CLASSES.map((ac) => {
              const rows = advice.resultingHoldings.filter((h) => h.assetClass === ac.name)
              if (rows.length === 0) return null
              const w = rows.reduce((sum, h) => sum + h.weight, 0)
              const v = rows.reduce((sum, h) => sum + (h.value ?? 0), 0)
              return (
                <View key={ac.name}>
                  <View style={s.trGroup} wrap={false} minPresenceAhead={20}>
                    <View style={{ width: '56%', flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 6, height: 6, backgroundColor: colourFor(ac.name), marginRight: 5 }} />
                      <Text style={[s.td, s.bold, { color: OM.navy }]}>{ac.name}</Text>
                    </View>
                    <Text style={[s.td, s.bold, { width: '11%', textAlign: 'right', color: OM.navy }]}>{pct(w)}</Text>
                    <Text style={[s.td, s.bold, { width: '14%', textAlign: 'right', color: OM.navy }]}>{v ? fmt(v) : ''}</Text>
                    <Text style={{ width: '19%' }} />
                  </View>
                  {rows.map((h) => (
                    <View style={s.tr} key={h.code} wrap={false}>
                      <Text style={[s.code, { width: '16%' }]}>{h.code}</Text>
                      <Text style={[s.td, { width: '40%' }]}>
                        {h.name}
                        {!h.inModel ? <Text style={{ color: OM.slate }}> (retained)</Text> : null}
                      </Text>
                      <Text style={[s.td, { width: '11%', textAlign: 'right' }]}>{pct(h.weight)}</Text>
                      <Text style={[s.td, { width: '14%', textAlign: 'right' }]}>{h.value !== null ? fmt(h.value) : '—'}</Text>
                      <Text style={[s.td, { width: '10%', textAlign: 'right' }]}>{h.yield !== null ? pct(h.yield) : '—'}</Text>
                      <Text style={[s.td, s.muted, { width: '9%', textAlign: 'right' }]}>{h.frankingPct !== null ? `${Math.round(h.frankingPct)}%` : '—'}</Text>
                    </View>
                  ))}
                </View>
              )
            })}
            <View style={s.trTotal} wrap={false}>
              <Text style={[s.td, s.bold, { width: '56%' }]}>Total</Text>
              <Text style={[s.td, s.bold, { width: '11%', textAlign: 'right' }]}>
                {pct(advice.resultingHoldings.reduce((sum, h) => sum + h.weight, 0))}
              </Text>
              <Text style={[s.td, s.bold, { width: '14%', textAlign: 'right' }]}>
                {total ? fmt(advice.resultingHoldings.reduce((sum, h) => sum + (h.value ?? 0), 0)) : ''}
              </Text>
              <Text style={[s.td, s.bold, { width: '10%', textAlign: 'right' }]}>{advice.projectedYieldPct !== null ? pct(advice.projectedYieldPct) : ''}</Text>
              <Text style={{ width: '9%' }} />
            </View>
          </View>
          {advice.cashDeployment && advice.cashDeployment.residualCash > 1 ? (
            <Text style={s.small}>
              About {fmt(advice.cashDeployment.residualCash)} remains in cash after rounding to whole units.
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

          {incomeByClass.length > 0 ? (
            <View wrap={false}>
              <Text style={s.h3}>WHERE THE INCOME COMES FROM</Text>
              <HBars rows={incomeByClass} format={(v) => fmt(v)} />
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
          Long-term (10-year) nominal assumptions before fees and tax, as at {CMA_AS_AT}. Franking is the estimated
          annual benefit of franking credits to an Australian investor able to use them in full; investors who cannot
          (for example non-residents) should disregard it. Inflation is assumed at{' '}
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
