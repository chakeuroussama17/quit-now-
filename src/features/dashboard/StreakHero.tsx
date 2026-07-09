import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Lungs } from '@/components/ui/Lungs';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { getDailySmokeQuantities } from '@/db/statsRepo';
import { useT } from '@/i18n';
import { useLogsStore } from '@/state/useLogsStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { baselinePerDay } from '@/utils/baseline';
import { gradualLungProgress } from '@/utils/lungs';
import { getDailyTargetFor } from '@/utils/reduction';

import { CravingSpark } from './CravingSpark';

const PAGES = 2;
const AUTO_SWIPE_MS = 6000;

/**
 * Gradual-reduction hero: a two-page carousel that auto-advances.
 *  1. Today's count against the plan's daily target (a ring).
 *  2. Lungs that fill as they cut down — and drain back when they smoke.
 * (Cold turkey gets the filling lungs full-time — see LungsHero.)
 */
export function StreakHero({ profile }: { profile: UserProfile }) {
  const t = useT();
  const todayQuantity = useLogsStore((s) => s.todaySmokedQuantity);
  const lastSmokeAt = useLogsStore((s) => s.lastSmokeAt);
  const planJson = useSettingsStore((s) => s.values['reduction_plan']);

  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [avgPerDay, setAvgPerDay] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Keep the "time since last cigarette" term fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDailySmokeQuantities(7).then((days) => {
      if (cancelled) return;
      const total = days.reduce((sum, d) => sum + d.value, 0);
      setAvgPerDay(days.length > 0 ? total / days.length : 0);
    });
    return () => {
      cancelled = true;
    };
  }, [todayQuantity, lastSmokeAt]);

  // Auto-swipe between the two pages.
  useEffect(() => {
    if (width === 0) return;
    const id = setInterval(() => {
      setPage((current) => {
        const next = (current + 1) % PAGES;
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, AUTO_SWIPE_MS);
    return () => clearInterval(id);
  }, [width]);

  const target = getDailyTargetFor(profile, planJson);
  const over = todayQuantity > target;
  const ratio = target > 0 ? Math.min(1, todayQuantity / target) : todayQuantity > 0 ? 1 : 0;

  const lungProgress = gradualLungProgress({
    baselinePerDay: baselinePerDay(profile),
    avgPerDayLast7: avgPerDay,
    msSinceLastSmoke: lastSmokeAt ? now - new Date(lastSmokeAt).getTime() : 48 * 3_600_000,
  });

  return (
    <Card style={styles.card}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setPage(Math.round(e.nativeEvent.contentOffset.x / width))
            }
          >
            {/* Page 1 — today vs. target */}
            <View style={[styles.page, { width }]}>
              <AppText variant="micro" color={colors.textSecondary}>
                {t('home.todayTarget')}
              </AppText>
              <View style={styles.ringWrap}>
                <ProgressRing progress={ratio} size={186} color={over ? colors.amber : colors.accent}>
                  <View style={styles.bigRow}>
                    <AppText variant="display" color={over ? colors.amber : colors.accent}>
                      {todayQuantity}
                    </AppText>
                    <AppText variant="h2" color={colors.textMuted} style={styles.bigSuffix}>
                      /{target}
                    </AppText>
                  </View>
                </ProgressRing>
              </View>
              <AppText variant="caption" color={colors.textSecondary} style={styles.centered}>
                {over
                  ? t('home.overTarget')
                  : t('home.underTarget', { left: Math.max(0, target - todayQuantity) })}
              </AppText>
            </View>

            {/* Page 2 — lungs recovering as they cut down */}
            <View style={[styles.page, { width }]}>
              <AppText variant="micro" color={colors.textSecondary}>
                {t('home.lungsPct', { pct: Math.floor(lungProgress * 100) })}
              </AppText>
              <Lungs progress={lungProgress} size={196} />
              <AppText variant="caption" color={colors.textSecondary} style={styles.centered}>
                {t('home.lungsCutDown')}
              </AppText>
            </View>
          </ScrollView>
        )}
      </View>

      <View style={styles.dots}>
        {Array.from({ length: PAGES }, (_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <CravingSpark />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  page: { alignItems: 'center', gap: spacing.sm },
  centered: { textAlign: 'center', paddingHorizontal: spacing.md },
  ringWrap: { alignItems: 'center', marginVertical: spacing.sm },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  bigSuffix: { paddingBottom: 4 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: { backgroundColor: colors.accent, width: 18 },
});
