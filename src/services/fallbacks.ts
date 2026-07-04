/**
 * Bundled offline fallbacks. The app must feel complete with no network and
 * no proxy configured — AI is an enhancement, never a dependency.
 */

export const FALLBACK_MOTIVATION: string[] = [
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
  'A craving peaks in about three minutes. You can do anything for three minutes.',
  'The cigarette never solved the problem. It just paused your ability to deal with it.',
  'Missing it sometimes doesn’t mean you need it. It means you’re human.',
  'Your brain is rewiring right now. The boredom you feel is construction noise.',
  'Don’t count the days you have left. Count the repairs already done.',
  'You quit once per craving. That’s the real math — and you keep winning it.',
  'Stress will come either way. Smoking just added a second problem to it.',
  'The smell is gone. People notice. You’ve already changed.',
  'Being a non-smoker isn’t a loss of identity. It’s the recovery of one.',
  'The money is real. The minutes are real. The freedom is real.',
  'Nicotine tells you it’s the cure for the itch it causes. You’ve seen the trick now.',
  'Hard days don’t undo clean days. They prove them.',
  'You are not white-knuckling forever. It genuinely gets easier. That’s biology, not a slogan.',
  'The craving wants an argument. Give it a glass of water instead.',
  'Withdrawal is the feeling of winning, mislabeled.',
  'Nobody smokes one. You know that. That’s why you’re here.',
  'You’re building proof, log by log, that you keep your word to yourself.',
  'Fresh air is an acquired taste. You’re acquiring it.',
  'Your heart rate dropped within 20 minutes of your last one. It hasn’t stopped thanking you.',
  'This isn’t about willpower. It’s about strategy — and you have one.',
  'A bad hour doesn’t need a cigarette. It needs to be a bad hour, and then end.',
  'Habits die in daylight. Every log shines a light on yours.',
  'You’ve made it through today’s hardest craving before. It’s on your record.',
  'Quitting is boring sometimes. Boring is the sound of it working.',
  'The urge always lies about its size. Wait it out and watch it shrink.',
  'Your taste buds are back. Coffee actually tastes like coffee now.',
  'Think of the person you listed in your reasons. They’d be proud of this exact moment.',
  'You can’t control the craving arriving. You fully control what happens next.',
  'Cigarettes cost you twice: the money and the minutes. You’re reclaiming both.',
  'The goal isn’t to never want one. It’s to never need one. You’re closer than yesterday.',
  'Somewhere in you the air is already cleaner. Act like the person who did that.',
  'A craving resisted at 9pm is worth two resisted at noon. Nights build the muscle.',
  'You don’t have to quit forever today. Just today.',
  'The story ends with you free. This chapter is just the interesting part.',
  'Every ex-smoker was exactly where you are. Every single one kept going.',
];

/** Bahasa Melayu motivation pool — shorter list, rotates on its own length. */
export const FALLBACK_MOTIVATION_MS: string[] = [
  'Keinginan itu ombak. Anda tak perlu lawan lautan — cukup bertahan melepasi yang satu ini.',
  'Keinginan yang tidak anda layan ialah tabiat yang sedang lupus.',
  'Paru-paru anda tak minta kesempurnaan. Ia minta masa — dan anda sedang memberikannya.',
  'Anda sudah selamat melepasi setiap keinginan yang pernah datang. Semuanya.',
  'Minggu-minggu awal paling bising. Selepas ini semakin senyap.',
  'Setiap jam bebas rokok, tubuh anda diam-diam membaiki sesuatu.',
  'Anda bukan melepaskan sesuatu. Anda mengambil semula sesuatu.',
  'Satu keputusan, diulang-ulang. Itulah sahaja maksud berhenti.',
  'Tersasar bukan hukuman. Trend yang dikira — dan anda yang membentuknya.',
  'Keinginan memuncak dalam tiga minit. Anda mampu bertahan tiga minit.',
  'Rokok tak pernah menyelesaikan masalah. Ia cuma menangguhkan kemampuan anda menghadapinya.',
  'Hari yang sukar tidak memadam hari yang bersih. Ia membuktikannya.',
  'Udara segar itu citarasa yang dipelajari. Anda sedang mempelajarinya.',
  'Anda tak perlu berhenti selamanya hari ini. Cukup untuk hari ini sahaja.',
  'Setiap bekas perokok pernah berada di tempat anda sekarang. Setiap seorang terus melangkah.',
];

/** Offline coaching lines for the SOS chat when the API is unreachable. */
export const FALLBACK_SOS: string[] = [
  'I’m offline right now, but you don’t need me for this: breathe in for 4, hold for 7, out for 8. Three rounds. The craving will crest and fall — they always do, usually within 5 minutes.',
  'Can’t reach the coach service — so here’s the play: drink a glass of water slowly, then step away from where you are right now. Movement + minutes beats the urge.',
  'No connection, but the method still works: name what triggered this (stress? boredom?), say it out loud, and give the craving 5 minutes to die on its own. It will.',
];

export const FALLBACK_SOS_MS: string[] = [
  'Saya di luar talian sekarang, tapi anda tak perlukan saya untuk ini: tarik nafas 4 saat, tahan 7, hembus 8. Tiga pusingan. Keinginan akan memuncak dan surut — selalunya dalam 5 minit.',
  'Tak dapat hubungi jurulatih — jadi ini langkahnya: minum segelas air perlahan-lahan, kemudian beredar dari tempat anda sekarang. Pergerakan + masa menewaskan keinginan.',
  'Tiada sambungan, tapi kaedahnya tetap sama: namakan pencetusnya (tekanan? bosan?), sebut kuat-kuat, dan beri keinginan itu 5 minit untuk mati sendiri. Ia pasti mati.',
];

export function fallbackMotivationForDay(dayOfYear: number, lang: 'en' | 'ms' = 'en'): string {
  const pool = lang === 'ms' ? FALLBACK_MOTIVATION_MS : FALLBACK_MOTIVATION;
  return pool[dayOfYear % pool.length];
}

export function randomFallbackSos(lang: 'en' | 'ms' = 'en'): string {
  const pool = lang === 'ms' ? FALLBACK_SOS_MS : FALLBACK_SOS;
  return pool[Math.floor(Math.random() * pool.length)];
}
