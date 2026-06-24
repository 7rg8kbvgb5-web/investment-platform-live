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
import { PortfolioDriftMonitoringPanel } from '../../components/PortfolioDriftMonitoringPanel';
import { DriftAlertsPanel } from '../../components/DriftAlertsPanel';
import { ModelPortfolioVersioningPanel } from '../../components/ModelPortfolioVersioningPanel';
import { ModelPortfolioApprovalPanel } from '../../components/ModelPortfolioApprovalPanel';
import { ModelPortfolioChangeAuditPanel } from '../../components/ModelPortfolioChangeAuditPanel';
import SectorHealthScorePanel from "../../components/SectorHealthScorePanel";
import SecurityRankingPanel from "../../components/SecurityRankingPanel";
import SectorAllocationPanel from "../../components/SectorAllocationPanel";
import { PortfolioConstructionAuditPanel } from "../../components/PortfolioConstructionAuditPanel";
import { PortfolioValidationPanel } from "../../components/PortfolioValidationPanel";
import { PortfolioApprovalReadinessPanel } from "../../components/PortfolioApprovalReadinessPanel";
import { ClientPortfolioAnalysisPanel } from "../../components/ClientPortfolioAnalysisPanel";
import { ClientRebalanceRecommendationsPanel } from "../../components/ClientRebalanceRecommendationsPanel";
import { InvestmentProposalPanel } from "../../components/InvestmentProposalPanel";
import { buildClientAdviceWorkflow } from "../../lib/engines/client-advice-workflow";
import PortfolioWorkspace from "../../components/PortfolioWorkspace";

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
        description="Strategic allocations, tactical overlays, guardrails, and portfolio simulation workflows by risk profile."
      >
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

  riskProfiles={
    <>
      <RiskProfilePortfolioPanel />
  
      <PortfolioDriftMonitoringPanel />
  
      <DriftAlertsPanel />
    </>
  }

  clientAdvice={
    <>
    <ClientPortfolioAnalysisPanel analysis={clientAdviceWorkflow.analysis} />

    <ClientPortfolioMappingPanel />

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
      
        {profiles?.map((profile) => {
          const {
            adjustedAllocations: profileAllocations,
            totalWeight,
            growthTotal,
            defensiveTotal,
            status,
            guardrailWarnings,
            tacticalOverlayDateWarnings,
          } = buildPortfolioState({
            riskProfileName: profile.name,
            strategicAllocations: allocations || [],
            tacticalOverlays: overlays || [],
          });

          return (
            <section key={profile.id} style={profileCard}>
              <ProfileCardHeader
                name={profile.name}
                description={profile.description}
                growthAssets={profile.growth_assets}
                defensiveAssets={profile.defensive_assets}
              />

              <ProfileSummaryGrid
                totalWeight={totalWeight}
                growthTotal={growthTotal}
                defensiveTotal={defensiveTotal}
                status={status}
              />

              {profileAllocations.length === 0 ? (
                <StatusBox variant="warning">
                  No allocation rows found for this risk profile.
                </StatusBox>
              ) : (
                <>
                  <ProfileChartsSection
                    allocations={profileAllocations}
                    growthTotal={growthTotal}
                    defensiveTotal={defensiveTotal}
                  />

                  <ProfileAllocationTable allocations={profileAllocations} />
                </>
              )}

              <GuardrailsPanel warnings={guardrailWarnings} />
              <OverlayGovernancePanel warnings={tacticalOverlayDateWarnings} />
              <ResetToStrategicPanel
                strategicAllocations={allocations || []}
                tacticalOverlays={overlays || []}
                riskProfileName={profile.name}
              />
              <PortfolioSimulationWorkflow
                strategicAllocations={allocations || []}
                tacticalOverlays={overlays || []}
                riskProfileName={profile.name}
              />
            </section>
          );
        })}
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
