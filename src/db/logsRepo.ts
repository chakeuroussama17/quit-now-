import type {
  CravingLog,
  Emotion,
  LocationTag,
  ProductType,
  SmokeLog,
  TriggerType,
} from '@/types/models';

import { getDb } from './database';

export interface NewSmokeLog {
  timestamp?: string;
  productType: ProductType;
  quantity?: number;
  trigger: TriggerType | null;
  emotion: Emotion | null;
  cravingIntensity?: number | null;
  note?: string | null;
  locationTag?: LocationTag | null;
}

export interface SmokeLogDetail {
  cravingIntensity?: number | null;
  note?: string | null;
  locationTag?: LocationTag | null;
  quantity?: number;
}

interface SmokeLogRow {
  id: number;
  timestamp: string;
  product_type: string;
  quantity: number;
  trigger_type: string | null;
  emotion: string | null;
  craving_intensity: number | null;
  note: string | null;
  location_tag: string | null;
}

function rowToSmokeLog(row: SmokeLogRow): SmokeLog {
  return {
    id: row.id,
    timestamp: row.timestamp,
    productType: row.product_type as ProductType,
    quantity: row.quantity,
    trigger: row.trigger_type as TriggerType | null,
    emotion: row.emotion as Emotion | null,
    cravingIntensity: row.craving_intensity,
    note: row.note,
    locationTag: row.location_tag as LocationTag | null,
  };
}

export async function insertSmokeLog(input: NewSmokeLog): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO smoke_logs (timestamp, product_type, quantity, trigger_type, emotion, craving_intensity, note, location_tag)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.timestamp ?? new Date().toISOString(),
      input.productType,
      input.quantity ?? 1,
      input.trigger,
      input.emotion,
      input.cravingIntensity ?? null,
      input.note ?? null,
      input.locationTag ?? null,
    ],
  );
  return result.lastInsertRowId;
}

/** Enrich a log after the fast 3-tap flow (optional intensity/note/location). */
export async function updateSmokeLogDetail(id: number, detail: SmokeLogDetail): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE smoke_logs SET
       craving_intensity = COALESCE(?, craving_intensity),
       note = COALESCE(?, note),
       location_tag = COALESCE(?, location_tag),
       quantity = COALESCE(?, quantity)
     WHERE id = ?`,
    [
      detail.cravingIntensity ?? null,
      detail.note ?? null,
      detail.locationTag ?? null,
      detail.quantity ?? null,
      id,
    ],
  );
}

export interface NewCravingLog {
  timestamp?: string;
  intensity?: number | null;
  resisted: boolean;
  techniqueUsed?: string | null;
  durationSeconds?: number | null;
}

export async function insertCravingLog(input: NewCravingLog): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO craving_logs (timestamp, intensity, resisted, technique_used, duration_seconds)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.timestamp ?? new Date().toISOString(),
      input.intensity ?? null,
      input.resisted ? 1 : 0,
      input.techniqueUsed ?? null,
      input.durationSeconds ?? null,
    ],
  );
  return result.lastInsertRowId;
}

/** Local start-of-day as ISO string, so "today" follows the user's clock. */
function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export interface TodaySummary {
  smokedCount: number;
  smokedQuantity: number;
  cravingsResisted: number;
}

export async function getTodaySummary(): Promise<TodaySummary> {
  const db = await getDb();
  const since = startOfTodayIso();
  const [smoke, cravings] = await Promise.all([
    db.getFirstAsync<{ n: number; q: number }>(
      'SELECT COUNT(*) AS n, COALESCE(SUM(quantity), 0) AS q FROM smoke_logs WHERE timestamp >= ?',
      [since],
    ),
    db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM craving_logs WHERE timestamp >= ? AND resisted = 1',
      [since],
    ),
  ]);
  return {
    smokedCount: smoke?.n ?? 0,
    smokedQuantity: smoke?.q ?? 0,
    cravingsResisted: cravings?.n ?? 0,
  };
}

export async function getLastSmokeTimestamp(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ timestamp: string }>(
    'SELECT timestamp FROM smoke_logs ORDER BY timestamp DESC LIMIT 1',
  );
  return row?.timestamp ?? null;
}

/** Total sticks/ml/sessions logged since a given ISO timestamp (for money saved). */
export async function getQuantitySince(sinceIso: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ q: number }>(
    'SELECT COALESCE(SUM(quantity), 0) AS q FROM smoke_logs WHERE timestamp >= ?',
    [sinceIso],
  );
  return row?.q ?? 0;
}

export async function getRecentSmokeLogs(limit = 20): Promise<SmokeLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SmokeLogRow>(
    'SELECT * FROM smoke_logs ORDER BY timestamp DESC LIMIT ?',
    [limit],
  );
  return rows.map(rowToSmokeLog);
}

/** Every smoke log, oldest first — for CSV export. */
export async function getAllSmokeLogs(): Promise<SmokeLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SmokeLogRow>('SELECT * FROM smoke_logs ORDER BY timestamp ASC');
  return rows.map(rowToSmokeLog);
}

interface CravingLogRow {
  id: number;
  timestamp: string;
  intensity: number | null;
  resisted: number;
  technique_used: string | null;
  duration_seconds: number | null;
}

/** Every craving log, oldest first — for CSV export. */
export async function getAllCravingLogs(): Promise<CravingLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CravingLogRow>(
    'SELECT * FROM craving_logs ORDER BY timestamp ASC',
  );
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    intensity: r.intensity,
    resisted: r.resisted === 1,
    techniqueUsed: r.technique_used,
    durationSeconds: r.duration_seconds,
  }));
}

export async function getCravingStats(): Promise<{ resisted: number; total: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ resisted: number; total: number }>(
    'SELECT COALESCE(SUM(resisted), 0) AS resisted, COUNT(*) AS total FROM craving_logs',
  );
  return { resisted: row?.resisted ?? 0, total: row?.total ?? 0 };
}

export type { CravingLog };
