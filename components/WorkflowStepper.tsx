export type WorkflowStepStatus = "complete" | "active" | "pending";

export interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  status: WorkflowStepStatus;
  metric?: string;
}

interface WorkflowStepperProps {
  title: string;
  description: string;
  steps: WorkflowStep[];
}

export function WorkflowStepper({
  title,
  description,
  steps,
}: WorkflowStepperProps) {
  return (
    <section className="workflow-panel">
      <div className="workflow-header">
        <div>
          <p className="eyebrow">Workflow</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="workflow-steps">
        {steps.map((step, index) => (
          <div key={step.id} className={`workflow-step ${step.status}`}>
            <div className="workflow-step-marker">
              {step.status === "complete" ? "✓" : index + 1}
            </div>

            <div className="workflow-step-content">
              <div className="workflow-step-title-row">
                <h3>{step.label}</h3>
                {step.metric ? <span>{step.metric}</span> : null}
              </div>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}