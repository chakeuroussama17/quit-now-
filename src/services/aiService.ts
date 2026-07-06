import { countAiMessagesSince, getAiMessageByMeta, insertAiMessage } from '@/db/aiRepo';
import { getLang } from '@/i18n';
import { useLogsStore } from '@/state/useLogsStore';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import type { Emotion, TriggerType, UserProfile } from '@/types/models';
import { baselinePerDay } from '@/utils/baseline';
import { parseReductionPlan, type ReductionPlan } from '@/utils/reduction';

import { aiConfigured, chatCompletion, type ChatMessage } from './aiClient';
import { buildContextJSON } from './contextBuilder';
import { fallbackMotivationForDay } from './fallbacks';

/** The Coach persona — fixed for every Coach-flavored call. */
const COACH_SYSTEM = `You are the in-app coach of a quit-smoking app called Exhale. Tone: calm, honest, adult, supportive — like a wise friend, never preachy, never shaming, no toxic positivity. Keep answers under 80 words unless asked for a plan. Always tie motivation back to the user's OWN stated reasons when relevant. Never provide medical diagnoses; suggest seeing a doctor for medical questions. If the user mentions self-harm or severe distress, gently encourage professional support and people they trust.
A JSON snapshot of the user's situation is provided — use it naturally, never recite it.`;

/** Extra system line so the coach answers in the app's selected language. */
export function languageInstruction(): string {
  switch (getLang()) {
    case 'ms':
      return 'Reply ONLY in natural, conversational Bahasa Melayu (Malaysia).';
    case 'ar':
      return 'Reply ONLY in natural, conversational Modern Standard Arabic.';
    case 'fr':
      return 'Reply ONLY in natural, conversational French.';
    default:
      return 'Reply in English.';
  }
}

async function coachMessages(instruction: string): Promise<ChatMessage[]> {
  const profile = useProfileStore.getState().profile;
  if (!profile) throw new Error('no profile');
  const lastSmokeAt = useLogsStore.getState().lastSmokeAt;
  const context = await buildContextJSON(profile, lastSmokeAt);
  return [
    { role: 'system', content: `${COACH_SYSTEM}\n${languageInstruction()}` },
    { role: 'system', content: `User context JSON:\n${JSON.stringify(context)}` },
    { role: 'user', content: instruction },
  ];
}

function localDayKey(date = new Date()): string {
  return date.toLocaleDateString('en-CA');
}

function isoWeekKey(date = new Date()): string {
  // Thursday of the current week determines the ISO week-year.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function dayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Daily motivation — one API call per day, cached in ai_messages. Offline or
 * unconfigured: a deterministic line from the bundled 50 (with the user's own
 * words surfacing every third day, handled by the caller).
 */
export async function getDailyMotivation(): Promise<{ text: string; fromAi: boolean }> {
  // Cache per day AND language, so switching language refreshes the line.
  const cacheKey = `${localDayKey()}:${getLang()}`;
  const cached = await getAiMessageByMeta('daily_motivation', cacheKey);
  if (cached) return { text: cached.content, fromAi: true };

  if (!aiConfigured())
    return { text: fallbackMotivationForDay(dayOfYear(), getLang()), fromAi: false };

  try {
    const messages = await coachMessages(
      'Write today\'s single motivation line for me (max 30 words). Weave in my own quit reason when it lands naturally. No quotes around it, no "remember", just the line.',
    );
    const text = (await chatCompletion(messages, { maxTokens: 90 })).trim();
    await insertAiMessage('daily_motivation', text, cacheKey);
    return { text, fromAi: true };
  } catch {
    return { text: fallbackMotivationForDay(dayOfYear(), getLang()), fromAi: false };
  }
}

const MAX_REFLECTIONS_PER_DAY = 3;
const REFLECTION_CHANCE = 0.4;

/**
 * Post-log reflection — occasional (never every log), max 3/day, silent on any
 * failure. Returns null when it chooses not to speak.
 */
export async function getPostLogReflection(log: {
  trigger: TriggerType | null;
  emotion: Emotion | null;
}): Promise<string | null> {
  if (!aiConfigured()) return null;
  if (Math.random() > REFLECTION_CHANCE) return null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const usedToday = await countAiMessagesSince('post_log_reflection', startOfDay.toISOString());
  if (usedToday >= MAX_REFLECTIONS_PER_DAY) return null;

  try {
    const messages = await coachMessages(
      `I just logged a smoke. Trigger: ${log.trigger ?? 'unknown'}. Feeling: ${log.emotion ?? 'unknown'}. ` +
        'Give one short, gentle reflection (max 45 words) about the pattern you see in my context, plus one tiny concrete thing to try next time this trigger hits. No shaming.',
    );
    const text = (await chatCompletion(messages, { maxTokens: 120 })).trim();
    await insertAiMessage('post_log_reflection', text, localDayKey());
    return text;
  } catch {
    return null;
  }
}

/** Craving SOS chat — real-time coaching. History is UI messages, newest last. */
export async function sosChatReply(
  history: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const profile = useProfileStore.getState().profile;
  if (!profile) throw new Error('no profile');
  const lastSmokeAt = useLogsStore.getState().lastSmokeAt;
  const context = await buildContextJSON(profile, lastSmokeAt);

  const messages: ChatMessage[] = [
    { role: 'system', content: `${COACH_SYSTEM}\n${languageInstruction()}` },
    {
      role: 'system',
      content: `The user pressed the SOS button — they are riding a craving RIGHT NOW. Coach them through it in real time: short messages (1-3 sentences), one step at a time. Ground them, buy minutes, remind them the wave passes in ~5 minutes. Use their own quit reason if it helps.\nUser context JSON:\n${JSON.stringify(context)}`,
    },
    ...history.slice(-12),
  ];
  return (await chatCompletion(messages, { maxTokens: 160 })).trim();
}

/**
 * Weekly insight — one per ISO week, cached. Trends, one honest observation,
 * one concrete tactic, one win. Null when uncached and unreachable.
 */
export async function getWeeklyInsight(force = false): Promise<string | null> {
  // Cache per ISO week AND language, so switching language regenerates the
  // report in the new language instead of serving a stale one.
  const cacheKey = `${isoWeekKey()}:${getLang()}`;
  if (!force) {
    const cached = await getAiMessageByMeta('weekly_report', cacheKey);
    if (cached) return cached.content;
  }
  if (!aiConfigured()) return null;

  try {
    const messages = await coachMessages(
      'Write my weekly insight report from the context (max 120 words), as four short parts with these exact bold headers: **Trend**, **One honest observation**, **Try this week**, **A win to keep**. Be specific to my numbers, not generic.',
    );
    const text = (await chatCompletion(messages, { maxTokens: 300 })).trim();
    await insertAiMessage('weekly_report', text, cacheKey);
    return text;
  } catch {
    return null;
  }
}

/**
 * Gradual-mode tapering plan as validated JSON. Falls back to null (callers
 * keep the linear taper) when the AI is unreachable or returns junk.
 */
export async function generateReductionPlan(profile: UserProfile): Promise<ReductionPlan | null> {
  if (!aiConfigured()) return null;
  try {
    const baseline = baselinePerDay(profile);
    const messages = await coachMessages(
      `Create my tapering schedule. Baseline: ${baseline} units/day. Rules: 6-10 weeks total, week 1 no more than the baseline, each week's daily_target <= the previous week's, final week must be exactly 0. ` +
        'Respond with ONLY JSON: {"weeks":[{"week":1,"daily_target":<number>},...],"note":"<one encouraging sentence>"}',
    );
    const raw = await chatCompletion(messages, { maxTokens: 400, json: true });
    const plan = parseReductionPlan(raw);
    if (!plan) return null;
    await useSettingsStore.getState().set('reduction_plan', JSON.stringify(plan));
    return plan;
  } catch {
    return null;
  }
}
