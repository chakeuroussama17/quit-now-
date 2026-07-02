import { getDb } from './database';

export async function getUnlockedAchievements(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; unlocked_at: string }>(
    'SELECT key, unlocked_at FROM achievements',
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.unlocked_at]));
}

/** Idempotent — records the first time an achievement condition was seen true. */
export async function unlockAchievement(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR IGNORE INTO achievements (key, unlocked_at) VALUES (?, ?)', [
    key,
    new Date().toISOString(),
  ]);
}
