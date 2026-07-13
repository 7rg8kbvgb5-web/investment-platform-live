import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { InvestmentProposal } from "../engines/investment-proposal-generator";
import type { PortfolioApprovalReadiness } from "../engines/portfolio-approval-readiness";

// Ord Minnett brand palette
const BRAND = {
  deepSeaBlue: "#0B2E4F",
  teal: "#1B7A7A",
  silver: "#B8C2CC",
  paleGrey: "#F3F5F7",
  ink: "#1A2733",
  slate: "#4A5A68",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: BRAND.ink,
  },
  coverPage: {
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
    backgroundColor: BRAND.deepSeaBlue,
    color: "#FFFFFF",
  },
  coverBand: {
    height: 6,
    backgroundColor: BRAND.teal,
  },
  coverBody: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 56,
  },
  coverEyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: BRAND.silver,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  coverTitle: {
    fontSize: 30,
    fontWeight: 700,
    marginBottom: 10,
    lineHeight: 1.25,
  },
  coverSubtitle: {
    fontSize: 13,
    color: BRAND.silver,
    marginBottom: 40,
  },
  coverMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#3E5A73",
    paddingTop: 16,
    marginTop: 8,
  },
  coverMetaLabel: {
    fontSize: 8,
    letterSpacing: 1,
    color: BRAND.silver,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  coverMetaValue: {
    fontSize: 11,
    color: "#FFFFFF",
  },
  coverFooter: {
    paddingHorizontal: 56,
    paddingBottom: 40,
    fontSize: 8,
    color: BRAND.silver,
  },
  headerRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND.teal,
    paddingBottom: 8,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerBrand: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: BRAND.deepSeaBlue,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  headerPage: {
    fontSize: 8,
    color: BRAND.slate,
  },
  summaryBar: {
    flexDirection: "row",
    backgroundColor: BRAND.paleGrey,
    borderRadius: 4,
    padding: 14,
    marginBottom: 20,
  },
  summaryBlock: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 7.5,
    letterSpacing: 1,
    color: BRAND.slate,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: 700,
    color: BRAND.deepSeaBlue,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: BRAND.deepSeaBlue,
    marginBottom: 6,
    marginTop: 16,
  },
  sectionRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.silver,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 9.5,
    lineHeight: 1.55,
    color: BRAND.ink,
  },
  bullet: {
    fontSize: 9.5,
    lineHeight: 1.55,
    color: BRAND.ink,
    marginBottom: 2,
  },
  readinessBox: {
    marginTop: 18,
    padding: 14,
    borderWidth: 0.75,
    borderColor: BRAND.silver,
    borderRadius: 4,
  },
  readinessTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: BRAND.deepSeaBlue,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 7,
    color: BRAND.slate,
    borderTopWidth: 0.5,
    borderTopColor: BRAND.silver,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function titleCaseStatus(status: string) {
  return status
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type Props = {
  proposal: InvestmentProposal;
  approvalReadiness: PortfolioApprovalReadiness;
  adviserName?: string;
};

export function InvestmentProposalDocument({
  proposal,
  approvalReadiness,
  adviserName = "Ord Minnett Private Wealth",
}: Props) {
  const generatedOn = formatDate(new Date());

  return (
    <Document
      title={`Investment Proposal — ${proposal.clientName}`}
      author="Ord Minnett Private Wealth"
    >
      {/* Cover page */}
      <Page size="A4" style={[styles.page, styles.coverPage]}>
        <View style={styles.coverBand} />
        <View style={styles.coverBody}>
          <Text style={styles.coverEyebrow}>Ord Minnett Private Wealth</Text>
          <Text style={styles.coverTitle}>Investment Proposal</Text>
          <Text style={styles.coverSubtitle}>
            Prepared for {proposal.clientName}
          </Text>

          <View style={styles.coverMetaRow}>
            <View>
              <Text style={styles.coverMetaLabel}>Model Portfolio</Text>
              <Text style={styles.coverMetaValue}>{proposal.modelName}</Text>
            </View>
            <View>
              <Text style={styles.coverMetaLabel}>Alignment Score</Text>
              <Text style={styles.coverMetaValue}>
                {proposal.alignmentScore}%
              </Text>
            </View>
            <View>
              <Text style={styles.coverMetaLabel}>Status</Text>
              <Text style={styles.coverMetaValue}>
                {titleCaseStatus(proposal.status)}
              </Text>
            </View>
            <View>
              <Text style={styles.coverMetaLabel}>Prepared</Text>
              <Text style={styles.coverMetaValue}>{generatedOn}</Text>
            </View>
          </View>
        </View>
        <View style={styles.coverFooter}>
          <Text>
            {adviserName} — This document is prepared for the exclusive use
            of the named client and is confidential.
          </Text>
        </View>
      </Page>

      {/* Content page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRule}>
          <Text style={styles.headerBrand}>Ord Minnett Private Wealth</Text>
          <Text style={styles.headerPage}>{proposal.clientName}</Text>
        </View>

        <View style={styles.summaryBar}>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Model Portfolio</Text>
            <Text style={styles.summaryValue}>{proposal.modelName}</Text>
          </View>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Alignment Score</Text>
            <Text style={styles.summaryValue}>
              {proposal.alignmentScore}%
            </Text>
          </View>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={styles.summaryValue}>
              {titleCaseStatus(proposal.status)}
            </Text>
          </View>
        </View>

        {proposal.sections.map((section) => (
          <View key={section.id} wrap={false}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionRule} />
            <Text style={styles.bodyText}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.readinessBox} wrap={false}>
          <Text style={styles.readinessTitle}>
            Approval Readiness Snapshot
          </Text>
          <Text style={styles.bodyText}>{approvalReadiness.rationale}</Text>

          {approvalReadiness.requiredActions.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              {approvalReadiness.requiredActions.map((action) => (
                <Text key={action} style={styles.bullet}>
                  •  {action}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={[styles.bodyText, { marginTop: 8, fontWeight: 700 }]}>
              No outstanding approval actions.
            </Text>
          )}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Ord Minnett Private Wealth — Confidential  |  Page ${pageNumber} of ${totalPages}  |  Generated ${generatedOn}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
