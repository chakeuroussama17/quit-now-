import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Stepper } from '@/components/ui/Stepper';
import { pickAvatar } from '@/features/settings/avatar';
import { MoneyInput } from '@/features/onboarding/steps/common';
import { useT } from '@/i18n';
import { supabase } from '@/services/supabase';
import { pushProfileToCloud, useAuthStore } from '@/state/useAuthStore';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, radii, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { baselinePerDay, costPerUnit } from '@/utils/baseline';

interface EditProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * The account sheet: photo, name, password, and the numbers behind
 * "money saved". Saving with a changed baseline invalidates the stored
 * reduction plan — its weekly targets were computed from the OLD numbers,
 * and the Home ring reads the plan, not the profile.
 */
export function EditProfileSheet({ visible, onClose }: EditProfileSheetProps) {
  const t = useT();
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const avatarUri = useSettingsStore((s) => s.values['avatar_uri']);
  const removeSetting = useSettingsStore((s) => s.remove);
  const session = useAuthStore((s) => s.session);

  const [draft, setDraft] = useState<UserProfile | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!profile) return null;
  const current = draft ?? profile;
  const patch = (partial: Partial<UserProfile>) => setDraft({ ...current, ...partial });

  const product = current.products[0] ?? 'cigarette';
  const usesCigs = product === 'cigarette' || product === 'rolled';
  // Google accounts have no password to change.
  const canChangePassword = session?.user.app_metadata?.provider === 'email';

  const save = async () => {
    // Password first — it can fail, and the user should hear about it
    // without losing their other edits.
    if (canChangePassword && password.length > 0) {
      if (password.length < 6) {
        setNotice({ text: t('edit.passwordShort'), error: true });
        return;
      }
      if (password !== confirm) {
        setNotice({ text: t('auth.passwordMismatch'), error: true });
        return;
      }
      setBusy(true);
      const { error } = await supabase.auth.updateUser({ password });
      setBusy(false);
      if (error) {
        setNotice({ text: t('edit.passwordFailed'), error: true });
        return;
      }
    }

    // Consumption or price changed → the stored tapering plan is built on
    // stale numbers. Drop it; the Home ring falls back to a taper from the
    // new baseline instantly and the AI regenerates in the background.
    const numbersChanged =
      baselinePerDay(current) !== baselinePerDay(profile) ||
      costPerUnit(current) !== costPerUnit(profile);

    await setProfile(current);
    if (numbersChanged) await removeSetting('reduction_plan');
    pushProfileToCloud(current); // best-effort mirror to Supabase
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDraft(null);
    setPassword('');
    setConfirm('');
    setNotice(null);
    onClose();
  };

  const close = () => {
    setDraft(null);
    setPassword('');
    setConfirm('');
    setNotice(null);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <AppText variant="h2" style={styles.title}>
        {t('edit.title')}
      </AppText>

      {/* Photo — tap the circle, like every other app */}
      <View style={styles.avatarWrap}>
        <Pressable
          onPress={() => pickAvatar().catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel={t('edit.photoHint')}
          style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.8 }]}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person-outline" size={34} color={colors.textMuted} />
          )}
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={13} color={colors.onAccent} />
          </View>
        </Pressable>
        <AppText variant="caption" color={colors.textMuted}>
          {t('edit.photoHint')}
        </AppText>
      </View>

      <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
        {t('edit.name')}
      </AppText>
      <AppTextInput
        defaultValue={current.name}
        onChangeText={(name) => patch({ name })}
        autoCapitalize="words"
        accessibilityLabel="Your name"
      />

      {canChangePassword && (
        <>
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            {t('edit.newPassword')}
          </AppText>
          <AppTextInput
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (notice) setNotice(null);
            }}
            secureTextEntry
            autoComplete="new-password"
            placeholder={t('edit.passwordKeep')}
            accessibilityLabel={t('edit.newPassword')}
          />
          {password.length > 0 && (
            <AppTextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
              placeholder={t('auth.confirmPassword')}
              style={styles.confirmField}
              accessibilityLabel={t('auth.confirmPassword')}
            />
          )}
        </>
      )}

      {usesCigs && (
        <View style={styles.fields}>
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            {t('edit.baseline')}
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

      {notice && (
        <AppText
          variant="caption"
          color={notice.error ? colors.danger : colors.accent}
          style={styles.notice}
        >
          {notice.text}
        </AppText>
      )}

      <View style={styles.footer}>
        <PrimaryButton
          label={t('common.save')}
          onPress={save}
          loading={busy}
          disabled={current.name.trim().length === 0}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.sm },
  avatarWrap: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: radii.pill },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgElevated,
  },
  label: { marginTop: spacing.lg, marginBottom: spacing.sm },
  confirmField: { marginTop: spacing.sm },
  fields: {},
  notice: { marginTop: spacing.md },
  footer: { marginTop: spacing.xl },
});
