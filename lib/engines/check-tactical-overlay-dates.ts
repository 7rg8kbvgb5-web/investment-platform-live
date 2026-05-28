import type { TacticalOverlay } from '../../domain/types/allocation';
import type {
  TacticalOverlayDateWarning,
} from '../../domain/types/overlay-governance';

export type {
  TacticalOverlayDateLevel,
  TacticalOverlayDateWarning,
} from '../../domain/types/overlay-governance';

function toDateOnly(value: string): Date | null {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function getCurrentDateOnly(currentDate?: string): Date {
  if (currentDate) {
    const parsed = toDateOnly(currentDate);

    if (parsed) {
      return parsed;
    }
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function checkTacticalOverlayDates(
  overlays: TacticalOverlay[],
  currentDate?: string
): TacticalOverlayDateWarning[] {
  const warnings: TacticalOverlayDateWarning[] = [];
  const today = getCurrentDateOnly(currentDate);

  for (const overlay of overlays) {
    const assetClass = overlay.asset_class;

    if (overlay.expiryDate) {
      const expiry = toDateOnly(overlay.expiryDate);

      if (expiry && expiry < today) {
        warnings.push({
          level: 'error',
          message: `Tactical overlay for ${assetClass} expired on ${overlay.expiryDate}`,
          assetClass,
          expiryDate: overlay.expiryDate,
          reviewDate: overlay.reviewDate,
        });
      }
    }

    if (overlay.reviewDate) {
      const review = toDateOnly(overlay.reviewDate);

      if (review && review <= today) {
        warnings.push({
          level: 'warning',
          message: `Tactical overlay for ${assetClass} is due for review (review date: ${overlay.reviewDate})`,
          assetClass,
          reviewDate: overlay.reviewDate,
          expiryDate: overlay.expiryDate,
        });
      }
    }
  }

  return warnings;
}
