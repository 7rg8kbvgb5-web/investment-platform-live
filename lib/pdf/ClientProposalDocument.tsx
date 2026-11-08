import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ClientAdvice } from '../engines/client-advice'

// Client-facing proposal, built from exactly the same calculation as the
// Client Advice tab (lib/engines/client-advice.ts). Ord Minnett palette.

const BRAND = {
  deepSeaBlue: '#0B2E4F',
  teal: '#1B7A7A',
  red: '#C8102E',
  silver: '#B8C2CC',
  paleGrey: '#F3F5F7',
  ink: '#1A2733',
  slate: '#4A5A68',
}

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 60, paddingHorizontal: 48, fontSize: 9.5, fontFamily: 'Helvetica', color: BRAND.ink },
  cover: { backgroundColor: BRAND.deepSeaBlue, color: '#FFFFFF', padding: 0 },
  coverBand: { height: 6, backgroundColor: BRAND.teal },
  coverBody: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 56 },
  coverEyebrow: { fontSize: 10, letterSpacing: 2, color: BRAND.silver, marginBottom: 14 },
  coverTitle: { fontSize: 30, fontFamily: 'Helvetica-Bold', marginBottom: 10 },
  coverSub: { fontSize: 13, color: '#DDE5EC', marginBottom: 4 },
  coverRule: { width: 60, height: 2, backgroundColor: BRAND.red, marginVertical: 20 },
  coverFooter: { paddingHorizontal: 56, paddingBottom: 40, fontSize: 9, color: BRAND.silver },
  h1: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: BRAND.deepSeaBlue, marginBottom: 4 },
  h1Rule: { width: 40, height: 2, backgroundColor: BRAND.teal, marginBottom: 12 },
  h2: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: BRAND.deepSeaBlue, marginTop: 16, marginBottom: 6 },
  p: { fontSize: 9.5, lineHeight: 1.5, color: BRAND.ink, marginBottom: 6 },
  muted: { color: BRAND.slate },
  statRow: { flexDirection: 'row', marginBottom: 10 },
  stat: { flexGrow: 1, flexBasis: 0, backgroundColor: BRAND.paleGrey, padding: 10, marginRight: 6 },
  statLabel: { fontSize: 7.5, color: BRAND.slate, letterSpacing: 0.8, marginBottom: 4 },
  statValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: BRAND.deepSeaBlue },
  table: { borderTopWidth: 1, borderTopColor: BRAND.deepSeaBlue },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BRAND.silver, paddingVertical: 4 },
  th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BRAND.slate, letterSpacing: 0.5 },
  td: { fontSize: 8.5 },
  callout: { borderLeftWidth: 3, borderLeftColor: BRAND.teal, backgroundColor: BRAND.paleGrey, padding: 10, marginVertical: 8 },
  footer: { position: 'absolute', bottom: 28, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: BRAND.slate, borderTopWidth: 0.5, borderTopColor: BRAND.silver, paddingTop: 6 },
})

function fmt(value: number): string {
  return value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

function Footer({ client }: { client: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>Ord Minnett Private Wealth · Investment proposal for {client}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

export function ClientProposalDocument({
  advice,
  adviserNotes,
  preparedOn,
}: {
  advice: ClientAdvice
  adviserNotes: string
  preparedOn: string
}) {
  const buys = advice.trades.filter((t) => t.action === 'buy' || t.action === 'increase')
  const sells = advice.trades.filter((t) => t.action === 'sell' || t.action === 'reduce')
  const afterWeight = (assetClass: string, modelWeight: number) =>
    Math.round(
      (advice.cashDeployment
        ? advice.cashDeployment.assetClasses.find((a) => a.assetClass === assetClass)?.afterWeight ?? 0
        : modelWeight) * 10,
    ) / 10

  const approachText = advice.isNewMoney
    ? `We recommend investing ${fmt(advice.newCash)} into the ${advice.riskProfile} portfolio, built directly from the Ord Minnett house model.`
    : advice.approach === 'new-cash'
      ? `We recommend investing the new ${fmt(advice.newCash)} into the holdings furthest below their target weights. No existing holdings are sold, so no capital gains are realised and turnover is kept to a minimum.`
      : `We recommend rebalancing the portfolio to the ${advice.riskProfile} house model${advice.newCash > 0 ? `, including the new ${fmt(advice.newCash)}` : ''}.`

  return (
    <Document title={`Investment proposal - ${advice.clientName}`} author="Ord Minnett Private Wealth">
      <Page size="A4" style={s.cover}>
        <View style={s.coverBand} />
        <View style={s.coverBody}>
          <Text style={s.coverEyebrow}>ORD MINNETT PRIVATE WEALTH</Text>
          <Text style={s.coverTitle}>Investment Proposal</Text>
          <View style={s.coverRule} />
          <Text style={s.coverSub}>Prepared for {advice.clientName}</Text>
          <Text style={s.coverSub}>{advice.riskProfile} risk profile</Text>
          <Text style={s.coverSub}>{preparedOn}</Text>
        </View>
        <Text style={s.coverFooter}>
          Based on the Ord Minnett house model{advice.currentModelVersion !== null ? ` (version ${advice.currentModelVersion})` : ''}
          {advice.asAtDate ? ` and your holdings as at ${advice.asAtDate}` : ''}.
        </Text>
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Summary</Text>
        <View style={s.h1Rule} />
        <Text style={s.p}>{approachText}</Text>

        <View style={s.statRow}>
          {!advice.isNewMoney && advice.existingValue !== null ? (
            <View style={s.stat}>
              <Text style={s.statLabel}>CURRENT VALUE</Text>
              <Text style={s.statValue}>{fmt(advice.existingValue)}</Text>
            </View>
          ) : null}
          {advice.newCash > 0 ? (
            <View style={s.stat}>
              <Text style={s.statLabel}>{advice.isNewMoney ? 'AMOUNT TO INVEST' : 'NEW CASH'}</Text>
              <Text style={s.statValue}>{fmt(advice.newCash)}</Text>
            </View>
          ) : null}
          <View style={s.stat}>
            <Text style={s.statLabel}>RISK PROFILE</Text>
            <Text style={s.statValue}>{advice.riskProfile}</Text>
          </View>
          {advice.projectedIncome !== null ? (
            <View style={s.stat}>
              <Text style={s.statLabel}>PROJECTED ANNUAL INCOME</Text>
              <Text style={s.statValue}>{fmt(advice.projectedIncome)}</Text>
            </View>
          ) : null}
          {advice.projectedFrankingCredits !== null && advice.projectedFrankingCredits > 0 ? (
            <View style={s.stat}>
              <Text style={s.statLabel}>FRANKING CREDITS</Text>
              <Text style={s.statValue}>{fmt(advice.projectedFrankingCredits)}</Text>
            </View>
          ) : null}
        </View>

        {adviserNotes.trim() ? (
          <>
            <Text style={s.h2}>Your adviser&apos;s commentary</Text>
            <View style={s.callout}>
              <Text style={s.p}>{adviserNotes.trim()}</Text>
            </View>
          </>
        ) : null}

        <Text style={s.h2}>Asset allocation</Text>
        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.th, { width: '46%' }]}>ASSET CLASS</Text>
            {!advice.isNewMoney ? <Text style={[s.th, { width: '18%' }]}>CURRENT</Text> : null}
            <Text style={[s.th, { width: '18%' }]}>MODEL TARGET</Text>
            <Text style={[s.th, { width: '18%' }]}>AFTER ADVICE</Text>
          </View>
          {advice.assetClasses
            .filter((r) => r.modelWeight > 0 || r.clientWeight > 0)
            .map((r) => (
              <View style={s.tr} key={r.assetClass}>
                <Text style={[s.td, { width: '46%' }]}>{r.assetClass}</Text>
                {!advice.isNewMoney ? <Text style={[s.td, { width: '18%' }]}>{r.clientWeight}%</Text> : null}
                <Text style={[s.td, { width: '18%' }]}>{r.modelWeight}%</Text>
                <Text style={[s.td, { width: '18%' }]}>{afterWeight(r.assetClass, r.modelWeight)}%</Text>
              </View>
            ))}
        </View>

        {advice.relevantDecisions.filter((d) => d.appliedToModel).length > 0 ? (
          <>
            <Text style={s.h2}>Changes to the house view affecting your portfolio</Text>
            {advice.relevantDecisions
              .filter((d) => d.appliedToModel)
              .map((d) => (
                <Text style={s.p} key={d.id}>
                  • Our Investment Committee has approved replacing {d.currentCode} with {d.proposedCode}
                  {d.proposedName ? ` (${d.proposedName})` : ''}.{d.decisionRationale ? ` ${d.decisionRationale}` : ''}
                </Text>
              ))}
          </>
        ) : null}
        <Footer client={advice.clientName} />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Recommended transactions</Text>
        <View style={s.h1Rule} />
        {advice.trades.length === 0 ? (
          <Text style={s.p}>Your portfolio is in line with the model - no transactions are recommended.</Text>
        ) : null}
        {[
          { title: 'Purchases', rows: buys },
          { title: 'Sales', rows: sells },
        ]
          .filter((g) => g.rows.length > 0)
          .map((group) => (
            <View key={group.title} wrap>
              <Text style={s.h2}>
                {group.title} · {fmt(group.rows.reduce((sum, t) => sum + Math.abs(t.value ?? 0), 0))}
              </Text>
              <View style={s.table}>
                <View style={s.tr}>
                  <Text style={[s.th, { width: '12%' }]}>CODE</Text>
                  <Text style={[s.th, { width: '36%' }]}>SECURITY</Text>
                  <Text style={[s.th, { width: '22%' }]}>ASSET CLASS</Text>
                  <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>VALUE</Text>
                  <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>UNITS</Text>
                </View>
                {group.rows.map((t) => (
                  <View style={s.tr} key={`${t.code}-${t.action}`} wrap={false}>
                    <Text style={[s.td, { width: '12%', fontFamily: 'Helvetica-Bold' }]}>{t.code}</Text>
                    <Text style={[s.td, { width: '36%' }]}>{t.name}</Text>
                    <Text style={[s.td, { width: '22%' }, s.muted]}>{t.assetClass}</Text>
                    <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>{t.value !== null ? fmt(Math.abs(t.value)) : '-'}</Text>
                    <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>
                      {t.units !== null ? Math.abs(t.units).toLocaleString('en-AU') : 'by value'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

        <Text style={s.h2}>Basis of this proposal</Text>
        <Text style={[s.p, s.muted]}>
          Figures are indicative. They are based on the Ord Minnett {advice.riskProfile} house model
          {advice.currentModelVersion !== null ? ` (version ${advice.currentModelVersion})` : ''}
          {advice.hasBespokeWeights ? ', adjusted for your circumstances' : ''}
          {advice.asAtDate ? `, your holdings as at ${advice.asAtDate}` : ''}, and market prices at the time of
          preparation, which will move before transactions are placed. Unit quantities are rounded down to whole
          units; securities without a listed price are transacted by value. Projected income uses forward yield
          estimates for holdings where one is available and is not guaranteed. Franking credits are estimated at
          the 30% company tax rate; the benefit to you depends on your tax position.
        </Text>
        <Footer client={advice.clientName} />
      </Page>
    </Document>
  )
}
