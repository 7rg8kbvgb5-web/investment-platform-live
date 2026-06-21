import { validatePortfolioConstruction } from "./portfolio-validation";

export type ApprovalReadinessStatus =
  | "approved"
  | "conditional-approval"
  | "not-approved";

export type PortfolioApprovalReadiness = {
  status: ApprovalReadinessStatus;
  score: number;
  rationale: string;
  requiredActions: string[];
};

export function evaluateApprovalReadiness(): PortfolioApprovalReadiness {
  const validation = validatePortfolioConstruction();

  const hasFailIssue = validation.issues.some(
    (issue) => issue.severity === "fail"
  );

  if (hasFailIssue) {
    return {
      status: "not-approved",
      score: validation.overallScore,
      rationale:
        "One or more critical validation failures must be resolved before investment committee approval.",
      requiredActions: [
        "Resolve all failed validation checks.",
        "Review sector allocation variances.",
        "Re-run portfolio validation before submission.",
      ],
    };
  }

  if (validation.overallScore >= 90) {
    return {
      status: "approved",
      score: validation.overallScore,
      rationale:
        "Portfolio satisfies validation requirements and is ready for investment committee approval.",
      requiredActions: [],
    };
  }

  if (validation.overallScore >= 75) {
    return {
      status: "conditional-approval",
      score: validation.overallScore,
      rationale:
        "Portfolio is broadly acceptable but requires review of outstanding warning items.",
      requiredActions: [
        "Review outstanding warning items.",
        "Document rationale for any exceptions.",
      ],
    };
  }

  return {
    status: "not-approved",
    score: validation.overallScore,
    rationale:
      "Portfolio quality score is below minimum approval threshold.",
    requiredActions: [
      "Improve portfolio quality score.",
      "Address diversification and sector alignment issues.",
    ],
  };
}