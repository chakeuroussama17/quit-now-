import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getHourDowMatrix } from '@/db/statsRepo';
import { getLang, pickPool, t, type Lang, type TKey } from '@/i18n';
import { useLogsStore } from '@/state/useLogsStore';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { getNextMilestone, HEALTH_MILESTONES } from '@/utils/health';
import { streakStart } from '@/utils/streak';

/**
 * Local notifications only — nothing leaves the device. The whole schedule is
 * rebuilt idempotently by syncNotifications(): cancel everything, then
 * re-schedule from current settings + data. Called on app start and whenever
 * a toggle changes.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

type Pool = Partial<Record<Lang, string[]>> & { en: string[] };

const MORNING_LINES: Pool = {
  en: [
    'New day. The only craving that matters is the next one.',
    'Your streak survived the night. Keep it company today.',
    'Coffee still works without the other thing. Prove it once today.',
    'One decision, repeated. Today is one of the repetitions.',
  ],
  ms: [
    'Hari baharu. Satu-satunya keinginan yang penting ialah yang seterusnya.',
    'Tempoh bebas rokok anda selamat semalaman. Temaninya hari ini.',
    'Kopi tetap sedap tanpa benda itu. Buktikan sekali hari ini.',
    'Satu keputusan, diulang-ulang. Hari ini salah satu ulangannya.',
  ],
  fr: [
    'Nouveau jour. La seule envie qui compte est la prochaine.',
    'Votre série a survécu à la nuit. Tenez-lui compagnie aujourd’hui.',
    'Le café marche aussi sans l’autre chose. Prouvez-le une fois aujourd’hui.',
    'Une décision, répétée. Aujourd’hui en est une répétition.',
  ],
  ar: [
    'يوم جديد. الرغبة الوحيدة التي تهمّ هي التالية.',
    'نجت فترتك من الليل. رافقها اليوم.',
    'القهوة تبقى لذيذة بدون الشيء الآخر. أثبت ذلك مرة اليوم.',
    'قرار واحد، مكرَّر. اليوم إحدى تكراراته.',
  ],
};

const EVENING_LINES: Pool = {
  en: [
    'How did today actually go? A 10-second log keeps your map honest.',
    'Before sleep: one win from today worth remembering?',
    'Day almost done. Log anything you skipped — honesty beats perfection.',
  ],
  ms: [
    'Bagaimana hari ini sebenarnya? Catatan 10 saat memastikan peta anda jujur.',
    'Sebelum tidur: ada satu kemenangan hari ini yang patut diingat?',
    'Hari hampir tamat. Catat apa yang tertinggal — kejujuran mengalahkan kesempurnaan.',
  ],
  fr: [
    'Comment s’est vraiment passée la journée ? Un journal de 10 secondes garde votre carte honnête.',
    'Avant de dormir : une victoire d’aujourd’hui à retenir ?',
    'La journée touche à sa fin. Notez ce que vous avez oublié — l’honnêteté bat la perfection.',
  ],
  ar: [
    'كيف كان يومك فعلًا؟ تسجيل من ١٠ ثوانٍ يبقي خريطتك صادقة.',
    'قبل النوم: انتصار واحد من اليوم يستحق التذكّر؟',
    'اليوم كاد ينتهي. سجّل ما تخطّيته — الصدق يغلب الكمال.',
  ],
};

// Static nudges for now; the Phase 3 spec's AI-written weekly batch can
// replace these bodies later without touching the scheduling.
const RISKY_LINES: Pool = {
  en: [
    'Your {time} pattern is coming. Step outside without it — three minutes is enough.',
    'Heads up: {time} is one of your risky hours. Water first, then decide.',
    '{time} craving incoming, if history repeats. It peaks in 90 seconds — outlast it.',
  ],
  ms: [
    'Corak {time} anda semakin hampir. Keluar sebentar tanpanya — tiga minit sudah cukup.',
    'Perhatian: {time} ialah salah satu waktu berisiko anda. Minum air dulu, kemudian putuskan.',
    'Keinginan {time} bakal tiba jika sejarah berulang. Ia memuncak dalam 90 saat — bertahanlah.',
  ],
  fr: [
    'Votre schéma de {time} approche. Sortez sans elle — trois minutes suffisent.',
    'Attention : {time} est une de vos heures à risque. De l’eau d’abord, puis décidez.',
    'Envie de {time} en approche, si l’histoire se répète. Elle culmine en 90 secondes — tenez.',
  ],
  ar: [
    'نمط {time} قادم. اخرج قليلًا بدونها — ثلاث دقائق تكفي.',
    'انتبه: {time} إحدى ساعاتك الخطرة. الماء أولًا، ثم قرّر.',
    'رغبة {time} قادمة إن تكرّر التاريخ. تبلغ ذروتها في ٩٠ ثانية — اصمد.',
  ],
};

function dayOfYear(): number {
  const start = new Date(new Date().getFullYear(), 0, 0);
  return Math.floor((Date.now() - start.getTime()) / 86_400_000);
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Top-2 hours of the week aggregated across weekdays (smoke, else cravings). */
async function riskiestHours(): Promise<number[]> {
  let matrix = await getHourDowMatrix(30, 'smoke');
  if (!matrix.flat().some((n) => n > 0)) matrix = await getHourDowMatrix(30, 'craving');
  const byHour = Array<number>(24).fill(0);
  for (const row of matrix) row.forEach((n, h) => (byHour[h] += n));
  return byHour
    .map((n, h) => ({ n, h }))
    .filter((e) => e.n > 1)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((e) => e.h);
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export async function syncNotifications(): Promise<void> {
  const settings = useSettingsStore.getState().values;
  const enabled = settings['notif_enabled'] === 'true';

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Exhale',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150],
    });
  }

  const on = (key: string) => settings[key] !== 'false'; // sub-toggles default on
  const day = dayOfYear();
  const lang = getLang();

  if (on('notif_morning')) {
    const morning = pickPool(MORNING_LINES, lang);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notif.morningTitle'),
        body: morning[day % morning.length],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 30,
      },
    });
  }

  if (on('notif_evening')) {
    const evening = pickPool(EVENING_LINES, lang);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notif.eveningTitle'),
        body: evening[day % evening.length],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 30,
      },
    });
  }

  // Pattern warnings: 15 minutes before each locally-computed risky hour.
  if (on('notif_risky')) {
    const risky = pickPool(RISKY_LINES, lang);
    const hours = await riskiestHours();
    for (const hour of hours) {
      const line = risky[(day + hour) % risky.length];
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notif.riskyTitle'),
          body: line.replace('{time}', formatHour(hour)),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hour === 0 ? 23 : hour - 1,
          minute: 45,
        },
      });
    }
  }

  // Milestone celebrations: the next 3 health milestones as one-shot dates.
  if (on('notif_milestones')) {
    const profile = useProfileStore.getState().profile;
    if (profile) {
      const lastSmokeAt = useLogsStore.getState().lastSmokeAt;
      const { startMs, pending } = streakStart(profile, lastSmokeAt);
      if (!pending) {
        const next = getNextMilestone(startMs);
        if (next) {
          const startIndex = HEALTH_MILESTONES.indexOf(next.milestone);
          for (const m of HEALTH_MILESTONES.slice(startIndex, startIndex + 3)) {
            const fireAt = new Date(startMs + m.hours * 3_600_000);
            if (fireAt.getTime() <= Date.now()) continue;
            await Notifications.scheduleNotificationAsync({
              content: {
                title: t('notif.milestoneTitle', {
                  label: t(`health.${m.id}.label` as TKey),
                }),
                body: t(`health.${m.id}.desc` as TKey),
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: fireAt,
              },
            });
          }
        }
      }
    }
  }
}
