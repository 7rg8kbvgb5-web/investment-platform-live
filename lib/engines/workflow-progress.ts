export type WorkflowStageStatus = "complete" | "active" | "pending";

export type WorkflowStage = {
  id: string;
  label: string;
  description: string;
  status: WorkflowStageStatus;
};

export const workflowStages: WorkflowStage[] = [
  {
    id: "client-imported",
    label: "Client Imported",
    description: "Client portfolio data has been uploaded or entered.",
    status: "complete",
  },
  {
    id: "portfolio-analysed",
    label: "Portfolio Analysed",
    description: "Current holdings have been reviewed against model settings.",
    status: "complete",
  },
  {
    id: "house-view-applied",
    label: "House View Applied",
    description: "Sector and security views have been incorporated.",
    status: "active",
  },
  {
    id: "ic-review",
    label: "Investment Committee Review",
    description: "Recommendations are awaiting governance review.",
    status: "pending",
  },
  {
    id: "proposal-preparation",
    label: "Proposal Preparation",
    description: "Client proposal is being prepared.",
    status: "pending",
  },
  {
    id: "ready-for-presentation",
    label: "Ready for Presentation",
    description: "Advice pack is ready for client discussion.",
    status: "pending",
  },
  {
    id: "implemented",
    label: "Implemented",
    description: "Approved changes have been implemented.",
    status: "pending",
  },
];

export function getWorkflowProgressSummary(stages: WorkflowStage[]) {
  const completedStages = stages.filter((stage) => stage.status === "complete").length;
  const activeStage = stages.find((stage) => stage.status === "active");

  return {
    totalStages: stages.length,
    completedStages,
    activeStageLabel: activeStage?.label ?? "No active stage",
    progressPercentage: Math.round((completedStages / stages.length) * 100),
  };
}