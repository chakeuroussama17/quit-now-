import type { UserProfile } from '@/types/models';
import { dailyTarget } from '@/utils/baseline';
import { daysBetween } from '@/utils/time';

export interface ReductionPlanWeek {
  week: number; // 1-based
  daily_target: number;
}

export interface ReductionPlan {
  weeks: ReductionPlanWeek[];
  note?: string;
}

/** Strict validation of an AI-generated plan — reject anything malformed. */
export function parseReductionPlan(json: string): ReductionPlan | null {
  try {
    const raw = JSON.parse(json);
    const weeks = raw?.weeks;
    if (!Array.isArray(weeks) || weeks.length < 4 || weeks.length > 16) return null;
    const cleaned: ReductionPlanWeek[] = [];
    for (let i = 0; i < weeks.length; i++) {
      const target = Number(weeks[i]?.daily_target);
      if (!Number.isFinite(target) || target < 0) return null;
      cleaned.push({ week: i + 1, daily_target: Math.round(target * 10) / 10 });
    }
    // Must actually taper: no increases, and it must end at zero.
    for (let i = 1; i < cleaned.length; i++) {
      if (cleaned[i].daily_target > cleaned[i - 1].daily_target) return null;
    }
    if (cleaned[cleaned.length - 1].daily_target !== 0) return null;
    return {
      weeks: cleaned,
      note: typeof raw.note === 'string' ? raw.note.slice(0, 200) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Today's target for gradual mode: the stored AI plan when one exists,
 * otherwise the linear 8-week fallback taper.
 */
export function getDailyTargetFor(profile: UserProfile, planJson?: string): number {
  const days = daysBetween(profile.programStartDate);
  if (planJson) {
    const plan = parseReductionPlan(planJson);
    if (plan) {
      const week = Math.floor(days / 7);
      const entry = plan.weeks[Math.min(week, plan.weeks.length - 1)];
      return entry.daily_target;
    }
  }
  return dailyTarget(profile, days);
}
