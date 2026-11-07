import PageContent from '../../components/PageContent';
import { PortfolioConstitutionPanel } from '../../components/PortfolioConstitutionPanel';
import { ModelPortfolioSecuritiesPanel } from '../../components/ModelPortfolioSecuritiesPanel';
import PortfolioWorkspace from '../../components/PortfolioWorkspace';
import ClientPortfolioUploadPanel from '../../components/ClientPortfolioUploadPanel';
import ClientAdvicePlaceholder from '../../components/ClientAdvicePlaceholder';
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
          modelPortfolio={<ModelPortfolioSecuritiesPanel />}
          riskProfile={<PortfolioConstitutionPanel />}
          construction={<ClientPortfolioUploadPanel />}
          clientAdvice={<ClientAdvicePlaceholder />}
        />
      </ClientAdviceProvider>
    </PageContent>
  );
}
