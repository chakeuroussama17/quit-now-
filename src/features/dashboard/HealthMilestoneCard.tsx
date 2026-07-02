import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLogsStore } from '@/state/useLogsStore';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { formatHoursRemaining, getNextMilestone, HEALTH_MILESTONES } from '@/utils/health';
import { streakStart } from '@/utils/streak';

/** "In 14 hours: your carbon monoxide levels return to normal" — real WHO timeline. */
export function HealthMilestoneCard({ profile }: { profile: UserProfile }) {
  const lastSmokeAt = useLogsStore((s) => s.lastSmokeAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const { startMs, pending } = streakStart(profile, lastSmokeAt, now);

  if (pending) {
    return (
      <Card style={styles.card}>
        <Header />
        <AppText variant="body" color={colors.textSecondary}>
          Your recovery timeline begins the moment you quit. It starts fast — the first milestone
          lands 20 minutes in.
        </AppText>
      </Card>
    );
  }

  const next = getNextMilestone(startMs, now);
  if (!next) {
    return (
      <Card style={styles.card}>
        <Header />
        <AppText variant="body" color={colors.textSecondary}>
          Every recovery milestone reached. Your body has done its part — you did yours.
        </AppText>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Header trailing={`${next.reachedCount}/${HEALTH_MILESTONES.length} reached`} />
      <AppText variant="title">
        In {formatHoursRemaining(next.hoursRemaining)}: {next.milestone.label.toLowerCase()}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        {next.milestone.description}
      </AppText>
      <View style={styles.progress}>
        <ProgressBar progress={next.progress} />
      </View>
    </Card>
  );
}

function Header({ trailing }: { trailing?: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Ionicons name="heart-outline" size={14} color={colors.accent} />
        <AppText variant="micro" color={colors.textSecondary}>
          Next health milestone
        </AppText>
      </View>
      {trailing ? (
        <AppText variant="caption" color={colors.textMuted}>
          {trailing}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progress: { marginTop: spacing.xs },
});
