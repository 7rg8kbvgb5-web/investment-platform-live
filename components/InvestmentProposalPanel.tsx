"use client";

import type { InvestmentProposal } from "../lib/engines/investment-proposal-generator";
import type { PortfolioApprovalReadiness } from "../lib/engines/portfolio-approval-readiness";
import Badge, { type BadgeVariant } from "./ui/Badge";
import Panel from "./ui/Panel";

type InvestmentProposalPanelProps = {
  proposal: InvestmentProposal;
  approvalReadiness: PortfolioApprovalReadiness;
};

function getStatusLabel(status: string) {
  return status.replaceAll("-", " ");
}

function getStatusVariant(status: string): BadgeVariant {
  if (status === "aligned" || status === "approved") return "success";
  if (status === "minor-adjustments" || status === "conditional-approval") return "warning";
  return "danger";
}

export function InvestmentProposalPanel({
  proposal,
  approvalReadiness,
}: InvestmentProposalPanelProps) {
  const handleDownloadPdf = () => {
    window.open("/api/proposals/pdf", "_blank");
  };

  const evidenceSection = proposal.sections.find(
    (section) => section.id === "investment-committee-evidence"
  );

  const tradeSection = proposal.sections.find(
    (section) => section.id === "recommended-changes"
  );

  return (
    <Panel
      eyebrow="Investment Proposal"
      title="Adviser Proposal Draft"
      actions={
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
          <Badge variant={getStatusVariant(proposal.status)}>
            {getStatusLabel(proposal.status)}
          </Badge>
          <button type="button" onClick={handleDownloadPdf} className="ui-button">
            Download PDF
          </button>
        </div>
      }
    >
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "-8px", maxWidth: "640px" }}>
        Generates an adviser-grade proposal summary using the shared client
        advice workflow, portfolio analysis, rebalance recommendations,
        investment committee evidence and approval readiness checks.
      </p>

      <div className="ui-stat-grid">
        <div className="ui-stat-card">
          <p className="ui-stat-label">Client</p>
          <p className="ui-stat-value">{proposal.clientName}</p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Model</p>
          <p className="ui-stat-value">{proposal.modelName}</p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Alignment Score</p>
          <p className="ui-stat-value" style={{ fontSize: "1.6rem" }}>
            {proposal.alignmentScore}/100
          </p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Approval Score</p>
          <p className="ui-stat-value" style={{ fontSize: "1.6rem" }}>
            {approvalReadiness.score}/100
          </p>
        </div>

        <div className="ui-stat-card">
          <p className="ui-stat-label">Approval Status</p>
          <div style={{ marginTop: "6px" }}>
            <Badge variant={getStatusVariant(approvalReadiness.status)}>
              {getStatusLabel(approvalReadiness.status)}
            </Badge>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <div className="ui-item-card">
          <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>
            Recommended Changes Snapshot
          </p>
          <p style={{ marginTop: "8px", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-line" }}>
            {tradeSection?.content || "No recommended changes available."}
          </p>
        </div>

        <div className="ui-item-card">
          <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>
            Investment Committee Evidence Snapshot
          </p>
          <p style={{ marginTop: "8px", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-line" }}>
            {evidenceSection?.content || "No investment committee evidence attached."}
          </p>
        </div>

        <div className="ui-item-card">
          <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>
            Approval Readiness Snapshot
          </p>
          <p style={{ marginTop: "8px", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
            {approvalReadiness.rationale}
          </p>

          {approvalReadiness.requiredActions.length > 0 ? (
            <ul style={{ marginTop: "10px", paddingLeft: "18px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {approvalReadiness.requiredActions.map((action) => (
                <li key={action} style={{ marginBottom: "4px" }}>{action}</li>
              ))}
            </ul>
          ) : (
            <p style={{ marginTop: "10px", fontSize: "0.85rem", fontWeight: 700 }}>
              No outstanding approval actions.
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {proposal.sections.map((section) => (
          <div key={section.id} className="ui-item-card">
            <h3 style={{ fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>
              {section.title}
            </h3>
            <p style={{ marginTop: "8px", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-line" }}>
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
