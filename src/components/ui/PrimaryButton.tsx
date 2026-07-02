import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, radii, spacing } from '@/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onAccent : colors.accent} />
      ) : (
        <Text
          style={[
            styles.label,
            { color: variant === 'primary' ? colors.onAccent : colors.accent },
            variant === 'secondary' && { color: colors.text },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: { backgroundColor: colors.accent },
  secondary: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  label: { fontFamily: font.semibold, fontSize: 16 },
});
