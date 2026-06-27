export interface DashboardSummary {
    portfolioHealth: number
    clientsNeedingReview: number
    proposalsPending: number
    researchRequests: number
    investmentCases: number
    governanceApprovals: number
    modelUpdates: number
    houseViewChanges: number
  }
  
  export function buildDashboardSummary(): DashboardSummary {
    return {
      portfolioHealth: 91,
      clientsNeedingReview: 4,
      proposalsPending: 2,
      researchRequests: 8,
      investmentCases: 3,
      governanceApprovals: 2,
      modelUpdates: 1,
      houseViewChanges: 5,
    }
  }