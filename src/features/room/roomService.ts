import { getLang, pickPool, type Lang } from '@/i18n';
import { aiConfigured, chatCompletion, type ChatMessage } from '@/services/aiClient';
import { languageInstruction } from '@/services/aiService';
import { buildContextJSON } from '@/services/contextBuilder';
import { useLogsStore } from '@/state/useLogsStore';
import { useProfileStore } from '@/state/useProfileStore';

/**
 * PRIVACY: Room conversations are the most sensitive data in the app. Only the
 * current session's messages are sent to the AI — nothing is logged, nothing
 * feeds stats or gamification, and the context JSON excludes room takeaways.
 */

/** "Mind" — a separate persona from the Coach: gentle yet firm. */
const MIND_SYSTEM = `You are "Mind", the private emotional-support companion inside Exhale, a quit-smoking app. You are NOT the coach — you are a warm, grounded listener with the backbone of a good mentor.
Rules:
- Validate the feeling, but never co-sign excuses or avoidance.
- One question at a time. Short replies (2-4 sentences). Let the user do most of the talking.
- Connect emotional patterns to smoking urges when relevant.
- You may discuss stress, emotions, cravings, self-esteem, family, relationships and work pressure AS THEY RELATE to the user's wellbeing and quit journey.
- STRICT TOPIC LOCK: politely refuse anything else (coding, news, general Q&A, medical or medication advice) and gently return to how they're doing.
- Never diagnose ("you have anxiety/depression"), never prescribe. Describe feelings in plain words; suggest professional support when things sound heavy.
- CRISIS PROTOCOL (overrides everything): at any sign of self-harm, abuse, or severe hopelessness, drop all coaching, respond with pure care, and encourage reaching a professional or someone they trust immediately.`;

/**
 * Offline listener replies — reflective, one question at a time. Rotated by
 * turn count so a conversation without the AI still moves somewhere.
 */
const OFFLINE_MIND: Partial<Record<Lang, string[]>> & { en: string[] } = {
  en: [
    'I’m here, and I’m listening. What part of it is sitting heaviest on you right now?',
    'That makes sense. Where do you feel it most — your chest, your jaw, your hands?',
    'Say more if you want. What happened right before the urge showed up?',
    'If the cigarette could talk right now, what is it promising you? And does it ever keep that promise?',
    'You don’t have to fix anything tonight. What would feel like one small kindness to yourself in the next hour?',
    'What would you say to them if there were no consequences at all?',
    'You’ve carried this all day. What’s one thing you’d like to put down before bed?',
  ],
  ms: [
    'Saya di sini, dan saya mendengar. Bahagian mana yang paling berat buat anda sekarang?',
    'Masuk akal. Di mana anda paling terasa — dada, rahang, atau tangan?',
    'Ceritakan lagi kalau mahu. Apa yang berlaku sejurus sebelum keinginan itu muncul?',
    'Kalau rokok itu boleh bercakap sekarang, apa yang ia janjikan? Dan pernahkah ia menunaikannya?',
    'Anda tak perlu selesaikan apa-apa malam ini. Apa satu kebaikan kecil untuk diri anda dalam sejam ini?',
    'Apa yang anda akan katakan kepada mereka jika tiada apa-apa akibat langsung?',
    'Anda memikul ini sepanjang hari. Apa satu perkara yang anda mahu letakkan sebelum tidur?',
  ],
  fr: [
    'Je suis là, et j’écoute. Quelle partie pèse le plus lourd sur vous en ce moment ?',
    'C’est compréhensible. Où le ressentez-vous le plus — la poitrine, la mâchoire, les mains ?',
    'Dites-m’en plus si vous voulez. Que s’est-il passé juste avant que l’envie apparaisse ?',
    'Si la cigarette pouvait parler maintenant, que vous promet-elle ? Et tient-elle jamais cette promesse ?',
    'Vous n’avez rien à régler ce soir. Quelle petite gentillesse pourriez-vous vous offrir dans l’heure qui vient ?',
    'Que leur diriez-vous s’il n’y avait aucune conséquence ?',
    'Vous avez porté ça toute la journée. Qu’aimeriez-vous déposer avant de dormir ?',
  ],
  ar: [
    'أنا هنا، وأنا أصغي. أي جزء يثقل عليك أكثر الآن؟',
    'هذا منطقي. أين تشعر به أكثر — صدرك، فكّك، يداك؟',
    'أخبرني أكثر إن أردت. ماذا حدث قبل ظهور الرغبة مباشرة؟',
    'لو كانت السيجارة تتكلم الآن، بماذا تعدك؟ وهل تفي بذلك الوعد يومًا؟',
    'لست مضطرًا لإصلاح شيء الليلة. ما اللطف الصغير الذي تقدّمه لنفسك في الساعة القادمة؟',
    'ماذا كنت ستقول لهم لو لم تكن هناك أي عواقب؟',
    'حملت هذا طوال اليوم. ما الشيء الذي تودّ أن تضعه جانبًا قبل النوم؟',
  ],
};

export async function mindReply(
  history: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  if (!aiConfigured()) {
    const pool = pickPool(OFFLINE_MIND, getLang());
    const userTurns = history.filter((m) => m.role === 'user').length;
    return pool[(userTurns - 1 + pool.length) % pool.length];
  }

  const profile = useProfileStore.getState().profile;
  if (!profile) throw new Error('no profile');
  const lastSmokeAt = useLogsStore.getState().lastSmokeAt;
  // Mind gets the same context minus room takeaways (it has the live session).
  const context = await buildContextJSON(profile, lastSmokeAt);

  const messages: ChatMessage[] = [
    { role: 'system', content: `${MIND_SYSTEM}\n${languageInstruction()}` },
    { role: 'system', content: `User context JSON (background only):\n${JSON.stringify(context)}` },
    ...history.slice(-16),
  ];
  return (await chatCompletion(messages, { maxTokens: 200 })).trim();
}
