/** Stable mock timestamp for local simulation / preview metadata (SSR-safe). */
export const PREVIEW_TIMESTAMP = '2026-06-09T12:00:00.000Z';

/** Stable mock date (YYYY-MM-DD) for local preview metadata (SSR-safe). */
export const PREVIEW_DATE = '2026-06-09';

const UTC_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Deterministic UTC display — avoids locale/timezone SSR vs client drift. */
export function formatIsoTimestampDisplay(
  iso: string | null | undefined
): string {
  if (!iso) {
    return '—';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const day = date.getUTCDate();
  const month = UTC_MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes} UTC`;
}
