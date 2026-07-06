import { getLang, pickPool, type Lang } from '@/i18n';

/**
 * Post-log acknowledgments. Calm, adult, zero shame — the log itself is the win.
 * Phase 3 occasionally replaces these with a short AI reflection.
 */
const ACK_LINES: Partial<Record<Lang, string[]>> & { en: string[] } = {
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
  fr: [
    'Enregistré. Le motif compte plus que ce seul moment.',
    'Noté. L’honnêteté est tout le jeu ici.',
    'D’accord. Une entrée, aucun jugement.',
    'Enregistré. Connaître ses déclencheurs, c’est ainsi qu’on les bat.',
    'Enregistré. Chaque entrée affine votre carte de cette habitude.',
  ],
  ar: [
    'سُجّلت. النمط أهم من هذه اللحظة الواحدة.',
    'حسنًا. الصدق هو كل اللعبة هنا.',
    'تمام. تسجيل واحد، بلا أحكام.',
    'دُوّنت. معرفة محفزاتك هي طريقك للتغلب عليها.',
    'سُجّلت. كل إدخال يجعل خريطة هذه العادة أوضح.',
  ],
};

/**
 * Resisted-craving lines. Deliberately warmer than the smoke acknowledgments —
 * wins get celebrated more than slips get discouraged.
 */
const RESISTED_LINES: Partial<Record<Lang, string[]>> & { en: string[] } = {
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
  fr: [
    'C’est ça, le muscle. La plupart des envies meurent en 5 minutes — vous avez tenu plus longtemps.',
    'Une envie de moins. Chacune que vous surfez affaiblit la suivante.',
    'Victoire enregistrée. C’est exactement comme ça qu’on arrête vraiment.',
    'Solide. Votre cerveau vient d’apprendre qu’une envie n’est pas un ordre.',
    'Vous avez tenu. Une répétition de plus pour la personne que vous devenez.',
  ],
  ar: [
    'هذه هي العضلة. معظم الرغبات تموت خلال ٥ دقائق — وقد صمدت أطول منها.',
    'رغبة واحدة سقطت. كل واحدة تركبها تُضعف التي بعدها.',
    'سُجّل الانتصار. هكذا يحدث الإقلاع فعلًا.',
    'قوي. تعلّم دماغك للتو أن الرغبة ليست أمرًا.',
    'ثبتّ على الخط. هذه تمرينة للشخص الذي تصبحه.',
  ],
};

export function randomAckLine(): string {
  const pool = pickPool(ACK_LINES, getLang());
  return pool[Math.floor(Math.random() * pool.length)];
}

export function randomResistedLine(): string {
  const pool = pickPool(RESISTED_LINES, getLang());
  return pool[Math.floor(Math.random() * pool.length)];
}
