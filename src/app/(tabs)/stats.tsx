import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BreakdownBars } from '@/components/charts/BreakdownBars';
import { Heatmap } from '@/components/charts/Heatmap';
import { Meter } from '@/components/charts/Meter';
import { TrendLine } from '@/components/charts/TrendLine';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { EMOTION_OPTIONS, TRIGGER_OPTIONS } from '@/features/logging/options';
import { WeeklyInsightCard } from '@/features/stats/WeeklyInsightCard';
import { useStatsData } from '@/features/stats/useStatsData';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, spacing } from '@/theme';
import { getDailyTargetFor } from '@/utils/reduction';

const TRIGGER_LABELS = Object.fromEntries(TRIGGER_OPTIONS.map((o) => [o.value, o.label]));
const EMOTION_LABELS = Object.fromEntries(EMOTION_OPTIONS.map((o) => [o.value, o.label]));

function Section({
  title,
  caption,
  children,
}: PropsWithChildren<{ title: string; caption?: string }>) {
  return (
    <Card style={styles.section}>
      <AppText variant="micro" color={colors.textSecondary}>
        {title}
      </AppText>
      {children}
      {caption ? (
        <AppText variant="caption" color={colors.textMuted}>
          {caption}
        </AppText>
      ) : null}
    </Card>
  );
}

/** Sparse x labels for long ranges: weekday initials at 7d, weekly marks at 30d. */
function xLabels(days: { day: string }[]): string[] {
  if (days.length <= 7) {
    return days.map((d) =>
      new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' }),
    );
  }
  return days.map((d, i) =>
    i % 7 === 0 || i === days.length - 1
      ? new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })
      : '',
  );
}

export default function StatsScreen() {
  const profile = useProfileStore((s) => s.profile);
  const planJson = useSettingsStore((s) => s.values['reduction_plan']);
  const [range, setRange] = useState<7 | 30>(7);
  const data = useStatsData(range);

  if (!profile || !data.loaded) {
    return (
      <Screen>
        <View style={styles.skeletons}>
          <Skeleton height={34} width={120} />
          <Skeleton height={190} borderRadius={20} />
          <Skeleton height={160} borderRadius={20} />
          <Skeleton height={140} borderRadius={20} />
        </View>
      </Screen>
    );
  }

  const hasAnyData =
    data.daily.some((d) => d.value > 0) ||
    data.winRate.total > 0 ||
    data.heatmap.flat().some((n) => n > 0);

  if (!hasAnyData) {
    return (
      <Screen>
        <View style={styles.empty}>
          <View style={styles.iconWrap}>
            <Ionicons name="pulse-outline" size={32} color={colors.accent} />
          </View>
          <AppText variant="h2" style={styles.emptyTitle}>
            Your patterns will show here
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.emptyBody}>
            Log smokes and cravings and this screen fills with your trends, your risky hours and
            your win rate.
          </AppText>
        </View>
      </Screen>
    );
  }

  const isVape = profile.products[0] === 'vape';
  const target = profile.quitMode === 'gradual' ? getDailyTargetFor(profile, planJson) : null;
  const smokedInRange = data.daily.reduce((sum, d) => sum + d.value, 0);
  const nicotineMg = isVape && profile.vapeNicotineMgMl ? profile.vapeNicotineMgMl : null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppText variant="h1">Stats</AppText>
          <View style={styles.rangeChips}>
            <Chip label="7d" size="sm" selected={range === 7} onPress={() => setRange(7)} />
            <Chip label="30d" size="sm" selected={range === 30} onPress={() => setRange(30)} />
          </View>
        </View>

        <WeeklyInsightCard />

        <Section
          title="Consumption"
          caption={`${Math.round(smokedInRange * 10) / 10} ${isVape ? 'ml' : 'units'} over the last ${range} days`}
        >
          <TrendLine
            data={data.daily.map((d) => d.value)}
            labels={xLabels(data.daily)}
            target={target}
          />
        </Section>

        {nicotineMg != null && (
          <Section title="Nicotine" caption={`mg of nicotine per day at ${nicotineMg} mg/ml`}>
            <TrendLine
              data={data.daily.map((d) => Math.round(d.value * nicotineMg * 10) / 10)}
              labels={xLabels(data.daily)}
            />
          </Section>
        )}

        <Section
          title="When it happens"
          caption={
            data.heatmapSource === 'smoke'
              ? 'Hour of day × day of week — your risky hours, last 30 days of logs'
              : 'When cravings hit — hour of day × day of week'
          }
        >
          <Heatmap matrix={data.heatmap} />
        </Section>

        {data.triggers.length > 0 && (
          <Section title="What triggers it">
            <BreakdownBars
              items={data.triggers.map((t) => ({
                label: TRIGGER_LABELS[t.key] ?? t.key,
                count: t.count,
              }))}
            />
          </Section>
        )}

        {data.emotions.length > 0 && (
          <Section title="How it feels">
            <BreakdownBars
              items={data.emotions.map((e) => ({
                label: EMOTION_LABELS[e.key] ?? e.key,
                count: e.count,
              }))}
            />
          </Section>
        )}

        {data.winRate.total > 0 && (
          <Section title="Craving win rate">
            <Meter
              ratio={data.winRate.resisted / data.winRate.total}
              label={`${data.winRate.resisted} resisted of ${data.winRate.total} cravings`}
              detail="Every resisted craving weakens the next one."
            />
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletons: { paddingTop: spacing.lg, gap: spacing.md },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rangeChips: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.md, marginTop: spacing.md },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { textAlign: 'center' },
  emptyBody: { textAlign: 'center', marginTop: spacing.sm },
});
