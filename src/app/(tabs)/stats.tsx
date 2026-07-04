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
import { WeeklyInsightCard } from '@/features/stats/WeeklyInsightCard';
import { useStatsData } from '@/features/stats/useStatsData';
import { useT, type TKey } from '@/i18n';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, spacing } from '@/theme';
import { getDailyTargetFor } from '@/utils/reduction';

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
  const t = useT();
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
            {t('stats.empty.title')}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.emptyBody}>
            {t('stats.empty.body')}
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
          <AppText variant="h1">{t('stats.title')}</AppText>
          <View style={styles.rangeChips}>
            <Chip label="7d" size="sm" selected={range === 7} onPress={() => setRange(7)} />
            <Chip label="30d" size="sm" selected={range === 30} onPress={() => setRange(30)} />
          </View>
        </View>

        <WeeklyInsightCard />

        <Section
          title={t('stats.consumption')}
          caption={t('stats.consumptionCaption', {
            amount: Math.round(smokedInRange * 10) / 10,
            unit: isVape ? 'ml' : t('stats.units'),
            days: range,
          })}
        >
          <TrendLine
            data={data.daily.map((d) => d.value)}
            labels={xLabels(data.daily)}
            target={target}
          />
        </Section>

        {nicotineMg != null && (
          <Section
            title={t('stats.nicotine')}
            caption={t('stats.nicotineCaption', { mg: nicotineMg })}
          >
            <TrendLine
              data={data.daily.map((d) => Math.round(d.value * nicotineMg * 10) / 10)}
              labels={xLabels(data.daily)}
            />
          </Section>
        )}

        <Section
          title={t('stats.when')}
          caption={data.heatmapSource === 'smoke' ? t('stats.whenSmoke') : t('stats.whenCravings')}
        >
          <Heatmap matrix={data.heatmap} />
        </Section>

        {data.triggers.length > 0 && (
          <Section title={t('stats.triggers')}>
            <BreakdownBars
              items={data.triggers.map((item) => ({
                label: t(`trigger.${item.key}` as TKey),
                count: item.count,
              }))}
              otherLabel={t('stats.other')}
            />
          </Section>
        )}

        {data.emotions.length > 0 && (
          <Section title={t('stats.emotions')}>
            <BreakdownBars
              items={data.emotions.map((item) => ({
                label: t(`emotion.${item.key}` as TKey),
                count: item.count,
              }))}
              otherLabel={t('stats.other')}
            />
          </Section>
        )}

        {data.winRate.total > 0 && (
          <Section title={t('stats.winRate')}>
            <Meter
              ratio={data.winRate.resisted / data.winRate.total}
              label={t('stats.winRateLabel', {
                resisted: data.winRate.resisted,
                total: data.winRate.total,
              })}
              detail={t('stats.winRateDetail')}
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
