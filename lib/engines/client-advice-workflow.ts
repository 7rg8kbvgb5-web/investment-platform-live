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
  
  export type ClientAdviceWorkflowState = {
    analysis: ClientPortfolioAnalysis;
    rebalanceRecommendations: ClientRebalanceRecommendation[];
    proposal: InvestmentProposal;
  };
  
  export function buildClientAdviceWorkflow(): ClientAdviceWorkflowState {
    const analysis = analyseClientPortfolio();
    const rebalanceRecommendations = generateClientRebalanceRecommendations();
    const proposal = generateInvestmentProposal();
  
    return {
      analysis,
      rebalanceRecommendations,
      proposal,
    };
  }