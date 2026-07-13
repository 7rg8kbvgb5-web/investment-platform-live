import Badge from "./ui/Badge";
import Panel from "./ui/Panel";

type InstitutionalProposalBuilderPanelProps = {
  proposal?: { executiveSummary?: string };
  approvalReadiness?: { status?: string };
};

const staticSections = [
  {
    title: "Current Portfolio Diagnosis",
    body: "Highlights sector drift, concentration risk, missing model holdings and alignment to the selected risk profile.",
  },
  {
    title: "Recommended Portfolio",
    body: "Presents the proposed target portfolio using the house model, sector health scores and Champion/Challenger framework.",
  },
  {
    title: "Trade Recommendations",
    body: "Summarises proposed buy and sell movements required to move the client portfolio toward the approved model.",
  },
  {
    title: "Investment Committee Evidence",
    body: "Documents the governance trail behind each recommendation, including house view, approved list status and construction logic.",
  },
];

export default function InstitutionalProposalBuilderPanel({
  proposal,
  approvalReadiness,
}: InstitutionalProposalBuilderPanelProps) {
  return (
    <Panel
      eyebrow="Proposal Builder"
      title="Institutional Investment Proposal"
      actions={<Badge variant="neutral">{approvalReadiness?.status ?? "Draft"}</Badge>}
    >
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "-8px" }}>
        Converts the client portfolio analysis, recommendations and
        investment committee evidence into a structured adviser-ready
        proposal.
      </p>

      <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <div className="ui-item-card">
          <h3 style={{ fontWeight: 700, fontSize: "0.9rem", margin: "0 0 8px" }}>
            Executive Summary
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {proposal?.executiveSummary ?? "Executive summary will appear here."}
          </p>
        </div>

        {staticSections.map((section) => (
          <div key={section.title} className="ui-item-card">
            <h3 style={{ fontWeight: 700, fontSize: "0.9rem", margin: "0 0 8px" }}>
              {section.title}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {section.body}
            </p>
          </div>
        ))}

        <div className="ui-item-card">
          <h3 style={{ fontWeight: 700, fontSize: "0.9rem", margin: "0 0 8px" }}>
            Adviser Commentary
          </h3>
          <textarea
            rows={6}
            placeholder="Add adviser-specific commentary before generating the final proposal..."
            className="ui-input"
            style={{ resize: "vertical" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button type="button" className="ui-button">
          Generate Adviser Draft
        </button>
        <button type="button" className="ui-button ui-button-secondary">
          Generate Client Version
        </button>
      </div>
    </Panel>
  );
}
