import { supabase } from '../../lib/supabase';
import { buildPortfolioState } from '../../lib/engines/build-portfolio-state';
import PageContent from '../../components/PageContent';
import DashboardHero from '../../components/dashboard/DashboardHero';
import ProfileCardHeader from '../../components/dashboard/ProfileCardHeader';
import ProfileSummaryGrid from '../../components/dashboard/ProfileSummaryGrid';
import ProfileChartsSection from '../../components/dashboard/ProfileChartsSection';
import ProfileAllocationTable from '../../components/dashboard/ProfileAllocationTable';
import GuardrailsPanel from '../../components/dashboard/GuardrailsPanel';
import OverlayGovernancePanel from '../../components/dashboard/OverlayGovernancePanel';
import ResetToStrategicPanel from '../../components/dashboard/ResetToStrategicPanel';
import PortfolioSimulationWorkflow from '../../components/dashboard/PortfolioSimulationWorkflow';
import StatusBox from '../../components/dashboard/StatusBox';
import { PortfolioCandidatesPanel } from '../../components/PortfolioCandidatesPanel';
import { ChampionChallengerPortfolioPanel } from '../../components/ChampionChallengerPortfolioPanel';
import { SectorConstructionPanel } from '../../components/SectorConstructionPanel';
import { RiskProfilePortfolioPanel } from '../../components/RiskProfilePortfolioPanel';
import { ClientPortfolioMappingPanel } from '../../components/ClientPortfolioMappingPanel';
import { ModelPortfolioVersioningPanel } from '../../components/ModelPortfolioVersioningPanel';
import { ModelPortfolioApprovalPanel } from '../../components/ModelPortfolioApprovalPanel';
import { ModelPortfolioChangeAuditPanel } from '../../components/ModelPortfolioChangeAuditPanel';
import SectorHealthScorePanel from '../../components/SectorHealthScorePanel';
import SecurityRankingPanel from '../../components/SecurityRankingPanel';
import SectorAllocationPanel from '../../components/SectorAllocationPanel';
import { PortfolioConstructionAuditPanel } from '../../components/PortfolioConstructionAuditPanel';
import { PortfolioValidationPanel } from '../../components/PortfolioValidationPanel';
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

export default async function PortfoliosPage() {
  const { data: profiles } = await supabase
    .from('risk_profiles')
    .select('*')
    .order('id');

  const { data: overlays } = await supabase
    .from('tactical_overlays')
    .select('*')
    .order('id');

  const { data: allocations } = await supabase
    .from('strategic_allocations')
    .select('*')
    .order('id');

  const clientAdviceWorkflow = buildClientAdviceWorkflow();

  return (
    <>
      <DashboardHero />

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
              <SectorHealthScorePanel />
              <SecurityRankingPanel />
              <SectorAllocationPanel />
              <PortfolioCandidatesPanel />
              <ChampionChallengerPortfolioPanel />
              <SectorConstructionPanel />
              <PortfolioConstructionAuditPanel />
              <PortfolioValidationPanel />
            </>
          }
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
    </>
  );
}

const profileCard = {
  marginBottom: '35px',
  padding: '30px',
  background: '#04142b',
  borderRadius: '18px',
  border: '1px solid #1e3a5f',
};