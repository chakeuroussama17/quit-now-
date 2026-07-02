import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme';

interface MeterProps {
  /** 0–1 */
  ratio: number;
  label: string;
  detail?: string;
}

/** Single ratio against a limit: fill in the accent, track a dimmer step of the same ramp. */
export function Meter({ ratio, label, detail }: MeterProps) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <AppText variant="caption" color={colors.textSecondary}>
          {label}
        </AppText>
        <AppText variant="title">{pct}%</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      {detail ? (
        <AppText variant="caption" color={colors.textMuted}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentDim,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.accent },
});
