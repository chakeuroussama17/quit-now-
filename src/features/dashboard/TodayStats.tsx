import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useLogsStore } from '@/state/useLogsStore';
import { colors, spacing } from '@/theme';

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

export function TodayStats() {
  const todaySmokedCount = useLogsStore((s) => s.todaySmokedCount);
  const todayResisted = useLogsStore((s) => s.todayCravingsResisted);

  return (
    <View style={styles.row}>
      <StatCard
        label="cravings beaten today"
        value={String(todayResisted)}
        tone={todayResisted > 0 ? colors.accent : colors.text}
      />
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
