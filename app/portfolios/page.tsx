import PageContent from '../../components/PageContent';
import { PortfolioConstitutionPanel } from '../../components/PortfolioConstitutionPanel';
import { ModelPortfolioSecuritiesPanel } from '../../components/ModelPortfolioSecuritiesPanel';
import PortfolioWorkspace from '../../components/PortfolioWorkspace';
import ClientPortfolioUploadPanel from '../../components/ClientPortfolioUploadPanel';
import ModelVersionPanel from '../../components/ModelVersionPanel';
import ClientAdvicePanel from '../../components/ClientAdvicePanel';
import { ClientAdviceProvider } from '../../components/ClientAdviceContext';

export const dynamic = 'force-dynamic';

export default function PortfoliosPage() {
  return (
    <PageContent
      title="Portfolios"
      description="Define each risk profile's model portfolio, bring a specific client's holdings in line with it, and build the reasoning behind the proposal."
    >
      <ClientAdviceProvider>
        <PortfolioWorkspace
          modelPortfolio={
            <>
              <ModelVersionPanel />
              <ModelPortfolioSecuritiesPanel />
            </>
          }
          riskProfile={
            <>
              <ModelVersionPanel />
              <PortfolioConstitutionPanel />
            </>
          }
          construction={<ClientPortfolioUploadPanel />}
          clientAdvice={<ClientAdvicePanel />}
        />
      </ClientAdviceProvider>
    </PageContent>
  );
}
