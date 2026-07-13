"use client";

import { useMemo, useState } from "react";
import {
  buildProposalV3,
  getDefaultProposalSectionIds,
  proposalV3Sections,
  type ProposalSection,
  type ProposalSectionId,
} from "../lib/engines/proposal-v3";

type ProposalPreset = "client" | "professional" | "institutional";

const presetSectionIds: Record<ProposalPreset, ProposalSectionId[]> = {
  client: [
    "cover",
    "executive-summary",
    "client-objectives",
    "current-portfolio",
    "recommended-trades",
    "implementation-plan",
    "expected-outcomes",
    "disclosures",
  ],
  professional: [
    "cover",
    "executive-summary",
    "client-objectives",
    "current-portfolio",
    "portfolio-health",
    "allocation-comparison",
    "recommended-trades",
    "risk-assessment",
    "implementation-plan",
    "expected-outcomes",
    "disclosures",
  ],
  institutional: proposalV3Sections.map((section) => section.id),
};

const categoryLabels: Record<ProposalSection["category"], string> = {
  client: "Client Information",
  analysis: "Portfolio Analysis",
  recommendation: "Recommendations",
  governance: "Investment Committee & Governance",
  appendix: "Appendices",
};

function estimateProposalPages(sectionCount: number, preset: ProposalPreset) {
  const basePages = preset === "institutional" ? 4 : preset === "professional" ? 3 : 2;
  return basePages + sectionCount;
}

export default function ProposalV3Panel() {
  const [preset, setPreset] = useState<ProposalPreset>("professional");
  const [selectedSectionIds, setSelectedSectionIds] = useState<ProposalSectionId[]>(
    getDefaultProposalSectionIds(),
  );

  const proposal = useMemo(
    () => buildProposalV3(selectedSectionIds),
    [selectedSectionIds],
  );

  const groupedSections = useMemo(() => {
    return proposalV3Sections.reduce(
      (groups, section) => {
        if (!groups[section.category]) {
          groups[section.category] = [];
        }

        groups[section.category].push(section);
        return groups;
      },
      {} as Record<ProposalSection["category"], ProposalSection[]>,
    );
  }, []);

  const estimatedPages = estimateProposalPages(selectedSectionIds.length, preset);

  function applyPreset(nextPreset: ProposalPreset) {
    setPreset(nextPreset);
    setSelectedSectionIds(presetSectionIds[nextPreset]);
  }

  function toggleSection(sectionId: ProposalSectionId) {
    setSelectedSectionIds((current) => {
      if (current.includes(sectionId)) {
        return current.filter((id) => id !== sectionId);
      }

      return [...current, sectionId];
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Proposal Generator V3</p>
          <h2>Professional Investment Proposal Builder</h2>
          <p className="muted">
            Select the sections to include in this client proposal before generating
            the final document.
          </p>
        </div>

        <div className="status-pill">Ready for configuration</div>
      </div>

      <div className="proposal-preset-grid">
        <button
          type="button"
          className={preset === "client" ? "preset-card selected" : "preset-card"}
          onClick={() => applyPreset("client")}
        >
          <span>Client Proposal</span>
          <strong>Concise</strong>
          <p>Plain-English proposal suitable for most client reviews.</p>
        </button>

        <button
          type="button"
          className={preset === "professional" ? "preset-card selected" : "preset-card"}
          onClick={() => applyPreset("professional")}
        >
          <span>Professional Report</span>
          <strong>Detailed</strong>
          <p>More detailed analysis for sophisticated clients and accountants.</p>
        </button>

        <button
          type="button"
          className={preset === "institutional" ? "preset-card selected" : "preset-card"}
          onClick={() => applyPreset("institutional")}
        >
          <span>Institutional Proposal</span>
          <strong>Complete</strong>
          <p>Full investment committee evidence, governance and appendices.</p>
        </button>
      </div>

      <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)", alignItems: "start", marginTop: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {Object.entries(groupedSections).map(([category, sections]) => (
            <div key={category} className="ui-item-card">
              <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 10px" }}>
                {categoryLabels[category as ProposalSection["category"]]}
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {sections.map((section) => {
                  const isSelected = selectedSectionIds.includes(section.id);

                  return (
                    <label
                      key={section.id}
                      className={
                        isSelected
                          ? "proposal-section-option selected"
                          : "proposal-section-option"
                      }
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSection(section.id)}
                      />

                      <span>
                        <strong>{section.title}</strong>
                        <small>{section.description}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <aside className="ui-item-card" style={{ position: "sticky", top: "20px" }}>
          <p style={{ fontSize: "0.7rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, margin: 0 }}>
            Live Proposal Summary
          </p>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "6px 0 14px" }}>
            {proposal.title}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
            <SummaryMetric label="Proposal Version" value={proposal.version} />
            <SummaryMetric label="Sections Selected" value={String(proposal.sectionCount)} />
            <SummaryMetric label="Estimated Pages" value={String(estimatedPages)} />
            <SummaryMetric label="Proposal Type" value={preset} />
            <SummaryMetric
              label="Status"
              value={selectedSectionIds.length > 0 ? "Ready" : "Incomplete"}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ fontSize: "0.8rem", fontWeight: 700, margin: "0 0 8px" }}>
              Selected Outline
            </h4>

            {proposal.selectedSections.length > 0 ? (
              <ol style={{ paddingLeft: "18px", fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {proposal.selectedSections.map((section) => (
                  <li key={section.id}>{section.title}</li>
                ))}
              </ol>
            ) : (
              <p className="muted" style={{ fontSize: "0.8rem" }}>
                Select at least one section to generate a proposal.
              </p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button type="button" className="ui-button ui-button-secondary">
              Preview Proposal
            </button>
            <button
              type="button"
              className="ui-button"
              disabled={selectedSectionIds.length === 0}
            >
              Generate Proposal
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
