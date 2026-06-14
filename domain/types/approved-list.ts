import type { SecurityMaster } from "./security-master";

export type ApprovedListStatus =
  | "approved"
  | "watchlist"
  | "restricted"
  | "not-approved";

export type ApprovedListCategory =
  | "champion"
  | "challenger"
  | "approved-holding"
  | "watchlist"
  | "restricted";

export type ApprovedListSecurity = SecurityMaster & {
  approvedListStatus: ApprovedListStatus;
  approvedListCategory: ApprovedListCategory;
  approvedListReason: string;
};