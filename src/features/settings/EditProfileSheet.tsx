import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Stepper } from '@/components/ui/Stepper';
import { MoneyInput } from '@/features/onboarding/steps/common';
import { useT } from '@/i18n';
import { pushProfileToCloud } from '@/state/useAuthStore';
import { useProfileStore } from '@/state/useProfileStore';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';

interface EditProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Edit name and the numbers behind money saved (Phase 5 settings). */
export function EditProfileSheet({ visible, onClose }: EditProfileSheetProps) {
  const t = useT();
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const [draft, setDraft] = useState<UserProfile | null>(null);

  if (!profile) return null;
  const current = draft ?? profile;
  const patch = (partial: Partial<UserProfile>) => setDraft({ ...current, ...partial });

  const product = current.products[0] ?? 'cigarette';
  const usesCigs = product === 'cigarette' || product === 'rolled';

  const save = async () => {
    await setProfile(current);
    pushProfileToCloud(current); // best-effort mirror to Supabase
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDraft(null);
    onClose();
  };

  const close = () => {
    setDraft(null);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <AppText variant="h2" style={styles.title}>
        {t('edit.title')}
      </AppText>

      <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
        {t('edit.name')}
      </AppText>
      <AppTextInput
        defaultValue={current.name}
        onChangeText={(name) => patch({ name })}
        autoCapitalize="words"
        accessibilityLabel="Your name"
      />

      {usesCigs && (
        <View style={styles.fields}>
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            Baseline sticks per day
          </AppText>
          <Stepper
            value={current.cigsPerDay ?? 10}
            onChange={(cigsPerDay) => patch({ cigsPerDay })}
            min={1}
            max={100}
            suffix="sticks"
          />
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            Price per pack
          </AppText>
          <MoneyInput
            value={current.pricePerPack ?? 0}
            currency={current.currency}
            onChange={(pricePerPack) => patch({ pricePerPack })}
          />
        </View>
      )}

      {product === 'vape' && (
        <View style={styles.fields}>
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            {current.vapePodsPerWeek != null ? 'Pods per week' : 'ml per day'}
          </AppText>
          {current.vapePodsPerWeek != null ? (
            <Stepper
              value={current.vapePodsPerWeek}
              onChange={(vapePodsPerWeek) => patch({ vapePodsPerWeek })}
              min={1}
              max={30}
              suffix="pods"
            />
          ) : (
            <Stepper
              value={current.vapeMlPerDay ?? 2}
              onChange={(vapeMlPerDay) => patch({ vapeMlPerDay })}
              min={0.5}
              max={30}
              step={0.5}
              suffix="ml"
            />
          )}
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            Cost per pod / bottle
          </AppText>
          <MoneyInput
            value={current.vapeCostPerUnit ?? 0}
            currency={current.currency}
            onChange={(vapeCostPerUnit) => patch({ vapeCostPerUnit })}
          />
        </View>
      )}

      {product === 'shisha' && (
        <View style={styles.fields}>
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            Sessions per week
          </AppText>
          <Stepper
            value={current.shishaSessionsPerWeek ?? 3}
            onChange={(shishaSessionsPerWeek) => patch({ shishaSessionsPerWeek })}
            min={1}
            max={30}
            suffix="sessions"
          />
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            Cost per session
          </AppText>
          <MoneyInput
            value={current.shishaCostPerSession ?? 0}
            currency={current.currency}
            onChange={(shishaCostPerSession) => patch({ shishaCostPerSession })}
          />
        </View>
      )}

      <View style={styles.footer}>
        <PrimaryButton
          label={t('common.save')}
          onPress={save}
          disabled={current.name.trim().length === 0}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.sm },
  label: { marginTop: spacing.lg, marginBottom: spacing.sm },
  fields: {},
  footer: { marginTop: spacing.xl },
});
