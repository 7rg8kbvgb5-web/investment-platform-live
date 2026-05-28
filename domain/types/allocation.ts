export type StrategicAllocation = {
  id: number | string;
  risk_profile: string;
  asset_class: string;
  target_weight: number | string;
  min_weight: number | string;
  max_weight: number | string;
  classification: string;
};

export type TacticalOverlay = {
  id: number | string;
  risk_profile: string;
  asset_class: string;
  tactical_adjustment: number | string | null;
  reason: string | null;
  status: string;
  reviewDate?: string;
  expiryDate?: string;
  rationale?: string;
};

export type AllocationWithOverlay = StrategicAllocation & {
  tactical_adjustment: number;
  final_weight: number;
  overlay_reason: string | null;
};
