import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, radii, spacing } from '@/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  /** Amber instead of teal for warning-flavored selections. */
  tone?: 'accent' | 'amber';
  disabled?: boolean;
}

export function Chip({
  label,
  selected = false,
  onPress,
  size = 'md',
  tone = 'accent',
  disabled = false,
}: ChipProps) {
  const toneColor = tone === 'amber' ? colors.amber : colors.accent;
  const toneDim = tone === 'amber' ? colors.amberDim : colors.accentDim;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        size === 'sm' && styles.chipSm,
        selected && { backgroundColor: toneDim, borderColor: toneColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.label,
          size === 'sm' && styles.labelSm,
          { color: selected ? toneColor : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  chipSm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  label: { fontFamily: font.medium, fontSize: 15 },
  labelSm: { fontSize: 13 },
});
