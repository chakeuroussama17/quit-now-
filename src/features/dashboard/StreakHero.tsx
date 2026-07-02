import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLogsStore } from '@/state/useLogsStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { accentGlowShadow, colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { getDailyTargetFor } from '@/utils/reduction';
import { formatDuration, formatShortDate } from '@/utils/time';

interface StreakHeroProps {
  profile: UserProfile;
}

/** The money screen's hero: live smoke-free counter, or today-vs-target for gradual mode. */
export function StreakHero({ profile }: StreakHeroProps) {
  const lastSmokeAt = useLogsStore((s) => s.lastSmokeAt);
  const todayQuantity = useLogsStore((s) => s.todaySmokedQuantity);
  const planJson = useSettingsStore((s) => s.values['reduction_plan']);
  const [now, setNow] = useState(() => Date.now());

  // Live counter — a 30s tick keeps the minutes fresh without burning battery.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (profile.quitMode === 'gradual') {
    const target = getDailyTargetFor(profile, planJson);
    const progress = target > 0 ? todayQuantity / target : todayQuantity > 0 ? 2 : 1;
    const over = todayQuantity > target;
    return (
      <Card style={styles.card}>
        <AppText variant="micro" color={colors.textSecondary}>
          Today’s target
        </AppText>
        <View style={styles.gradualRow}>
          <AppText variant="display" color={over ? colors.amber : colors.accent}>
            {todayQuantity}
          </AppText>
          <AppText variant="h2" color={colors.textMuted} style={styles.ofTarget}>
            / {target}
          </AppText>
        </View>
        <ProgressBar progress={progress} />
        <AppText variant="caption" color={colors.textSecondary} style={styles.caption}>
          {over
            ? 'Over target today — it happens. Tomorrow is a clean slate.'
            : `${Math.max(0, target - todayQuantity)} left within plan. Slower is still forward.`}
        </AppText>
      </Card>
    );
  }

  // Cold turkey
  const quitTime = profile.quitDate ? new Date(profile.quitDate).getTime() : now;
  if (quitTime > now) {
    return (
      <Card style={styles.card}>
        <AppText variant="micro" color={colors.textSecondary}>
          Quit day
        </AppText>
        <AppText variant="display" color={colors.accent}>
          {formatShortDate(profile.quitDate!)}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} style={styles.caption}>
          Starts in {formatDuration(quitTime - now)}. Use the time to notice your triggers.
        </AppText>
      </Card>
    );
  }

  const lastSmokeTime = lastSmokeAt ? new Date(lastSmokeAt).getTime() : 0;
  const streakStart = Math.max(quitTime, lastSmokeTime);
  const streakMs = Math.max(0, now - streakStart);

  return (
    <Card style={styles.card}>
      <AppText variant="micro" color={colors.textSecondary}>
        Smoke-free
      </AppText>
      <View style={styles.glowWrap}>
        <AppText variant="display" color={colors.accent} style={accentGlowShadow}>
          {formatDuration(streakMs)}
        </AppText>
      </View>
      <AppText variant="caption" color={colors.textSecondary} style={styles.caption}>
        since {formatShortDate(new Date(streakStart).toISOString())} — every hour your body is
        repairing itself.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  glowWrap: { marginVertical: spacing.xs },
  gradualRow: { flexDirection: 'row', alignItems: 'baseline', marginVertical: spacing.xs },
  ofTarget: { marginLeft: spacing.sm },
  caption: { marginTop: spacing.xs },
});
