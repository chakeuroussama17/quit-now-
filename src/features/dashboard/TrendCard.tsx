import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { TrendLine } from '@/components/charts/TrendLine';
import { getDailyCravingStats, getDailySmokeQuantities } from '@/db/statsRepo';
import { useLogsStore } from '@/state/useLogsStore';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { dailyTarget } from '@/utils/baseline';
import { daysBetween } from '@/utils/time';

interface TrendData {
  values: number[];
  labels: string[];
  caption: string;
  target: number | null;
}

function weekdayInitial(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' });
}

/**
 * The 7-day trend on the home screen. Gradual mode: daily count vs target.
 * Cold turkey: craving intensity fading week over week. Tap → full stats.
 */
export function TrendCard({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const todaySmokedCount = useLogsStore((s) => s.todaySmokedCount);
  const todayResisted = useLogsStore((s) => s.todayCravingsResisted);
  const [trend, setTrend] = useState<TrendData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (profile.quitMode === 'gradual') {
        const days = await getDailySmokeQuantities(7);
        if (cancelled) return;
        setTrend({
          values: days.map((d) => d.value),
          labels: days.map((d) => weekdayInitial(d.day)),
          caption: 'Units per day vs your plan',
          target: dailyTarget(profile, daysBetween(profile.programStartDate)),
        });
      } else {
        const days = await getDailyCravingStats(7);
        if (cancelled) return;
        const hasIntensity = days.some((d) => d.avgIntensity > 0);
        setTrend({
          values: days.map((d) => (hasIntensity ? d.avgIntensity : d.count)),
          labels: days.map((d) => weekdayInitial(d.day)),
          caption: hasIntensity
            ? 'Average craving intensity — watch it fade'
            : 'Cravings logged per day',
          target: null,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, todaySmokedCount, todayResisted]);

  if (!trend) return null;

  const isEmpty = trend.values.every((v) => v === 0);

  return (
    <Pressable
      onPress={() => router.push('/stats')}
      accessibilityRole="button"
      accessibilityLabel="Open full stats"
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <Card style={styles.card}>
        <View style={styles.header}>
          <AppText variant="micro" color={colors.textSecondary}>
            Last 7 days
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </View>
        {isEmpty ? (
          <AppText variant="body" color={colors.textMuted} style={styles.empty}>
            Nothing logged yet this week. The line draws itself as you log.
          </AppText>
        ) : (
          <TrendLine data={trend.values} labels={trend.labels} target={trend.target} />
        )}
        <AppText variant="caption" color={colors.textMuted}>
          {trend.caption}
        </AppText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { paddingVertical: spacing.xl },
});
