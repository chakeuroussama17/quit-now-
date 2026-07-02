import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { lifeRegainedMinutes } from '@/utils/health';
import { primaryProduct } from '@/utils/baseline';

import type { Progress } from './useProgress';

const UNIT_LABELS: Record<string, string> = {
  cigarette: 'cigarettes not smoked',
  rolled: 'roll-ups not smoked',
  vape: 'ml of e-liquid avoided',
  shisha: 'sessions skipped',
};

/** Units not consumed + estimated life regained (11 min per cigarette avoided). */
export function AvoidedCard({ profile, progress }: { profile: UserProfile; progress: Progress }) {
  const product = primaryProduct(profile);
  const units = Math.floor(progress.unitsAvoided);
  const isCig = product === 'cigarette' || product === 'rolled';
  const minutes = lifeRegainedMinutes(units);
  const lifeLabel =
    minutes >= 1440
      ? `${(minutes / 1440).toFixed(1)} days`
      : minutes >= 60
        ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
        : `${minutes} min`;

  return (
    <Card glass style={styles.card}>
      <View style={styles.half}>
        <AppText variant="stat">{units.toLocaleString()}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {UNIT_LABELS[product]}
        </AppText>
      </View>
      {isCig && (
        <>
          <View style={styles.divider} />
          <View style={styles.half}>
            <AppText variant="stat">{lifeLabel}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              of life regained
            </AppText>
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center' },
  half: { flex: 1, gap: spacing.xs },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.hairline,
    marginHorizontal: spacing.lg,
  },
});
