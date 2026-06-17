export interface ModelPortfolioChangeAuditEntry {
    id: string
    portfolioName: string
    version: string
    changedField: string
    previousValue: string
    newValue: string
    changedBy: string
    approvedBy: string
    timestamp: string
    reason: string
  }
  
  export function getModelPortfolioChangeAudit(): ModelPortfolioChangeAuditEntry[] {
    return [
      {
        id: "audit-001",
        portfolioName: "High Growth Portfolio",
        version: "2.0",
        changedField: "International Equities",
        previousValue: "20%",
        newValue: "25%",
        changedBy: "Portfolio Management Team",
        approvedBy: "Investment Committee",
        timestamp: "2026-05-30T10:00:00.000Z",
        reason: "Increase global diversification and reduce domestic concentration",
      },
      {
        id: "audit-002",
        portfolioName: "High Growth Portfolio",
        version: "2.0",
        changedField: "Cash",
        previousValue: "5%",
        newValue: "2.5%",
        changedBy: "Portfolio Management Team",
        approvedBy: "Investment Committee",
        timestamp: "2026-05-30T10:05:00.000Z",
        reason: "Deploy excess cash into long-term growth assets",
      },
      {
        id: "audit-003",
        portfolioName: "High Growth Portfolio",
        version: "2.0",
        changedField: "Australian Equities",
        previousValue: "45%",
        newValue: "42.5%",
        changedBy: "Portfolio Management Team",
        approvedBy: "Investment Committee",
        timestamp: "2026-05-30T10:10:00.000Z",
        reason: "Slight reduction to fund international equity increase",
      },
    ]
  }