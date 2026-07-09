import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Lungs } from '@/components/ui/Lungs';
import { useT, type TFunction } from '@/i18n';
import { useLogsStore } from '@/state/useLogsStore';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { lungFillPercent, lungFillProgress } from '@/utils/lungs';
import { streakStart } from '@/utils/streak';
import { formatDuration, formatShortDate } from '@/utils/time';

import { CravingSpark } from './CravingSpark';

interface Unit {
  value: number;
  label: string;
}

/** Three live units: days/hours/minutes once past a day, else h/m/s. */
function counterUnits(ms: number, t: TFunction): Unit[] {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return [
      { value: days, label: t('home.uDays') },
      { value: hours, label: t('home.uHours') },
      { value: minutes, label: t('home.uMinutes') },
    ];
  }
  return [
    { value: hours, label: t('home.uHours') },
    { value: minutes, label: t('home.uMinutes') },
    { value: seconds, label: t('home.uSeconds') },
  ];
}

/**
 * The cold-turkey hero: lungs that fill with green liquid as the streak grows
 * (100% at 30 days), above a live smoke-free counter.
 */
export function LungsHero({ profile }: { profile: UserProfile }) {
  const t = useT();
  const lastSmokeAt = useLogsStore((s) => s.lastSmokeAt);
  const [now, setNow] = useState(() => Date.now());

  // Ticks every second so the counter is genuinely alive.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { startMs, pending } = streakStart(profile, lastSmokeAt, now);

  if (pending) {
    return (
      <Card style={styles.card}>
        <Lungs progress={0} size={220} />
        <AppText variant="micro" color={colors.textSecondary} style={styles.centered}>
          {t('home.quitDay')}
        </AppText>
        <AppText variant="h2" color={colors.accent} style={styles.centered}>
          {formatShortDate(profile.quitDate!)}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} style={styles.centered}>
          {t('home.quitStartsIn', { duration: formatDuration(startMs - now) })}
        </AppText>
      </Card>
    );
  }

  const streakMs = Math.max(0, now - startMs);
  const pct = lungFillPercent(streakMs);
  const units = counterUnits(streakMs, t);

  return (
    <Card style={styles.card}>
      <Lungs progress={lungFillProgress(streakMs)} size={220} />

      <View style={styles.pctRow}>
        <AppText variant="micro" color={colors.accent}>
          {pct >= 100 ? t('home.lungsFull') : t('home.lungsPct', { pct })}
        </AppText>
      </View>

      <View style={styles.counter}>
        {units.map((u) => (
          <View key={u.label} style={styles.unit}>
            <AppText variant="stat">{u.value}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {u.label}
            </AppText>
          </View>
        ))}
      </View>

      <CravingSpark />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, alignItems: 'stretch' },
  centered: { textAlign: 'center' },
  pctRow: { alignItems: 'center', marginTop: spacing.xs },
  counter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  unit: { alignItems: 'center', gap: 2, flex: 1 },
});
