import { getModelPortfolioByRiskProfile, type RiskProfile } from './model-portfolios';
import { securityMasterData } from '../../domain/types/security-master-data';

export type ModelPortfolioHealthStatus = 'champion' | 'challenger' | 'not-assessed';

export type ModelPortfolioHealthItem = {
  code: string;
  name: string;
  assetClass: string;
  status: ModelPortfolioHealthStatus;
  detail: string;
};

export type ModelPortfolioHealth = {
  riskProfile: RiskProfile;
  totalHoldings: number;
  championCount: number;
  challengerCount: number;
  notAssessedCount: number;
  /** Champions as a share of all holdings - the only status that confirms best-in-class. */
  healthScore: number;
  actionItems: ModelPortfolioHealthItem[];
};

export function analyzeModelPortfolioHealth(riskProfile: RiskProfile): ModelPortfolioHealth {
  const portfolio = getModelPortfolioByRiskProfile(riskProfile);
  const securityByCode = new Map(securityMasterData.map((s) => [s.code, s]));

  const items: ModelPortfolioHealthItem[] = [];

  for (const assetClass of portfolio.assetClasses) {
    for (const holding of assetClass.holdings) {
      const security = securityByCode.get(holding.code);

      if (!security) {
        items.push({
          code: holding.code,
          name: holding.name,
          assetClass: assetClass.name,
          status: 'not-assessed',
          detail: 'Not yet reviewed against the Approved List - no best-in-class confirmation on file.',
        });
        continue;
      }

      if (security.championStatus === 'champion') {
        items.push({
          code: holding.code,
          name: holding.name,
          assetClass: assetClass.name,
          status: 'champion',
          detail: `Confirmed best-in-class - ${security.recommendation}, conviction ${security.convictionScore}/5.`,
        });
      } else {
        items.push({
          code: holding.code,
          name: holding.name,
          assetClass: assetClass.name,
          status: 'challenger',
          detail: `Challenger status - under review against the current champion (${security.recommendation}, conviction ${security.convictionScore}/5).`,
        });
      }
    }
  }

  const championCount = items.filter((i) => i.status === 'champion').length;
  const challengerCount = items.filter((i) => i.status === 'challenger').length;
  const notAssessedCount = items.filter((i) => i.status === 'not-assessed').length;
  const totalHoldings = items.length;

  return {
    riskProfile,
    totalHoldings,
    championCount,
    challengerCount,
    notAssessedCount,
    healthScore: totalHoldings > 0 ? Math.round((championCount / totalHoldings) * 100) : 0,
    actionItems: items.filter((i) => i.status !== 'champion'),
  };
}
