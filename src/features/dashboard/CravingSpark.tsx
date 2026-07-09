import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TrendLine } from '@/components/charts/TrendLine';
import { AppText } from '@/components/ui/AppText';
import { getCravingWeekDelta, getDailyCravingStats } from '@/db/statsRepo';
import { useT } from '@/i18n';
import { useLogsStore } from '@/state/useLogsStore';
import { colors, spacing } from '@/theme';

/** "Cravings, last 7 days" + week-over-week % + sparkline. Taps into Stats. */
export function CravingSpark() {
  const t = useT();
  const router = useRouter();
  const todaySmoked = useLogsStore((s) => s.todaySmokedCount);
  const todayResisted = useLogsStore((s) => s.todayCravingsResisted);
  const [spark, setSpark] = useState<number[]>([]);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDailyCravingStats(7), getCravingWeekDelta()]).then(([days, weekDelta]) => {
      if (cancelled) return;
      setSpark(days.map((d) => d.count));
      setDelta(weekDelta);
    });
    return () => {
      cancelled = true;
    };
  }, [todaySmoked, todayResisted]);

  if (spark.length === 0 || spark.every((v) => v === 0)) return null;
  const improving = delta != null && delta < 0;

  return (
    <Pressable
      onPress={() => router.push('/stats')}
      accessibilityRole="button"
      accessibilityLabel="Open full stats"
    >
      <View style={styles.header}>
        <AppText variant="caption" color={colors.textMuted}>
          {t('home.cravings7d')}
        </AppText>
        {delta != null && (
          <AppText variant="caption" color={improving ? colors.accent : colors.amber}>
            {delta > 0 ? '+' : '−'}
            {Math.abs(Math.round(delta * 100))}%
          </AppText>
        )}
      </View>
      <TrendLine data={spark} labels={[]} height={64} compact />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
