import {
    getWorkflowProgressSummary,
    workflowStages,
    type WorkflowStageStatus,
} from "../lib/engines/workflow-progress";
  
  function getStatusSymbol(status: WorkflowStageStatus) {
    if (status === "complete") return "✓";
    if (status === "active") return "●";
    return "○";
  }
  
  export default function WorkflowProgressPanel() {
    const summary = getWorkflowProgressSummary(workflowStages);
  
    return (
      <section className="workflow-progress-panel">
        <div className="workflow-progress-header">
          <div>
            <p className="section-eyebrow">Adviser Workflow</p>
            <h2>Workflow Progress</h2>
            <p>
              Tracks where the current advice case sits across the institutional
              investment process.
            </p>
          </div>
  
          <div className="workflow-progress-summary">
            <strong>{summary.progressPercentage}%</strong>
            <span>Complete</span>
          </div>
        </div>
  
        <div className="workflow-progress-active">
          <span>Current stage</span>
          <strong>{summary.activeStageLabel}</strong>
        </div>
  
        <div className="workflow-stage-list">
          {workflowStages.map((stage) => (
            <div
              key={stage.id}
              className={`workflow-stage workflow-stage-${stage.status}`}
            >
              <div className="workflow-stage-marker">
                {getStatusSymbol(stage.status)}
              </div>
  
              <div>
                <h3>{stage.label}</h3>
                <p>{stage.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }