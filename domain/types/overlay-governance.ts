import type { SeverityLevel } from './severity';

export type TacticalOverlayDateLevel = SeverityLevel;

export type TacticalOverlayDateWarning = {
  level: TacticalOverlayDateLevel;
  message: string;
  assetClass?: string;
  reviewDate?: string;
  expiryDate?: string;
};
