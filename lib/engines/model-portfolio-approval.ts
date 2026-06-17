export interface ModelPortfolioApproval {
    portfolioName: string
    version: string
    status: "Draft" | "Pending Approval" | "Approved" | "Rejected"
    submittedBy: string
    reviewedBy: string | null
    effectiveDate: string
    committeeNotes: string | null
  }
  
  export function getModelPortfolioApproval(): ModelPortfolioApproval {
    return {
      portfolioName: "High Growth Portfolio",
      version: "2.0",
      status: "Pending Approval",
      submittedBy: "Portfolio Management Team",
      reviewedBy: null,
      effectiveDate: "2026-07-01",
      committeeNotes: null,
    }
  }