import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getHourDowMatrix } from '@/db/statsRepo';
import { getLang, t, type Lang, type TKey } from '@/i18n';
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

const MORNING_LINES: Record<Lang, string[]> = {
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
};

const EVENING_LINES: Record<Lang, string[]> = {
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
};

// Static nudges for now; the Phase 3 spec's AI-written weekly batch can
// replace these bodies later without touching the scheduling.
const RISKY_LINES: Record<Lang, string[]> = {
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
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notif.morningTitle'),
        body: MORNING_LINES[lang][day % MORNING_LINES[lang].length],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 30,
      },
    });
  }

  if (on('notif_evening')) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notif.eveningTitle'),
        body: EVENING_LINES[lang][day % EVENING_LINES[lang].length],
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
    const hours = await riskiestHours();
    for (const hour of hours) {
      const line = RISKY_LINES[lang][(day + hour) % RISKY_LINES[lang].length];
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
