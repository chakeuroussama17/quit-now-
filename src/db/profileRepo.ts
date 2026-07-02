import type { UserProfile } from '@/types/models';

import { getDb } from './database';

interface ProfileRow {
  name: string;
  products: string;
  cigs_per_day: number | null;
  price_per_pack: number | null;
  sticks_per_pack: number | null;
  cig_brand: string | null;
  vape_nicotine_mg_ml: number | null;
  vape_ml_per_day: number | null;
  vape_pods_per_week: number | null;
  vape_cost_per_unit: number | null;
  shisha_sessions_per_week: number | null;
  shisha_cost_per_session: number | null;
  years_using: number;
  quit_reasons: string;
  quit_reason_text: string;
  usage_moments: string;
  quit_mode: string;
  quit_date: string | null;
  program_start_date: string;
  tried_before: number;
  previous_relapse_causes: string;
  previous_relapse_text: string;
  currency: string;
  created_at: string;
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    name: row.name,
    products: JSON.parse(row.products),
    cigsPerDay: row.cigs_per_day,
    pricePerPack: row.price_per_pack,
    sticksPerPack: row.sticks_per_pack,
    cigBrand: row.cig_brand,
    vapeNicotineMgMl: row.vape_nicotine_mg_ml,
    vapeMlPerDay: row.vape_ml_per_day,
    vapePodsPerWeek: row.vape_pods_per_week,
    vapeCostPerUnit: row.vape_cost_per_unit,
    shishaSessionsPerWeek: row.shisha_sessions_per_week,
    shishaCostPerSession: row.shisha_cost_per_session,
    yearsUsing: row.years_using,
    quitReasons: JSON.parse(row.quit_reasons),
    quitReasonText: row.quit_reason_text,
    usageMoments: JSON.parse(row.usage_moments),
    quitMode: row.quit_mode as UserProfile['quitMode'],
    quitDate: row.quit_date,
    programStartDate: row.program_start_date,
    triedBefore: row.tried_before === 1,
    previousRelapseCauses: JSON.parse(row.previous_relapse_causes),
    previousRelapseText: row.previous_relapse_text,
    currency: row.currency,
    createdAt: row.created_at,
  };
}

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM user_profile WHERE id = 1');
  return row ? rowToProfile(row) : null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO user_profile (
      id, name, products, cigs_per_day, price_per_pack, sticks_per_pack, cig_brand,
      vape_nicotine_mg_ml, vape_ml_per_day, vape_pods_per_week, vape_cost_per_unit,
      shisha_sessions_per_week, shisha_cost_per_session,
      years_using, quit_reasons, quit_reason_text, usage_moments,
      quit_mode, quit_date, program_start_date, tried_before,
      previous_relapse_causes, previous_relapse_text, currency, created_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.name,
      JSON.stringify(profile.products),
      profile.cigsPerDay,
      profile.pricePerPack,
      profile.sticksPerPack,
      profile.cigBrand,
      profile.vapeNicotineMgMl,
      profile.vapeMlPerDay,
      profile.vapePodsPerWeek,
      profile.vapeCostPerUnit,
      profile.shishaSessionsPerWeek,
      profile.shishaCostPerSession,
      profile.yearsUsing,
      JSON.stringify(profile.quitReasons),
      profile.quitReasonText,
      JSON.stringify(profile.usageMoments),
      profile.quitMode,
      profile.quitDate,
      profile.programStartDate,
      profile.triedBefore ? 1 : 0,
      JSON.stringify(profile.previousRelapseCauses),
      profile.previousRelapseText,
      profile.currency,
      profile.createdAt,
    ],
  );
}
