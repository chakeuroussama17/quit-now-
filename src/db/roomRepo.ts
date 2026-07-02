import { getDb } from './database';

/**
 * PRIVACY: Room conversations are the most sensitive data in the app.
 * They never appear in stats, reports, gamification, or any analytics.
 * Only the current session's messages are ever sent to the AI (when enabled),
 * and the user can wipe all Room data independently in settings.
 */

export interface RoomMessage {
  id: number;
  sessionId: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** Returns the open session id, creating one if needed. */
export async function getOrCreateActiveSession(): Promise<number> {
  const db = await getDb();
  const open = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM room_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
  );
  if (open) return open.id;
  const result = await db.runAsync('INSERT INTO room_sessions (started_at) VALUES (?)', [
    new Date().toISOString(),
  ]);
  return result.lastInsertRowId;
}

export async function appendRoomMessage(
  sessionId: number,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO room_messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)',
    [sessionId, role, content, new Date().toISOString()],
  );
}

export async function getSessionMessages(sessionId: number): Promise<RoomMessage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    session_id: number;
    role: string;
    content: string;
    timestamp: string;
  }>('SELECT * FROM room_messages WHERE session_id = ? ORDER BY id ASC', [sessionId]);
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    role: r.role as RoomMessage['role'],
    content: r.content,
    timestamp: r.timestamp,
  }));
}

export async function endSession(sessionId: number, takeaway: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE room_sessions SET ended_at = ?, takeaway = ? WHERE id = ?', [
    new Date().toISOString(),
    takeaway,
    sessionId,
  ]);
}
