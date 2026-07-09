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

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Lung recovery for GRADUAL reduction, where a clean streak barely exists.
 * Two honest signals, weighted:
 *
 *   • how far below baseline they've cut (last 7 days)  — the real progress
 *   • how long since the last cigarette (up to 48h)     — the immediate repair
 *
 * So the lungs fill steadily as they smoke less, and visibly drop back the
 * moment they log a cigarette (the gap term resets to zero).
 */
export function gradualLungProgress(params: {
  baselinePerDay: number;
  avgPerDayLast7: number;
  msSinceLastSmoke: number;
}): number {
  const { baselinePerDay, avgPerDayLast7, msSinceLastSmoke } = params;

  const reduction = baselinePerDay > 0 ? clamp01(1 - avgPerDayLast7 / baselinePerDay) : 0;
  const gap = clamp01(msSinceLastSmoke / (48 * 3_600_000));

  return clamp01(0.75 * reduction + 0.25 * gap);
}
