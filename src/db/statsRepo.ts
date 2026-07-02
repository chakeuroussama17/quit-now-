import type { Emotion, TriggerType } from '@/types/models';

import { getDb } from './database';

/**
 * Aggregated, read-only queries for charts. All grouping happens in local time
 * ('localtime' modifier) so "a day" matches the user's clock, not UTC.
 */

export interface DayPoint {
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  value: number;
}

export interface DayCravingStats {
  day: string;
  count: number;
  avgIntensity: number;
  resisted: number;
}

/** Local YYYY-MM-DD for `offset` days ago (0 = today). */
function localDayKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString('en-CA');
}

function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => localDayKey(n - 1 - i));
}

function sinceIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Units smoked per local day for the last N days (gaps filled with 0). */
export async function getDailySmokeQuantities(days: number): Promise<DayPoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day: string; q: number }>(
    `SELECT strftime('%Y-%m-%d', timestamp, 'localtime') AS day, SUM(quantity) AS q
     FROM smoke_logs WHERE timestamp >= ? GROUP BY day`,
    [sinceIso(days)],
  );
  const byDay = new Map(rows.map((r) => [r.day, r.q]));
  return lastNDays(days).map((day) => ({ day, value: byDay.get(day) ?? 0 }));
}

/** Craving count / avg intensity / resisted count per local day (gaps = 0). */
export async function getDailyCravingStats(days: number): Promise<DayCravingStats[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    day: string;
    n: number;
    avg_intensity: number | null;
    resisted: number;
  }>(
    `SELECT strftime('%Y-%m-%d', timestamp, 'localtime') AS day,
            COUNT(*) AS n,
            AVG(intensity) AS avg_intensity,
            SUM(resisted) AS resisted
     FROM craving_logs WHERE timestamp >= ? GROUP BY day`,
    [sinceIso(days)],
  );
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return lastNDays(days).map((day) => {
    const r = byDay.get(day);
    return {
      day,
      count: r?.n ?? 0,
      avgIntensity: r?.avg_intensity ?? 0,
      resisted: r?.resisted ?? 0,
    };
  });
}

/** 7×24 matrix (weekday × hour, Sunday = row 0) of log counts, local time. */
export async function getHourDowMatrix(
  days: number,
  source: 'smoke' | 'craving',
): Promise<number[][]> {
  const db = await getDb();
  const table = source === 'smoke' ? 'smoke_logs' : 'craving_logs';
  const rows = await db.getAllAsync<{ dow: string; hour: string; n: number }>(
    `SELECT strftime('%w', timestamp, 'localtime') AS dow,
            strftime('%H', timestamp, 'localtime') AS hour,
            COUNT(*) AS n
     FROM ${table} WHERE timestamp >= ? GROUP BY dow, hour`,
    [sinceIso(days)],
  );
  const matrix = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const r of rows) matrix[Number(r.dow)][Number(r.hour)] = r.n;
  return matrix;
}

export interface KeyCount<T extends string> {
  key: T;
  count: number;
}

export async function getTriggerCounts(days: number): Promise<KeyCount<TriggerType>[]> {
  const db = await getDb();
  return db.getAllAsync<KeyCount<TriggerType>>(
    `SELECT trigger_type AS key, COUNT(*) AS count
     FROM smoke_logs WHERE timestamp >= ? AND trigger_type IS NOT NULL
     GROUP BY trigger_type ORDER BY count DESC`,
    [sinceIso(days)],
  );
}

export async function getEmotionCounts(days: number): Promise<KeyCount<Emotion>[]> {
  const db = await getDb();
  return db.getAllAsync<KeyCount<Emotion>>(
    `SELECT emotion AS key, COUNT(*) AS count
     FROM smoke_logs WHERE timestamp >= ? AND emotion IS NOT NULL
     GROUP BY emotion ORDER BY count DESC`,
    [sinceIso(days)],
  );
}

export async function getWinRate(days: number): Promise<{ resisted: number; total: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ resisted: number; total: number }>(
    `SELECT COALESCE(SUM(resisted), 0) AS resisted, COUNT(*) AS total
     FROM craving_logs WHERE timestamp >= ?`,
    [sinceIso(days)],
  );
  return { resisted: row?.resisted ?? 0, total: row?.total ?? 0 };
}

/**
 * Week-over-week craving change: last 7 days vs the 7 before, as a signed
 * fraction (-0.38 = 38% fewer cravings — improving). Null without enough data.
 */
export async function getCravingWeekDelta(): Promise<number | null> {
  const db = await getDb();
  const [current, previous] = await Promise.all([
    db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM craving_logs WHERE timestamp >= ?', [
      sinceIso(7),
    ]),
    db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM craving_logs WHERE timestamp >= ? AND timestamp < ?',
      [sinceIso(14), sinceIso(7)],
    ),
  ]);
  const now = current?.n ?? 0;
  const before = previous?.n ?? 0;
  if (before === 0) return null;
  return (now - before) / before;
}

export async function getAvgCraving(
  days: number,
): Promise<{ avgIntensity: number; avgDurationSeconds: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ i: number | null; d: number | null }>(
    `SELECT AVG(intensity) AS i, AVG(duration_seconds) AS d
     FROM craving_logs WHERE timestamp >= ?`,
    [sinceIso(days)],
  );
  return { avgIntensity: row?.i ?? 0, avgDurationSeconds: row?.d ?? 0 };
}

/** All-time counters for XP and achievements. */
export async function getAllTimeCounts(): Promise<{
  smokeLogCount: number;
  urgeSurfCount: number;
}> {
  const db = await getDb();
  const [smoke, surf] = await Promise.all([
    db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM smoke_logs'),
    db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM craving_logs WHERE technique_used = 'urge_surf'",
    ),
  ]);
  return { smokeLogCount: smoke?.n ?? 0, urgeSurfCount: surf?.n ?? 0 };
}

/**
 * Longest smoke-free stretch in days: the widest gap between consecutive
 * smoke logs, including anchor→first log and last log→now. With no logs at
 * all, it's simply anchor→now.
 */
export async function getLongestGapDays(anchorIso: string): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ timestamp: string }>(
    'SELECT timestamp FROM smoke_logs ORDER BY timestamp ASC',
  );
  const anchor = new Date(anchorIso).getTime();
  const points = [anchor, ...rows.map((r) => new Date(r.timestamp).getTime()), Date.now()];
  let longestMs = 0;
  for (let i = 1; i < points.length; i++) {
    longestMs = Math.max(longestMs, points[i] - points[i - 1]);
  }
  return Math.max(0, longestMs / 86_400_000);
}
