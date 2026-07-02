import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { colors, font, spacing } from '@/theme';

/** One-question-per-screen layout: big question, quiet subtitle, content below. */
export function StepScreen({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="h1">{title}</AppText>
      {subtitle ? (
        <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

export function ChipGrid({ children }: PropsWithChildren) {
  return <View style={styles.chipGrid}>{children}</View>;
}

export function FieldLabel({ children }: PropsWithChildren) {
  return (
    <AppText variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>
      {children}
    </AppText>
  );
}

/** Numeric input with a currency prefix; keeps the draft as a number. */
export function MoneyInput({
  value,
  currency,
  onChange,
  placeholder,
}: {
  value: number;
  currency: string;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.moneyRow}>
      <Text style={styles.currency}>{currency}</Text>
      <AppTextInput
        style={styles.moneyInput}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? '0.00'}
        defaultValue={value > 0 ? String(value) : ''}
        onChangeText={(text) => {
          const parsed = parseFloat(text.replace(',', '.'));
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
  subtitle: { marginTop: spacing.sm },
  body: { marginTop: spacing.xl, gap: spacing.md },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fieldLabel: { marginTop: spacing.md, marginBottom: -spacing.xs },
  moneyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  currency: { fontFamily: font.semibold, fontSize: 16, color: colors.textSecondary, width: 36 },
  moneyInput: { flex: 1 },
});
