import { fallbackMotivationForDay } from '@/services/fallbacks';
import type { UserProfile } from '@/types/models';

function dayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/** Offline/instant daily line. Every third day, their own reason — verbatim. */
export function dailyLine(profile: UserProfile): { text: string; isOwnWords: boolean } {
  const day = dayOfYear();
  if (profile.quitReasonText && day % 3 === 0) {
    return { text: `“${profile.quitReasonText}”`, isOwnWords: true };
  }
  return { text: fallbackMotivationForDay(day), isOwnWords: false };
}
