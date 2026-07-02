import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { colors, font, radii, spacing } from '@/theme';

export function AppTextInput({ style, ...rest }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.accent}
      cursorColor={colors.accent}
      style={[styles.input, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.text,
  },
});
