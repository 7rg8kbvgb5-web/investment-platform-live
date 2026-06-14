import { securityMasterData } from "../../domain/types/security-master-data";
import type { ApprovedListSecurity } from "../../domain/types/approved-list";

export function buildApprovedList(): ApprovedListSecurity[] {
  return securityMasterData.map((security) => ({
    ...security,
    approvedListStatus:
      security.approvalStatus === "approved"
        ? "approved"
        : security.approvalStatus === "watchlist"
        ? "watchlist"
        : security.approvalStatus === "restricted"
        ? "restricted"
        : "not-approved",
        approvedListCategory:
        security.championStatus === "none"
          ? "watchlist"
          : security.championStatus,
    approvedListReason:
      security.houseView === "positive" ||
      security.houseView === "strong-positive"
        ? "Approved due to positive House View, investment relevance and current research coverage."
        : "Included for monitoring, research review or portfolio construction consideration.",
  }));
}