import type { Emotion, TriggerType, UserProfile } from '@/types/models';
import { addDaysIso } from '@/utils/time';

import { insertCravingLog, insertSmokeLog } from './logsRepo';
import { saveProfile } from './profileRepo';
import { setSetting } from './settingsRepo';

const TRIGGERS: TriggerType[] = ['stress', 'habit', 'coffee', 'after_meal', 'boredom', 'social'];
const EMOTIONS: Emotion[] = ['stressed', 'neutral', 'bored', 'anxious', 'tired', 'relaxed'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isoAt(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * Dev-only demo data: a cold-turkey quitter, 9 days smoke-free after a
 * ~12/day habit, with cravings that are visibly getting weaker and rarer.
 * Gives the dashboard (and the Phase 2 charts) something real to render.
 */
export async function seedDemoData(): Promise<void> {
  if (!__DEV__) return;

  const quitDaysAgo = 9;
  const profile: UserProfile = {
    name: 'Alex',
    products: ['cigarette'],
    cigsPerDay: 12,
    pricePerPack: 15,
    sticksPerPack: 20,
    cigBrand: 'Marlboro',
    vapeNicotineMgMl: null,
    vapeMlPerDay: null,
    vapePodsPerWeek: null,
    vapeCostPerUnit: null,
    shishaSessionsPerWeek: null,
    shishaCostPerSession: null,
    yearsUsing: 6,
    quitReasons: ['health', 'kids', 'money'],
    quitReasonText: 'I want to be able to run around with my son without gasping for air.',
    usageMoments: ['morning_coffee', 'work_breaks', 'stress', 'after_meals'],
    quitMode: 'cold_turkey',
    quitDate: addDaysIso(-quitDaysAgo),
    programStartDate: addDaysIso(-(quitDaysAgo + 5)),
    triedBefore: true,
    previousRelapseCauses: ['stress', 'alcohol'],
    previousRelapseText: 'A rough week at work and a night out undid three clean weeks.',
    currency: 'RM',
    createdAt: addDaysIso(-(quitDaysAgo + 5)),
  };
  await saveProfile(profile);
  await setSetting('reward_goal_name', 'New running shoes');
  await setSetting('reward_goal_price', '400');

  // Smoking history before the quit date (days 14 → 10 ago), ~10–12 a day
  // clustered at typical hours so the Phase 2 heatmap has a shape.
  const smokingHours = [7, 9, 10, 12, 13, 15, 16, 18, 20, 22];
  for (let daysAgo = quitDaysAgo + 5; daysAgo > quitDaysAgo; daysAgo--) {
    for (const hour of smokingHours) {
      if (Math.random() < 0.85) {
        await insertSmokeLog({
          timestamp: isoAt(daysAgo, hour, Math.floor(Math.random() * 50)),
          productType: 'cigarette',
          trigger: pick(TRIGGERS),
          emotion: pick(EMOTIONS),
          cravingIntensity: Math.random() < 0.4 ? 4 + Math.floor(Math.random() * 5) : null,
        });
      }
    }
  }

  // Cravings since quitting — intensity and duration taper day by day,
  // with today including a couple of fresh wins for the dashboard.
  for (let daysAgo = quitDaysAgo; daysAgo >= 0; daysAgo--) {
    const dayIndex = quitDaysAgo - daysAgo; // 0 = quit day
    const perDay = Math.max(2, 6 - Math.floor(dayIndex / 2));
    for (let i = 0; i < perDay; i++) {
      const intensity = Math.max(2, 9 - dayIndex + Math.floor(Math.random() * 2) - 1);
      await insertCravingLog({
        timestamp: isoAt(daysAgo, 8 + Math.floor(Math.random() * 13)),
        intensity,
        resisted: Math.random() < 0.9,
        techniqueUsed: pick(['breathing', 'water', 'walk', null as never]),
        durationSeconds: Math.max(60, 300 - dayIndex * 20 + Math.floor(Math.random() * 60)),
      });
    }
  }
}
