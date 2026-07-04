import { getLang, type Lang } from '@/i18n';

/**
 * Post-log acknowledgments. Calm, adult, zero shame — the log itself is the win.
 * Phase 3 occasionally replaces these with a short AI reflection.
 */
const ACK_LINES: Record<Lang, string[]> = {
  en: [
    'Logged. The pattern matters more than this one moment.',
    'Noted. Honesty is the whole game here.',
    'Okay. One log, no judgment.',
    'Recorded. Knowing your triggers is how you beat them.',
    'Logged. Every entry makes your map of this habit sharper.',
  ],
  ms: [
    'Dicatat. Corak lebih penting daripada saat yang satu ini.',
    'Baik. Kejujuran itulah kuncinya di sini.',
    'Okey. Satu catatan, tanpa penghakiman.',
    'Direkod. Mengenal pencetus ialah cara menewaskannya.',
    'Dicatat. Setiap catatan menajamkan peta tabiat anda.',
  ],
};

/**
 * Resisted-craving lines. Deliberately warmer than the smoke acknowledgments —
 * wins get celebrated more than slips get discouraged.
 */
const RESISTED_LINES: Record<Lang, string[]> = {
  en: [
    'That’s the muscle. Most cravings die within 5 minutes — you outlasted this one.',
    'One craving down. Each one you surf makes the next one weaker.',
    'Logged the win. This is exactly how quitting actually happens.',
    'Strong. Your brain just learned that a craving isn’t a command.',
    'Held the line. That’s a rep for the person you’re becoming.',
  ],
  ms: [
    'Itulah kekuatannya. Kebanyakan keinginan mati dalam 5 minit — anda bertahan lebih lama.',
    'Satu keinginan tumbang. Setiap satu yang anda tahan melemahkan yang seterusnya.',
    'Kemenangan dicatat. Beginilah sebenarnya orang berjaya berhenti.',
    'Hebat. Otak anda baru belajar bahawa keinginan bukan arahan.',
    'Anda bertahan. Itu satu latihan untuk diri yang sedang anda bina.',
  ],
};

export function randomAckLine(): string {
  const pool = ACK_LINES[getLang()];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function randomResistedLine(): string {
  const pool = RESISTED_LINES[getLang()];
  return pool[Math.floor(Math.random() * pool.length)];
}
