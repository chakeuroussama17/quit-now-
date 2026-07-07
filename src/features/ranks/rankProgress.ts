import { RANKS, type Rank } from './game';

export interface RankProgress {
  current: Rank | null;
  next: Rank | null;
  /** 0–1 from the current rank's threshold to the next rank's. */
  progress: number;
  daysToNext: number;
}

/** Where a streak of `days` sits on the rank ladder, and how far to the next. */
export function rankProgress(days: number): RankProgress {
  const d = Math.floor(days);
  let currentIdx = -1;
  for (let i = 0; i < RANKS.length; i++) {
    if (d >= RANKS[i].day) currentIdx = i;
  }
  const current = currentIdx >= 0 ? RANKS[currentIdx] : null;
  const next = RANKS[currentIdx + 1] ?? null;
  if (!next) return { current, next: null, progress: 1, daysToNext: 0 };

  const prevDay = current ? current.day : 0;
  const progress = Math.min(1, Math.max(0, (d - prevDay) / (next.day - prevDay)));
  return { current, next, progress, daysToNext: Math.max(0, next.day - d) };
}
