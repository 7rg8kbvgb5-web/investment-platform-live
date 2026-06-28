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
    <section className="panel proposal-v3-panel">
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

      <div className="proposal-builder-layout">
        <div className="proposal-section-selector">
          {Object.entries(groupedSections).map(([category, sections]) => (
            <div key={category} className="proposal-section-group">
              <h3>{categoryLabels[category as ProposalSection["category"]]}</h3>

              <div className="proposal-section-list">
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

        <aside className="proposal-summary-card">
          <p className="eyebrow">Live Proposal Summary</p>
          <h3>{proposal.title}</h3>

          <div className="summary-metric">
            <span>Proposal Version</span>
            <strong>{proposal.version}</strong>
          </div>

          <div className="summary-metric">
            <span>Sections Selected</span>
            <strong>{proposal.sectionCount}</strong>
          </div>

          <div className="summary-metric">
            <span>Estimated Pages</span>
            <strong>{estimatedPages}</strong>
          </div>

          <div className="summary-metric">
            <span>Proposal Type</span>
            <strong>{preset}</strong>
          </div>

          <div className="summary-metric">
            <span>Status</span>
            <strong>{selectedSectionIds.length > 0 ? "Ready" : "Incomplete"}</strong>
          </div>

          <div className="proposal-outline">
            <h4>Selected Outline</h4>

            {proposal.selectedSections.length > 0 ? (
              <ol>
                {proposal.selectedSections.map((section) => (
                  <li key={section.id}>{section.title}</li>
                ))}
              </ol>
            ) : (
              <p className="muted">Select at least one section to generate a proposal.</p>
            )}
          </div>

          <div className="proposal-actions">
            <button type="button" className="secondary-button">
              Preview Proposal
            </button>
            <button
              type="button"
              className="primary-button"
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