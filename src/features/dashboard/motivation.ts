import type { UserProfile } from '@/types/models';

/**
 * Daily motivation line — Phase 3 replaces this with an AI-written line
 * (1 call/day, cached in ai_messages). Until then: a deterministic rotation,
 * regularly surfacing the user's own quit reason verbatim, because their
 * words beat anything we could write.
 */
const LINES = [
  'Cravings are waves. You don’t have to fight the ocean — just outlast this one.',
  'The urge you don’t act on is the habit unlearning itself.',
  'Nobody ever regretted being a quitter of this particular thing.',
  'Your lungs don’t need perfection. They need time — and you’re giving it to them.',
  'Discomfort now is the price. Freedom is the product.',
  'You’ve already survived every craving you’ve ever had. All of them.',
  'The first weeks are the loudest. It gets quieter from here.',
  'Every hour smoke-free, your body quietly fixes something.',
  'You’re not giving something up. You’re taking something back.',
  'One decision, repeated. That’s all quitting is.',
  'The version of you five years from now is watching this week closely.',
  'Slips aren’t verdicts. The trend is what counts, and you’re shaping it.',
  'Breathing is the whole point. Everything else is detail.',
  'You don’t need to feel strong to act strong.',
  'Today’s only job: don’t let the next craving make the decision for you.',
];

function dayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

export function dailyLine(profile: UserProfile): { text: string; isOwnWords: boolean } {
  const day = dayOfYear();
  // Every third day, their own reason — verbatim — does the talking.
  if (profile.quitReasonText && day % 3 === 0) {
    return { text: `“${profile.quitReasonText}”`, isOwnWords: true };
  }
  return { text: LINES[day % LINES.length], isOwnWords: false };
}
