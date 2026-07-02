import { getQuantitySince } from '@/db/logsRepo';
import {
  getAvgCraving,
  getDailySmokeQuantities,
  getEmotionCounts,
  getHourDowMatrix,
  getLongestGapDays,
  getTriggerCounts,
  getWinRate,
} from '@/db/statsRepo';
import { useSettingsStore } from '@/state/useSettingsStore';
import type { UserProfile } from '@/types/models';
import { baselinePerDay, costPerUnit } from '@/utils/baseline';
import { getNextMilestone, lifeRegainedMinutes } from '@/utils/health';
import { getDailyTargetFor } from '@/utils/reduction';
import { daysBetween } from '@/utils/time';

/**
 * The single context object included in EVERY AI call (Phase 6 spec).
 * Only aggregated summaries leave the device — never raw log rows.
 * Room takeaways get appended in Phase 4.5 behind an explicit opt-in.
 */
export interface AppContext {
  name: string;
  products: string[];
  quit_mode: 'cold_turkey' | 'gradual';
  quit_reasons: string[];
  /** Their own words — the most important field. */
  quit_reason_text: string;
  baseline_per_day: number;
  cost_per_unit: number;
  currency: string;
  previous_relapse_causes: string[];

  days_since_quit: number;
  current_streak_hours: number;
  longest_streak_days: number;
  money_saved: number;
  units_not_consumed: number;
  minutes_of_life_regained: number;
  next_health_milestone: { label: string; hours_remaining: number } | null;
  reward_goal: { name: string; price: number; percent_saved: number } | null;

  last_7_days: {
    smoked_count: number;
    daily_target: number | null;
    cravings_logged: number;
    cravings_resisted: number;
    craving_win_rate: number;
    top_triggers: string[];
    top_emotions: string[];
    riskiest_hours: string[];
    avg_craving_intensity: number;
    avg_craving_duration_seconds: number;
  };
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { context: AppContext; at: number } | null = null;

/** Call whenever a new log lands so the next AI call sees fresh numbers. */
export function invalidateContextCache(): void {
  cache = null;
}

/** Top-2 hours across the week, formatted "14:00". */
function riskiestHours(matrix: number[][]): string[] {
  const byHour = Array<number>(24).fill(0);
  for (const row of matrix) row.forEach((n, h) => (byHour[h] += n));
  return byHour
    .map((n, h) => ({ n, h }))
    .filter((e) => e.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((e) => `${String(e.h).padStart(2, '0')}:00`);
}

export async function buildContextJSON(
  profile: UserProfile,
  lastSmokeAt: string | null,
): Promise<AppContext> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.context;

  const startIso =
    profile.quitMode === 'cold_turkey' && profile.quitDate
      ? profile.quitDate
      : profile.programStartDate;
  const started = new Date(startIso).getTime() <= Date.now();

  // Every query in parallel — never serially.
  const [unitsSmoked, daily7, winRate, avgCraving, triggers, emotions, matrix, longestGap] =
    await Promise.all([
      getQuantitySince(startIso),
      getDailySmokeQuantities(7),
      getWinRate(7),
      getAvgCraving(7),
      getTriggerCounts(7),
      getEmotionCounts(7),
      getHourDowMatrix(30, 'smoke'),
      getLongestGapDays(profile.programStartDate),
    ]);

  const heatSource = matrix.flat().some((n) => n > 0)
    ? matrix
    : await getHourDowMatrix(30, 'craving');

  const daysElapsed = started ? daysBetween(startIso) : 0;
  const unitsAvoided = started
    ? Math.max(0, baselinePerDay(profile) * daysElapsed - unitsSmoked)
    : 0;
  const moneySaved = unitsAvoided * costPerUnit(profile);

  const streakAnchor = Math.max(
    new Date(startIso).getTime(),
    lastSmokeAt ? new Date(lastSmokeAt).getTime() : 0,
  );
  const streakHours = started ? Math.max(0, (Date.now() - streakAnchor) / 3_600_000) : 0;
  const milestone = started ? getNextMilestone(streakAnchor) : null;

  const settings = useSettingsStore.getState().values;
  const goalName = settings['reward_goal_name'];
  const goalPrice = parseFloat(settings['reward_goal_price'] ?? '');
  const isCig = profile.products[0] === 'cigarette' || profile.products[0] === 'rolled';

  const context: AppContext = {
    name: profile.name,
    products: profile.products,
    quit_mode: profile.quitMode,
    quit_reasons: profile.quitReasons,
    quit_reason_text: profile.quitReasonText.slice(0, 300),
    baseline_per_day: Math.round(baselinePerDay(profile) * 10) / 10,
    cost_per_unit: Math.round(costPerUnit(profile) * 100) / 100,
    currency: profile.currency,
    previous_relapse_causes: profile.previousRelapseCauses,

    days_since_quit: Math.floor(daysElapsed),
    current_streak_hours: Math.floor(streakHours),
    longest_streak_days: Math.round(longestGap * 10) / 10,
    money_saved: Math.round(moneySaved),
    units_not_consumed: Math.floor(unitsAvoided),
    minutes_of_life_regained: isCig ? lifeRegainedMinutes(Math.floor(unitsAvoided)) : 0,
    next_health_milestone: milestone
      ? {
          label: milestone.milestone.label,
          hours_remaining: Math.round(milestone.hoursRemaining),
        }
      : null,
    reward_goal:
      goalName && Number.isFinite(goalPrice) && goalPrice > 0
        ? {
            name: goalName,
            price: goalPrice,
            percent_saved: Math.min(100, Math.round((moneySaved / goalPrice) * 100)),
          }
        : null,

    last_7_days: {
      smoked_count: Math.round(daily7.reduce((sum, d) => sum + d.value, 0) * 10) / 10,
      daily_target:
        profile.quitMode === 'gradual'
          ? getDailyTargetFor(profile, settings['reduction_plan'])
          : null,
      cravings_logged: winRate.total,
      cravings_resisted: winRate.resisted,
      craving_win_rate:
        winRate.total > 0 ? Math.round((winRate.resisted / winRate.total) * 100) / 100 : 0,
      top_triggers: triggers.slice(0, 3).map((t) => t.key),
      top_emotions: emotions.slice(0, 3).map((e) => e.key),
      riskiest_hours: riskiestHours(heatSource),
      avg_craving_intensity: Math.round(avgCraving.avgIntensity * 10) / 10,
      avg_craving_duration_seconds: Math.round(avgCraving.avgDurationSeconds),
    },
  };

  // Keep the serialized context well under ~800 tokens.
  if (JSON.stringify(context).length > 3200) {
    context.quit_reason_text = context.quit_reason_text.slice(0, 150);
    context.previous_relapse_causes = context.previous_relapse_causes.slice(0, 3);
    context.quit_reasons = context.quit_reasons.slice(0, 4);
  }

  cache = { context, at: Date.now() };
  return context;
}

/** Human-inspectable dump for the dev screen. */
export async function debugContext(
  profile: UserProfile,
  lastSmokeAt: string | null,
): Promise<string> {
  invalidateContextCache();
  const ctx = await buildContextJSON(profile, lastSmokeAt);
  return JSON.stringify(ctx, null, 2);
}
