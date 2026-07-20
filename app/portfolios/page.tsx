import PageContent from '../../components/PageContent';
import { ModelPortfolioVersioningPanel } from '../../components/ModelPortfolioVersioningPanel';
import { ModelPortfolioApprovalPanel } from '../../components/ModelPortfolioApprovalPanel';
import { ModelPortfolioChangeAuditPanel } from '../../components/ModelPortfolioChangeAuditPanel';
import SectorHealthScorePanel from '../../components/SectorHealthScorePanel';
import PortfolioAnalyticsPanel from '../../components/PortfolioAnalyticsPanel';
import { PortfolioConstitutionPanel } from '../../components/PortfolioConstitutionPanel';
import { PortfolioApprovalReadinessPanel } from '../../components/PortfolioApprovalReadinessPanel';
import { InvestmentProposalPanel } from '../../components/InvestmentProposalPanel';
import { buildClientAdviceWorkflow } from '../../lib/engines/client-advice-workflow';
import PortfolioWorkspace from '../../components/PortfolioWorkspace';
import ClientPortfolioUploadPanel from '../../components/ClientPortfolioUploadPanel';
import ModelPortfolioHealthPanel from '../../components/ModelPortfolioHealthPanel';
import { ClientAdviceProvider } from '../../components/ClientAdviceContext';

export const dynamic = 'force-dynamic';

export default function PortfoliosPage() {
  const clientAdviceWorkflow = buildClientAdviceWorkflow();

  return (
    <PageContent
      title="Portfolios"
      description="Build model portfolios, review risk profiles, analyse client holdings and govern portfolio changes."
    >
      <ClientAdviceProvider>
        <ModelPortfolioHealthPanel />

        <PortfolioWorkspace
          construction={
            <>
              <PortfolioConstitutionPanel />
            </>
          }
          analytics={
            <>
              <SectorHealthScorePanel />
              <PortfolioAnalyticsPanel />
            </>
          }
          riskProfiles={<ClientPortfolioUploadPanel />}
          clientAdvice={
            <>
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
      </ClientAdviceProvider>
    </PageContent>
  );
}
