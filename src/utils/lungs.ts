/** Lungs reach 100% "recovered" after 30 smoke-free days. */
export const LUNG_FULL_DAYS = 30;
const LUNG_FULL_MS = LUNG_FULL_DAYS * 24 * 3_600_000;

/**
 * 0–1 fill level from the smoke-free duration. Because it's a continuous
 * ratio of milliseconds, the liquid creeps up every single hour — the user
 * sees real, visible movement day to day.
 */
export function lungFillProgress(streakMs: number): number {
  if (streakMs <= 0) return 0;
  return Math.min(1, streakMs / LUNG_FULL_MS);
}

/** Whole-percent for display. */
export function lungFillPercent(streakMs: number): number {
  return Math.floor(lungFillProgress(streakMs) * 100);
}
