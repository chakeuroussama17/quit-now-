import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TrendLine } from '@/components/charts/TrendLine';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { getCravingWeekDelta, getDailyCravingStats, getLongestGapDays } from '@/db/statsRepo';
import { rankProgress } from '@/features/ranks/rankProgress';
import { useT, type TKey } from '@/i18n';
import { useLogsStore } from '@/state/useLogsStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { getDailyTargetFor } from '@/utils/reduction';
import { durationParts, formatDuration, formatShortDate } from '@/utils/time';
import { streakStart } from '@/utils/streak';

interface StreakHeroProps {
  profile: UserProfile;
}

/**
 * The hero (mockup 1): centered streak with the 7-day craving sparkline and
 * week-over-week delta folded in. Tapping the sparkline area opens Stats.
 */
export function StreakHero({ profile }: StreakHeroProps) {
  const t = useT();
  const router = useRouter();
  const lastSmokeAt = useLogsStore((s) => s.lastSmokeAt);
  const todayQuantity = useLogsStore((s) => s.todaySmokedQuantity);
  const todayResisted = useLogsStore((s) => s.todayCravingsResisted);
  const planJson = useSettingsStore((s) => s.values['reduction_plan']);
  const [now, setNow] = useState(() => Date.now());
  const [spark, setSpark] = useState<number[]>([]);
  const [delta, setDelta] = useState<number | null>(null);
  const [longestDays, setLongestDays] = useState(0);

  // Live counter — a 30s tick keeps the minutes fresh without burning battery.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getDailyCravingStats(7),
      getCravingWeekDelta(),
      getLongestGapDays(profile.programStartDate),
    ]).then(([days, weekDelta, longest]) => {
      if (cancelled) return;
      setSpark(days.map((d) => d.count));
      setDelta(weekDelta);
      setLongestDays(longest);
    });
    return () => {
      cancelled = true;
    };
  }, [profile, todayQuantity, todayResisted, lastSmokeAt]);

  if (profile.quitMode === 'gradual') {
    const target = getDailyTargetFor(profile, planJson);
    const progress = target > 0 ? todayQuantity / target : todayQuantity > 0 ? 2 : 1;
    const over = todayQuantity > target;
    return (
      <Card style={styles.card}>
        <AppText variant="micro" color={colors.textSecondary} style={styles.centered}>
          {t('home.todayTarget')}
        </AppText>
        <View style={styles.bigRow}>
          <AppText variant="display" color={over ? colors.amber : colors.accent}>
            {todayQuantity}
          </AppText>
          <AppText variant="h2" color={colors.textMuted} style={styles.bigSuffix}>
            / {target}
          </AppText>
        </View>
        <ProgressBar progress={progress} />
        <AppText variant="caption" color={colors.textSecondary} style={styles.centered}>
          {over
            ? t('home.overTarget')
            : t('home.underTarget', { left: Math.max(0, target - todayQuantity) })}
        </AppText>
        <SparkSection spark={spark} delta={delta} onPress={() => router.push('/stats')} />
      </Card>
    );
  }

  // Cold turkey
  const { startMs, pending } = streakStart(profile, lastSmokeAt, now);

  if (pending) {
    return (
      <Card style={styles.card}>
        <AppText variant="micro" color={colors.textSecondary} style={styles.centered}>
          {t('home.quitDay')}
        </AppText>
        <AppText variant="display" color={colors.accent} style={styles.centered}>
          {formatShortDate(profile.quitDate!)}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} style={styles.centered}>
          {t('home.quitStartsIn', { duration: formatDuration(startMs - now) })}
        </AppText>
      </Card>
    );
  }

  const streakMs = Math.max(0, now - startMs);
  const parts = durationParts(streakMs);
  const bigValue = parts.days > 0 ? String(parts.days) : `${parts.hours}h`;
  const bigUnit =
    parts.days > 0 ? (parts.days === 1 ? t('common.day') : t('common.days')) : t('home.streak');
  const longestShown = Math.max(parts.days, Math.floor(longestDays));

  const rank = rankProgress(parts.days);

  return (
    <Card style={styles.card}>
      <AppText variant="micro" color={colors.textSecondary} style={styles.centered}>
        {t('home.streak')}
      </AppText>

      <View style={styles.ringWrap}>
        <ProgressRing progress={rank.progress} size={192}>
          <AppText variant="display" color={colors.accent}>
            {bigValue}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.ringUnit}>
            {bigUnit}
          </AppText>
        </ProgressRing>
      </View>

      <AppText variant="caption" color={colors.accent} style={styles.centered}>
        {rank.next
          ? t('home.toRank', {
              days: rank.daysToNext,
              rank: t(`rank.${rank.next.day}.name` as TKey),
            })
          : t('home.topRank')}
      </AppText>

      <AppText variant="caption" color={colors.textMuted} style={styles.centered}>
        {t('home.streakSince', {
          duration: formatDuration(streakMs),
          days: longestShown,
          unit: longestShown === 1 ? t('common.day') : t('common.days'),
        })}
      </AppText>
      <SparkSection spark={spark} delta={delta} onPress={() => router.push('/stats')} />
    </Card>
  );
}

/** "Cravings, last 7 days" + week-over-week % + sparkline. */
function SparkSection({
  spark,
  delta,
  onPress,
}: {
  spark: number[];
  delta: number | null;
  onPress: () => void;
}) {
  const t = useT();
  if (spark.length === 0 || spark.every((v) => v === 0)) return null;
  const improving = delta != null && delta < 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Open full stats">
      <View style={styles.sparkHeader}>
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
  card: { gap: spacing.sm },
  centered: { textAlign: 'center' },
  ringWrap: { alignItems: 'center', marginVertical: spacing.md },
  ringUnit: { marginTop: -2 },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  bigSuffix: { paddingBottom: 4 },
  sparkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
