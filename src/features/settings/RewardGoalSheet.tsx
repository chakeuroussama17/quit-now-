import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, font, spacing } from '@/theme';

interface RewardGoalSheetProps {
  visible: boolean;
  onClose: () => void;
  currency: string;
}

/** "New watch — RM 800": what the saved money is actually for. */
export function RewardGoalSheet({ visible, onClose, currency }: RewardGoalSheetProps) {
  const t = useT();
  const values = useSettingsStore((s) => s.values);
  const setSetting = useSettingsStore((s) => s.set);
  const [name, setName] = useState(values['reward_goal_name'] ?? '');
  const [price, setPrice] = useState(values['reward_goal_price'] ?? '');

  const parsedPrice = parseFloat(price.replace(',', '.'));
  const valid = name.trim().length > 0 && Number.isFinite(parsedPrice) && parsedPrice > 0;

  const save = async () => {
    await Promise.all([
      setSetting('reward_goal_name', name.trim()),
      setSetting('reward_goal_price', String(parsedPrice)),
    ]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="h2">{t('goal.title')}</AppText>
      <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
        {t('goal.subtitle')}
      </AppText>
      <AppTextInput
        placeholder={t('goal.placeholder')}
        defaultValue={name}
        onChangeText={setName}
        style={styles.field}
        accessibilityLabel="Reward name"
      />
      <View style={styles.priceRow}>
        <AppText variant="title" color={colors.textSecondary} style={styles.currency}>
          {currency}
        </AppText>
        <AppTextInput
          placeholder="800"
          defaultValue={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          style={styles.priceInput}
          accessibilityLabel="Reward price"
        />
      </View>
      <PrimaryButton label={t('goal.save')} onPress={save} disabled={!valid} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  currency: { width: 40, fontFamily: font.semibold },
  priceInput: { flex: 1 },
});
