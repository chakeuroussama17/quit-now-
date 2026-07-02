import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { getQuantitySince } from '@/db/logsRepo';
import { useLogsStore } from '@/state/useLogsStore';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { formatMoney, moneySaved } from '@/utils/baseline';
import { daysBetween } from '@/utils/time';

interface TodayStatsProps {
  profile: UserProfile;
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card glass style={styles.statCard}>
      <AppText variant="stat" color={tone ?? colors.text}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
    </Card>
  );
}

export function TodayStats({ profile }: TodayStatsProps) {
  const todaySmokedCount = useLogsStore((s) => s.todaySmokedCount);
  const todayResisted = useLogsStore((s) => s.todayCravingsResisted);
  const [saved, setSaved] = useState(0);

  // Money saved = baseline cost since the program/quit started minus logged use.
  useEffect(() => {
    const startIso =
      profile.quitMode === 'cold_turkey' && profile.quitDate
        ? profile.quitDate
        : profile.programStartDate;
    let cancelled = false;
    getQuantitySince(startIso).then((units) => {
      if (cancelled) return;
      const started = new Date(startIso).getTime() <= Date.now();
      setSaved(started ? moneySaved(profile, daysBetween(startIso), units) : 0);
    });
    return () => {
      cancelled = true;
    };
  }, [profile, todaySmokedCount]);

  return (
    <View style={styles.row}>
      <StatCard
        label="saved so far"
        value={formatMoney(saved, profile.currency)}
        tone={colors.accent}
      />
      <StatCard label="cravings beaten today" value={String(todayResisted)} />
      <StatCard label="logged today" value={String(todaySmokedCount)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
});
