import React from "react";

type InstitutionalProposalBuilderPanelProps = {
  proposal: any;
  approvalReadiness: any;
};

export default function InstitutionalProposalBuilderPanel({
  proposal,
  approvalReadiness,
}: InstitutionalProposalBuilderPanelProps) {
  return (
    <section className="panel institutional-proposal-builder">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Proposal Builder</p>
          <h2>Institutional Investment Proposal</h2>
          <p>
            Converts the client portfolio analysis, recommendations and
            investment committee evidence into a structured adviser-ready
            proposal.
          </p>
        </div>

        <div className="proposal-status">
          {approvalReadiness?.status ?? "Draft"}
        </div>
      </div>

      <div className="proposal-grid">
        <div className="proposal-card">
          <h3>Executive Summary</h3>
          <p>{proposal?.executiveSummary ?? "Executive summary will appear here."}</p>
        </div>

        <div className="proposal-card">
          <h3>Current Portfolio Diagnosis</h3>
          <p>
            Highlights sector drift, concentration risk, missing model holdings
            and alignment to the selected risk profile.
          </p>
        </div>

        <div className="proposal-card">
          <h3>Recommended Portfolio</h3>
          <p>
            Presents the proposed target portfolio using the house model,
            sector health scores and Champion/Challenger framework.
          </p>
        </div>

        <div className="proposal-card">
          <h3>Trade Recommendations</h3>
          <p>
            Summarises proposed buy and sell movements required to move the
            client portfolio toward the approved model.
          </p>
        </div>

        <div className="proposal-card">
          <h3>Investment Committee Evidence</h3>
          <p>
            Documents the governance trail behind each recommendation, including
            house view, approved list status and construction logic.
          </p>
        </div>

        <div className="proposal-card">
          <h3>Adviser Commentary</h3>
          <textarea
            rows={6}
            placeholder="Add adviser-specific commentary before generating the final proposal..."
          />
        </div>
      </div>

      <div className="proposal-actions">
        <button type="button">Generate Adviser Draft</button>
        <button type="button" className="secondary">
          Generate Client Version
        </button>
      </div>
    </section>
  );
}