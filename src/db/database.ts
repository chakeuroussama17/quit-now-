import * as SQLite from 'expo-sqlite';

/**
 * Local-first storage. All logs stay on device — nothing here ever leaves
 * the phone except the aggregated summaries built for AI prompts (Phase 6).
 *
 * Migrations are versioned via PRAGMA user_version. To evolve the schema,
 * push a new SQL string onto MIGRATIONS — never edit an existing one.
 */
const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT '',
    products TEXT NOT NULL DEFAULT '[]',
    cigs_per_day REAL,
    price_per_pack REAL,
    sticks_per_pack INTEGER,
    cig_brand TEXT,
    vape_nicotine_mg_ml REAL,
    vape_ml_per_day REAL,
    vape_pods_per_week REAL,
    vape_cost_per_unit REAL,
    shisha_sessions_per_week REAL,
    shisha_cost_per_session REAL,
    years_using REAL NOT NULL DEFAULT 0,
    quit_reasons TEXT NOT NULL DEFAULT '[]',
    quit_reason_text TEXT NOT NULL DEFAULT '',
    usage_moments TEXT NOT NULL DEFAULT '[]',
    quit_mode TEXT NOT NULL DEFAULT 'cold_turkey',
    quit_date TEXT,
    program_start_date TEXT NOT NULL,
    tried_before INTEGER NOT NULL DEFAULT 0,
    previous_relapse_causes TEXT NOT NULL DEFAULT '[]',
    previous_relapse_text TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'RM',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS smoke_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    product_type TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    trigger_type TEXT,
    emotion TEXT,
    craving_intensity INTEGER,
    note TEXT,
    location_tag TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_smoke_logs_ts ON smoke_logs(timestamp);

  CREATE TABLE IF NOT EXISTS craving_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    intensity INTEGER,
    resisted INTEGER NOT NULL DEFAULT 1,
    technique_used TEXT,
    duration_seconds INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_craving_logs_ts ON craving_logs(timestamp);

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    unlocked_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    meta TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_ai_messages_kind ON ai_messages(kind, created_at);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // v2 — The Room. These are the MOST SENSITIVE tables in the app: private
  // emotional conversations. They must never feed stats, gamification,
  // analytics or logging, and are deletable separately from everything else.
  `
  CREATE TABLE IF NOT EXISTS room_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    takeaway TEXT
  );

  CREATE TABLE IF NOT EXISTS room_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES room_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_room_messages_session ON room_messages(session_id);
  `,
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function init(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('exhale.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    await db.execAsync(MIGRATIONS[version]);
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
  return db;
}

/** Single shared connection. Safe to call from anywhere, any number of times. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

/** Wipes every table (used by "Delete all data" in settings and dev tools). */
export async function wipeAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM user_profile;
    DELETE FROM smoke_logs;
    DELETE FROM craving_logs;
    DELETE FROM achievements;
    DELETE FROM ai_messages;
    DELETE FROM settings;
    DELETE FROM room_messages;
    DELETE FROM room_sessions;
  `);
}

/** Deletes ONLY Room conversations — separate control for the most private data. */
export async function wipeRoomData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM room_messages;
    DELETE FROM room_sessions;
  `);
}
