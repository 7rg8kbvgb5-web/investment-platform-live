export type AdviserPriorityLevel = "critical" | "high" | "medium" | "info";

export type AdviserPriority = {
  id: string;
  title: string;
  description: string;
  level: AdviserPriorityLevel;
};

export const adviserPriorities: AdviserPriority[] = [
  {
    id: "ic-review",
    title: "Investment Committee approval required",
    description: "2 proposals are awaiting committee approval.",
    level: "critical",
  },
  {
    id: "proposal-review",
    title: "Proposal awaiting adviser review",
    description: "Smith Family proposal is ready for review.",
    level: "high",
  },
  {
    id: "portfolio-drift",
    title: "Portfolio drift detected",
    description: "One client portfolio exceeds drift tolerance.",
    level: "medium",
  },
  {
    id: "house-view",
    title: "House View updated",
    description: "Healthcare sector outlook has changed.",
    level: "info",
  },
];