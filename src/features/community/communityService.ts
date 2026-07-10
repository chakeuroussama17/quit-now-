import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/state/useAuthStore';

/**
 * Public country chat rooms. Everything here goes over the network and is
 * visible to every signed-in user — the opposite of The Room, which never
 * leaves the device. Nothing in this file may touch logs, streaks or XP.
 */

export const MAX_MESSAGE_LENGTH = 500;
export const PAGE_SIZE = 60;

export interface CommunityMessage {
  id: string;
  roomCode: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
}

interface MessageRow {
  id: string;
  room_code: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
}

function toMessage(row: MessageRow): CommunityMessage {
  return {
    id: row.id,
    roomCode: row.room_code,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    body: row.body,
    createdAt: row.created_at,
  };
}

function currentUserId(): string | null {
  return useAuthStore.getState().session?.user.id ?? null;
}

/** Postgres check_violation raised by the community_rate_limit trigger. */
export function isRateLimit(error: { message?: string } | null): boolean {
  return error?.message?.includes('rate_limited') ?? false;
}

/** Postgres unique_violation — a taken nickname, or a duplicate report. */
function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}

// ─── Public identity ────────────────────────────────────────────────────────

export type NicknameResult = { ok: true } | { ok: false; reason: 'taken' | 'invalid' | 'network' };

const NICKNAME_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N} _.-]{1,18})[\p{L}\p{N}]$/u;

export function isValidNickname(name: string): boolean {
  return NICKNAME_PATTERN.test(name.trim());
}

/**
 * Claim a nickname. The unique index does the arbitration, so two people
 * racing for the same name can't both win.
 */
export async function claimNickname(name: string, avatarUrl: string | null): Promise<NicknameResult> {
  const userId = currentUserId();
  if (!userId) return { ok: false, reason: 'network' };
  const displayName = name.trim();
  if (!isValidNickname(displayName)) return { ok: false, reason: 'invalid' };

  const { error } = await supabase.from('community_profiles').upsert(
    {
      user_id: userId,
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (!error) return { ok: true };
  return { ok: false, reason: isUniqueViolation(error) ? 'taken' : 'network' };
}

/** The nickname this account already owns, if any. */
export async function fetchMyNickname(): Promise<string | null> {
  const userId = currentUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from('community_profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.display_name as string | undefined) ?? null;
}

// ─── Messages ───────────────────────────────────────────────────────────────

/** Newest last, ready to append to a chat transcript. */
export async function fetchMessages(roomCode: string): Promise<CommunityMessage[]> {
  const { data, error } = await supabase
    .from('community_messages')
    .select('id, room_code, user_id, display_name, avatar_url, body, created_at')
    .eq('room_code', roomCode)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (error || !data) return [];
  return (data as MessageRow[]).map(toMessage).reverse();
}

export type SendResult =
  | { ok: true; message: CommunityMessage }
  | { ok: false; reason: 'rate_limited' | 'network' };

/**
 * Returns the stored row rather than firing and forgetting: the sender's own
 * message must appear even where realtime is unavailable, and having the real
 * id lets the transcript de-duplicate the echo that realtime sends back.
 */
export async function sendMessage(
  roomCode: string,
  body: string,
  displayName: string,
  avatarUrl: string | null,
): Promise<SendResult> {
  const userId = currentUserId();
  if (!userId) return { ok: false, reason: 'network' };
  const text = body.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!text) return { ok: false, reason: 'network' };

  const { data, error } = await supabase
    .from('community_messages')
    .insert({
      room_code: roomCode,
      user_id: userId,
      display_name: displayName,
      avatar_url: avatarUrl,
      body: text,
    })
    .select('id, room_code, user_id, display_name, avatar_url, body, created_at')
    .single();

  if (error || !data) {
    return { ok: false, reason: isRateLimit(error) ? 'rate_limited' : 'network' };
  }
  return { ok: true, message: toMessage(data as MessageRow) };
}

export async function deleteMessage(id: string): Promise<boolean> {
  const { error } = await supabase.from('community_messages').delete().eq('id', id);
  return !error;
}

/**
 * Live inserts for one room. Returns the teardown — always call it, or the
 * socket keeps a subscription open for a room nobody is looking at.
 */
export function subscribeToRoom(
  roomCode: string,
  onMessage: (message: CommunityMessage) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`community:${roomCode}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'community_messages',
        filter: `room_code=eq.${roomCode}`,
      },
      (payload) => onMessage(toMessage(payload.new as MessageRow)),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Safety: block & report ─────────────────────────────────────────────────

export async function fetchBlockedIds(): Promise<string[]> {
  const userId = currentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from('community_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);
  return (data ?? []).map((row: { blocked_id: string }) => row.blocked_id);
}

export async function blockUser(blockedId: string): Promise<boolean> {
  const userId = currentUserId();
  if (!userId || userId === blockedId) return false;
  const { error } = await supabase
    .from('community_blocks')
    .upsert({ blocker_id: userId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });
  return !error;
}

/**
 * Snapshots the offending text: the author can delete their message, but a
 * moderator still needs to see what was said.
 */
export async function reportMessage(message: CommunityMessage, reason: string): Promise<boolean> {
  const userId = currentUserId();
  if (!userId) return false;
  const { error } = await supabase.from('community_reports').insert({
    message_id: message.id,
    reported_user_id: message.userId,
    reporter_id: userId,
    body_snapshot: message.body,
    reason,
  });
  // Already reported by this user — from their side, it worked.
  return !error || isUniqueViolation(error);
}
