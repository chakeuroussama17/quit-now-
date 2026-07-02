import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useLogsStore } from '@/state/useLogsStore';
import { colors, radii, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { formatHoursRemaining, getNextMilestone } from '@/utils/health';
import { streakStart } from '@/utils/streak';

/** Compact "Next · day 14 — Circulation improving" row (mockup 1). */
export function MilestoneRow({ profile }: { profile: UserProfile }) {
  const lastSmokeAt = useLogsStore((s) => s.lastSmokeAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const { startMs, pending } = streakStart(profile, lastSmokeAt, now);
  const next = pending ? null : getNextMilestone(startMs, now);

  const title = pending
    ? 'Recovery starts on quit day'
    : next
      ? next.milestone.hours >= 48
        ? `Next · day ${Math.round(next.milestone.hours / 24)}`
        : `Next · in ${formatHoursRemaining(next.hoursRemaining)}`
      : 'Every milestone reached';
  const caption = pending
    ? 'The first one lands 20 minutes in.'
    : next
      ? next.milestone.label
      : 'Your body has done its part — you did yours.';

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name="heart-outline" size={18} color={colors.accent} />
      </View>
      <View style={styles.textWrap}>
        <AppText variant="bodyMedium">{title}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {caption}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 1 },
});
