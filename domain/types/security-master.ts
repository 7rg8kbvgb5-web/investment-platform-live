export type SecurityType =
  | "equity"
  | "etf"
  | "fund"
  | "bond"
  | "alternative";

export type ApprovalStatus =
  | "approved"
  | "watchlist"
  | "under-review"
  | "restricted"
  | "removed";

export type Recommendation =
  | "strong-buy"
  | "buy"
  | "hold"
  | "reduce"
  | "sell";

export type HouseView =
  | "strong-positive"
  | "positive"
  | "neutral"
  | "negative"
  | "strong-negative";

  export type ChampionStatus =
  | "champion"
  | "challenger"
  | "approved-holding"
  | "none";

export interface SecurityMaster {
  id: string;
  code: string;
  name: string;
  type: SecurityType;
  sector: string;
  approvalStatus: ApprovalStatus;
  recommendation: Recommendation;
  convictionScore: number;
  houseView: HouseView;
  championStatus: ChampionStatus;
  reviewDate: string;
  notes?: string;
}