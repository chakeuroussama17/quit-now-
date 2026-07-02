import type { AiMessage } from '@/types/models';

import { getDb } from './database';

/**
 * Cached AI responses. Caching is the rate limiter: daily motivation is one
 * row per day, weekly insight one per ISO week, reflections capped per day.
 */

export async function insertAiMessage(
  kind: AiMessage['kind'],
  content: string,
  meta: string | null = null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO ai_messages (kind, content, created_at, meta) VALUES (?, ?, ?, ?)',
    [kind, content, new Date().toISOString(), meta],
  );
}

export async function getLatestAiMessage(kind: AiMessage['kind']): Promise<AiMessage | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: number;
    kind: AiMessage['kind'];
    content: string;
    created_at: string;
    meta: string | null;
  }>('SELECT * FROM ai_messages WHERE kind = ? ORDER BY created_at DESC LIMIT 1', [kind]);
  return row
    ? {
        id: row.id,
        kind: row.kind,
        content: row.content,
        createdAt: row.created_at,
        meta: row.meta,
      }
    : null;
}

export async function getAiMessageByMeta(
  kind: AiMessage['kind'],
  meta: string,
): Promise<AiMessage | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: number;
    kind: AiMessage['kind'];
    content: string;
    created_at: string;
    meta: string | null;
  }>('SELECT * FROM ai_messages WHERE kind = ? AND meta = ? ORDER BY created_at DESC LIMIT 1', [
    kind,
    meta,
  ]);
  return row
    ? {
        id: row.id,
        kind: row.kind,
        content: row.content,
        createdAt: row.created_at,
        meta: row.meta,
      }
    : null;
}

/** How many messages of this kind were created since the given ISO time. */
export async function countAiMessagesSince(
  kind: AiMessage['kind'],
  sinceIso: string,
): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM ai_messages WHERE kind = ? AND created_at >= ?',
    [kind, sinceIso],
  );
  return row?.n ?? 0;
}
