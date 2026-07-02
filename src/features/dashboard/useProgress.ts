import { useEffect, useState } from 'react';

import { getQuantitySince } from '@/db/logsRepo';
import { useLogsStore } from '@/state/useLogsStore';
import type { UserProfile } from '@/types/models';
import { baselinePerDay, costPerUnit } from '@/utils/baseline';
import { daysBetween } from '@/utils/time';

export interface Progress {
  /** Sticks / ml / sessions NOT consumed vs the old baseline. */
  unitsAvoided: number;
  moneySaved: number;
  daysElapsed: number;
}

/**
 * Shared progress numbers for the dashboard cards. Recomputes whenever a new
 * log lands (todaySmokedCount/lastSmokeAt changes re-trigger the query).
 */
export function useProgress(profile: UserProfile): Progress {
  const todaySmokedCount = useLogsStore((s) => s.todaySmokedCount);
  const lastSmokeAt = useLogsStore((s) => s.lastSmokeAt);
  const [progress, setProgress] = useState<Progress>({
    unitsAvoided: 0,
    moneySaved: 0,
    daysElapsed: 0,
  });

  useEffect(() => {
    const startIso =
      profile.quitMode === 'cold_turkey' && profile.quitDate
        ? profile.quitDate
        : profile.programStartDate;
    let cancelled = false;
    getQuantitySince(startIso).then((units) => {
      if (cancelled) return;
      if (new Date(startIso).getTime() > Date.now()) {
        setProgress({ unitsAvoided: 0, moneySaved: 0, daysElapsed: 0 });
        return;
      }
      const days = daysBetween(startIso);
      const avoided = Math.max(0, baselinePerDay(profile) * days - units);
      setProgress({
        unitsAvoided: avoided,
        moneySaved: avoided * costPerUnit(profile),
        daysElapsed: days,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [profile, todaySmokedCount, lastSmokeAt]);

  return progress;
}
