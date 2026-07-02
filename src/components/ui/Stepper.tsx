import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radii, spacing } from '@/theme';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** e.g. "sticks", "ml", "years" */
  suffix?: string;
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix }: StepperProps) {
  const change = (delta: number) => {
    const next = Math.min(max, Math.max(min, Math.round((value + delta) * 100) / 100));
    if (next !== value) {
      Haptics.selectionAsync();
      onChange(next);
    }
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => change(-step)}
        accessibilityLabel="Decrease"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>−</Text>
      </Pressable>
      <View style={styles.valueBox}>
        <Text style={styles.value}>{value}</Text>
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      <Pressable
        onPress={() => change(step)}
        accessibilityLabel="Increase"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.cardPressed },
  buttonLabel: { fontFamily: font.medium, fontSize: 24, color: colors.accent, lineHeight: 28 },
  valueBox: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  value: {
    fontFamily: font.bold,
    fontSize: 24,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  suffix: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary },
});
