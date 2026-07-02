/**
 * Mature gamification (Phase 4). XP is DERIVED from real behavior, never
 * stored — so it's always consistent with the logs, including demo data.
 * Honesty pays: even logging a smoke earns a little, because honest data
 * beats a flattering streak.
 */

export interface GameInputs {
  cravingsResisted: number;
  smokeLogCount: number;
  urgeSurfCount: number;
  cleanDays: number; // current streak, whole days
  longestDays: number;
  moneySaved: number;
  unitsAvoided: number;
  winRate: number | null; // null with too little data
  cravingsTotal: number;
}

export const XP_RULES = {
  resistedCraving: 40,
  honestSmokeLog: 2,
  urgeSurfCompleted: 20,
  cleanDay: 15,
} as const;

export function totalXp(g: GameInputs): number {
  return (
    g.cravingsResisted * XP_RULES.resistedCraving +
    g.smokeLogCount * XP_RULES.honestSmokeLog +
    g.urgeSurfCount * XP_RULES.urgeSurfCompleted +
    g.cleanDays * XP_RULES.cleanDay
  );
}

const LEVEL_XP = 300;

export function levelFor(xp: number): { level: number; progress: number; toNext: number } {
  return {
    level: Math.floor(xp / LEVEL_XP) + 1,
    progress: (xp % LEVEL_XP) / LEVEL_XP,
    toNext: LEVEL_XP - (xp % LEVEL_XP),
  };
}

export interface Rank {
  day: number;
  name: string;
  detail: string;
}

/** Ranks, not badges. Monochrome until the streak earns them. */
export const RANKS: Rank[] = [
  { day: 1, name: 'The Decision', detail: 'It starts with one clean day.' },
  { day: 3, name: 'Nicotine-Free Blood', detail: 'By day 3 nicotine has left your bloodstream.' },
  { day: 7, name: 'Detoxed', detail: 'One full week. The chemistry is on your side now.' },
  { day: 14, name: 'Rewired Habits', detail: 'Two weeks — the routines are learning new paths.' },
  { day: 30, name: 'New Baseline', detail: 'A month in. This is who you are now.' },
  { day: 90, name: 'Transformed', detail: 'Three months. Cravings are visitors, not residents.' },
  { day: 365, name: 'Free', detail: 'One year. Heart disease risk halved. Free.' },
];

export interface AchievementDef {
  key: string;
  title: string;
  detail: string;
  unlocked: (g: GameInputs) => boolean;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    key: 'first_clean_day',
    title: 'First clean day',
    detail: '24 hours smoke-free',
    unlocked: (g) => Math.max(g.cleanDays, g.longestDays) >= 1,
  },
  {
    key: 'surf_10',
    title: '10 cravings surfed',
    detail: 'Resisted ten cravings',
    unlocked: (g) => g.cravingsResisted >= 10,
  },
  {
    key: 'weekend_clean',
    title: 'Smoke-free weekend',
    detail: 'A full weekend without one',
    unlocked: (g) => Math.max(g.cleanDays, g.longestDays) >= 3,
  },
  {
    key: 'money_100',
    title: '100 saved',
    detail: 'Kept 100 in your pocket',
    unlocked: (g) => g.moneySaved >= 100,
  },
  {
    key: 'not_smoked_1000',
    title: '1,000 not smoked',
    detail: 'A thousand units avoided',
    unlocked: (g) => g.unitsAvoided >= 1000,
  },
  {
    key: 'surf_master',
    title: 'Wave rider',
    detail: 'Completed 5 urge surfs',
    unlocked: (g) => g.urgeSurfCount >= 5,
  },
  {
    key: 'win_rate_80',
    title: 'Sharp defense',
    detail: '80%+ craving win rate (10+ logged)',
    unlocked: (g) => g.cravingsTotal >= 10 && (g.winRate ?? 0) >= 0.8,
  },
];
