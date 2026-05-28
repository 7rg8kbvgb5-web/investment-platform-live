import type { SeverityLevel } from './severity';

export type TacticalOverlayDateWarning = {
  level: SeverityLevel;
  message: string;
  assetClass?: string;
  reviewDate?: string;
  expiryDate?: string;
};
