import {
    getProposalStageLabel,
    proposalPipelineItems,
    type ProposalStage,
  } from "../lib/engines/proposal-pipeline";
  import Panel from "./ui/Panel";
  
  function getStageClass(stage: ProposalStage) {
    return `proposal-stage proposal-stage-${stage}`;
  }
  
  export default function ProposalPipelinePanel() {
    return (
      <Panel
        eyebrow="Client Advice"
        title="Proposal Pipeline"
      >
        <div className="proposal-pipeline-list">
          {proposalPipelineItems.map((item) => (
            <div key={item.id} className="proposal-pipeline-row">
              <div>
                <h3>{item.clientName}</h3>
                <p>
                  {item.entityType} · Adviser: {item.adviser}
                </p>
              </div>
  
              <div className="proposal-pipeline-meta">
                <span className={getStageClass(item.stage)}>
                  {getProposalStageLabel(item.stage)}
                </span>
                <p>{item.portfolioStatus}</p>
                <small>{item.lastUpdated}</small>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    );
  }