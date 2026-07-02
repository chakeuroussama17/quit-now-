import type { UserProfile } from '@/types/models';

/**
 * The moment the current smoke-free clock started: the later of the quit date
 * (cold turkey) / program start (gradual) and the most recent smoke log.
 * `pending` = the chosen quit day is still in the future.
 */
export function streakStart(
  profile: UserProfile,
  lastSmokeAt: string | null,
  now = Date.now(),
): { startMs: number; pending: boolean } {
  const anchor =
    profile.quitMode === 'cold_turkey' && profile.quitDate
      ? new Date(profile.quitDate).getTime()
      : new Date(profile.programStartDate).getTime();
  const lastSmoke = lastSmokeAt ? new Date(lastSmokeAt).getTime() : 0;
  const startMs = Math.max(anchor, lastSmoke);
  return { startMs, pending: startMs > now };
}
