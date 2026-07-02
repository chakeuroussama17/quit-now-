import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing } from '@/theme';

interface IntensityPickerProps {
  value: number | null;
  onChange: (value: number) => void;
}

/** 1–10 craving intensity as a tappable scale (no slider dependency, bigger targets). */
export function IntensityPicker({ value, onChange }: IntensityPickerProps) {
  return (
    <View>
      <View style={styles.row}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = value === n;
          const strong = n >= 7;
          return (
            <Pressable
              key={n}
              accessibilityLabel={`Intensity ${n}`}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(n);
              }}
              style={[
                styles.cell,
                selected && {
                  backgroundColor: strong ? colors.amberDim : colors.accentDim,
                  borderColor: strong ? colors.amber : colors.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.cellLabel,
                  selected && { color: strong ? colors.amber : colors.accent },
                ]}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Mild</Text>
        <Text style={styles.legendLabel}>Intense</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  cell: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLabel: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  legendLabel: { fontFamily: font.regular, fontSize: 11, color: colors.textMuted },
});
