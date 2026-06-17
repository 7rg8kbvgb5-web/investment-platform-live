export interface ModelPortfolioVersion {
    id: string
    portfolioName: string
    version: string
    approvalDate: string
    approvedBy: string
    changeSummary: string
  }
  
  export function getModelPortfolioVersions(): ModelPortfolioVersion[] {
    return [
      {
        id: "growth-v1",
        portfolioName: "High Growth Portfolio",
        version: "1.0",
        approvalDate: "2026-01-15",
        approvedBy: "Investment Committee",
        changeSummary: "Initial approved model portfolio"
      },
      {
        id: "growth-v2",
        portfolioName: "High Growth Portfolio",
        version: "2.0",
        approvalDate: "2026-05-30",
        approvedBy: "Investment Committee",
        changeSummary:
          "Increased international equities and reduced cash allocation"
      }
    ]
  }
  export interface ModelPortfolioVersionChange {
    field: string
    previousValue: string
    newValue: string
    rationale: string
  }
  
  export function compareModelPortfolioVersions(): ModelPortfolioVersionChange[] {
    return [
      {
        field: "International Equities",
        previousValue: "20%",
        newValue: "25%",
        rationale: "Increase global diversification and reduce domestic concentration"
      },
      {
        field: "Cash",
        previousValue: "5%",
        newValue: "2.5%",
        rationale: "Deploy excess cash into long-term growth assets"
      },
      {
        field: "Australian Equities",
        previousValue: "45%",
        newValue: "42.5%",
        rationale: "Slight reduction to fund international equity increase"
      }
    ]
  }
  export function getLatestModelPortfolioVersion(): ModelPortfolioVersion {
    const versions = getModelPortfolioVersions()
  
    return versions[versions.length - 1]
  }