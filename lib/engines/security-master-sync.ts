import type { InvestmentCase } from "../../domain/types/investment-case";
import type { SecurityMaster } from "../../domain/types/security-master";

export function canSyncInvestmentCaseToSecurityMaster(
  investmentCase: InvestmentCase
): boolean {
  return investmentCase.status === "Approved";
}

export function buildSecurityMasterCandidateFromInvestmentCase(
  investmentCase: InvestmentCase
): SecurityMaster {
  return {
    id: investmentCase.id,
    code: investmentCase.fundName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: investmentCase.fundName,
    type: "fund",
    sector: "Diversified",
    approvalStatus: "approved",
    recommendation: "buy",
    convictionScore: investmentCase.priority === "Critical" ? 5 : 4,
    houseView: "positive",
    championStatus: "approved-holding",
    reviewDate: investmentCase.updatedAt.slice(0, 10),
  };
}