import {
    analyseClientPortfolio,
    type ClientPortfolioAnalysis,
  } from "./client-portfolio-analysis";
  
  import {
    generateClientRebalanceRecommendations,
    type ClientRebalanceRecommendation,
  } from "./client-rebalance-recommendations";
  
  import {
    generateInvestmentProposal,
    type InvestmentProposal,
  } from "./investment-proposal-generator";
  
  import {
    evaluateApprovalReadiness,
    type PortfolioApprovalReadiness,
  } from "./portfolio-approval-readiness";
  
  export type ClientAdviceWorkflowState = {
    analysis: ClientPortfolioAnalysis;
    rebalanceRecommendations: ClientRebalanceRecommendation[];
    approvalReadiness: PortfolioApprovalReadiness;
    proposal: InvestmentProposal;
  };
  
  export function buildClientAdviceWorkflow(): ClientAdviceWorkflowState {
    const analysis = analyseClientPortfolio();
    const rebalanceRecommendations = generateClientRebalanceRecommendations();
    const approvalReadiness = evaluateApprovalReadiness();
    const proposal = generateInvestmentProposal();
  
    return {
      analysis,
      rebalanceRecommendations,
      approvalReadiness,
      proposal,
    };
  }