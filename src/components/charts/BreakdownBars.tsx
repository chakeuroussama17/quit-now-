import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme';

export interface BreakdownItem {
  label: string;
  count: number;
}

interface BreakdownBarsProps {
  items: BreakdownItem[];
  /** Rows beyond this fold into "Other". */
  maxRows?: number;
  /** Localized label for the folded tail row. */
  otherLabel?: string;
}

/**
 * Horizontal magnitude bars. Nominal categories, one series → every bar wears
 * the same hue (never a value-ramp); values sit at the tip in text tokens.
 */
export function BreakdownBars({ items, maxRows = 5, otherLabel = 'Other' }: BreakdownBarsProps) {
  const shown = items.slice(0, maxRows);
  const rest = items.slice(maxRows);
  if (rest.length > 0) {
    shown.push({ label: otherLabel, count: rest.reduce((sum, i) => sum + i.count, 0) });
  }
  const max = Math.max(1, ...shown.map((i) => i.count));

  return (
    <View style={styles.rows}>
      {shown.map((item) => (
        <View key={item.label} style={styles.row}>
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            {item.label}
          </AppText>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                {
                  width: `${(item.count / max) * 100}%`,
                  backgroundColor: item.label === otherLabel ? colors.textMuted : colors.accent,
                },
              ]}
            />
          </View>
          <AppText variant="caption" color={colors.textSecondary} style={styles.value}>
            {item.count}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 96 },
  track: { flex: 1 },
  bar: {
    height: 12,
    // rounded data-end, square at the baseline (left)
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    minWidth: 3,
  },
  value: { width: 28, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
