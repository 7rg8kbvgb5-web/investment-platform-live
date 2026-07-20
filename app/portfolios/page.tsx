import PageContent from '../../components/PageContent';
import { RiskProfilePortfolioPanel } from '../../components/RiskProfilePortfolioPanel';
import { ClientPortfolioMappingPanel } from '../../components/ClientPortfolioMappingPanel';
import { ModelPortfolioVersioningPanel } from '../../components/ModelPortfolioVersioningPanel';
import { ModelPortfolioApprovalPanel } from '../../components/ModelPortfolioApprovalPanel';
import { ModelPortfolioChangeAuditPanel } from '../../components/ModelPortfolioChangeAuditPanel';
import SectorHealthScorePanel from '../../components/SectorHealthScorePanel';
import { PortfolioConstitutionPanel } from '../../components/PortfolioConstitutionPanel';
import { PortfolioApprovalReadinessPanel } from '../../components/PortfolioApprovalReadinessPanel';
import { ClientPortfolioAnalysisPanel } from '../../components/ClientPortfolioAnalysisPanel';
import { ClientRebalanceRecommendationsPanel } from '../../components/ClientRebalanceRecommendationsPanel';
import { InvestmentProposalPanel } from '../../components/InvestmentProposalPanel';
import { buildClientAdviceWorkflow } from '../../lib/engines/client-advice-workflow';
import PortfolioWorkspace from '../../components/PortfolioWorkspace';
import ClientPortfolioUploadPanel from '../../components/ClientPortfolioUploadPanel';
import { PortfolioDriftMonitoringPanel } from '../../components/PortfolioDriftMonitoringPanel';
import { DriftAlertsPanel } from '../../components/DriftAlertsPanel';
import AdviserCommandCentreHeader from '../../components/AdviserCommandCentreHeader'
import AdviserCommandCentreDashboard from '../../components/AdviserCommandCentreDashboard'
import WorkflowProgressPanel from '../../components/WorkflowProgressPanel';
import ProposalPipelinePanel from '../../components/ProposalPipelinePanel';
import DashboardGrid from '../../components/ui/DashboardGrid';
import AdviserPrioritiesPanel from '../../components/AdviserPrioritiesPanel';

export default function PortfoliosPage() {
  const clientAdviceWorkflow = buildClientAdviceWorkflow();

  return (
    <PageContent
      title="Portfolios"
      description="Build model portfolios, review risk profiles, analyse client holdings and govern portfolio changes."
    >
      <AdviserCommandCentreHeader />
      <AdviserCommandCentreDashboard />
      <DashboardGrid>
        <WorkflowProgressPanel />
        <ProposalPipelinePanel />
        <AdviserPrioritiesPanel />
      </DashboardGrid>
      <PortfolioWorkspace
        construction={
          <>
            <PortfolioConstitutionPanel />
          </>
        }
        analytics={<SectorHealthScorePanel />}
        riskProfiles={<RiskProfilePortfolioPanel />}
        clientAdvice={
          <>
            <ClientPortfolioUploadPanel />

            <ClientPortfolioMappingPanel />

            <ClientPortfolioAnalysisPanel
              analysis={clientAdviceWorkflow.analysis}
            />

            <PortfolioDriftMonitoringPanel />

            <DriftAlertsPanel />

            <ClientRebalanceRecommendationsPanel
              recommendations={clientAdviceWorkflow.rebalanceRecommendations}
            />

            <InvestmentProposalPanel
              proposal={clientAdviceWorkflow.proposal}
              approvalReadiness={clientAdviceWorkflow.approvalReadiness}
            />

            <PortfolioApprovalReadinessPanel />
          </>
        }
        governance={
          <>
            <ModelPortfolioVersioningPanel />
            <ModelPortfolioApprovalPanel />
            <ModelPortfolioChangeAuditPanel />
          </>
        }
      />
    </PageContent>
  );
}
