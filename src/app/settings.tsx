import Ionicons from '@expo/vector-icons/Ionicons';
import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { wipeAllData, wipeRoomData } from '@/db/database';
import { seedDemoData } from '@/db/seed';
import { pickAvatar } from '@/features/settings/avatar';
import { EditProfileSheet } from '@/features/settings/EditProfileSheet';
import { RewardGoalSheet } from '@/features/settings/RewardGoalSheet';
import { LANGUAGES, useT, type TKey } from '@/i18n';
import { exportDataCsv } from '@/services/exportService';
import { ensureNotificationPermissions, syncNotifications } from '@/services/notificationService';
import { useAuthStore } from '@/state/useAuthStore';
import { useLogsStore } from '@/state/useLogsStore';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, radii, spacing } from '@/theme';
import { formatShortDate } from '@/utils/time';

function SettingsRow({
  icon,
  label,
  caption,
  onPress,
  destructive = false,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  caption?: string;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const tint = destructive ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Ionicons name={icon} size={20} color={destructive ? colors.danger : colors.textSecondary} />
      <View style={styles.rowText}>
        <AppText variant="bodyMedium" color={tint}>
          {label}
        </AppText>
        {caption ? (
          <AppText variant="caption" color={colors.textMuted}>
            {caption}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

function ToggleRow({
  label,
  caption,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  caption?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.4 }]}>
      <View style={styles.rowText}>
        <AppText variant="bodyMedium">{label}</AppText>
        {caption ? (
          <AppText variant="caption" color={colors.textMuted}>
            {caption}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: colors.accentDim }}
        thumbColor={value ? colors.accent : colors.textMuted}
        accessibilityLabel={label}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const t = useT();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const hydrateProfile = useProfileStore((s) => s.hydrate);
  const clearProfile = useProfileStore((s) => s.clearProfile);
  const refreshLogs = useLogsStore((s) => s.refresh);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const goalName = useSettingsStore((s) => s.values['reward_goal_name']);
  const setSetting = useSettingsStore((s) => s.set);
  const values = useSettingsStore((s) => s.values);
  const notifEnabled = values['notif_enabled'] === 'true';
  // Mirrors getLang(): an unset or unknown code falls back to English, exactly
  // as the dictionary lookup does — so the radio can't disagree with the UI.
  const activeLang = LANGUAGES.some((l) => l.code === values['language'])
    ? values['language']
    : 'en';
  const session = useAuthStore((s) => s.session);
  const isPremium = useAuthStore((s) => s.isPremium);
  const signOut = useAuthStore((s) => s.signOut);
  const [seeding, setSeeding] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await ensureNotificationPermissions();
      if (!granted) {
        Alert.alert(t('set.permTitle'), t('set.permBody'));
        return;
      }
    }
    await setSetting('notif_enabled', String(value));
    syncNotifications();
  };

  const toggleSub = async (key: string, value: boolean) => {
    await setSetting(key, String(value));
    syncNotifications();
  };

  const confirmDeleteRoom = () => {
    Alert.alert(t('set.deleteRoomConfirm'), t('set.deleteRoomBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('set.deleteRoomAction'),
        style: 'destructive',
        onPress: () => wipeRoomData(),
      },
    ]);
  };

  const confirmDeleteAll = () => {
    Alert.alert(t('set.deleteAllConfirm'), t('set.deleteAllBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('set.deleteAllAction'),
        style: 'destructive',
        onPress: async () => {
          await wipeAllData();
          await Promise.all([refreshLogs(), hydrateSettings()]);
          clearProfile(); // guard flips → back to onboarding
        },
      },
    ]);
  };

  const loadDemoData = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      await Promise.all([hydrateProfile(), refreshLogs(), hydrateSettings()]);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
        </Pressable>
        <AppText variant="h2">{t('set.title')}</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {profile && (
          <Card style={styles.profileCard}>
            <AppText variant="title">{profile.name}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {profile.products.map((p) => t(`product.${p}` as TKey)).join(' · ')} ·{' '}
              {profile.quitMode === 'cold_turkey'
                ? profile.quitDate
                  ? t('set.coldSince', { date: formatShortDate(profile.quitDate) })
                  : t('set.cold')
                : t('set.gradual')}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={styles.reason}>
              “{profile.quitReasonText}”
            </AppText>
          </Card>
        )}

        <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
          {t('set.profileGoals')}
        </AppText>
        <Card style={styles.group}>
          <SettingsRow
            icon="image-outline"
            label={t('set.photo')}
            caption={values['avatar_uri'] ? t('set.photoChange') : t('set.photoPick')}
            onPress={() => pickAvatar().catch(() => {})}
          />
          <SettingsRow
            icon="create-outline"
            label={t('set.editProfile')}
            caption={t('set.editProfileCaption')}
            onPress={() => setEditOpen(true)}
          />
          <SettingsRow
            icon="trophy-outline"
            label={t('set.reward')}
            caption={goalName ? t('set.rewardFor', { goal: goalName }) : t('set.rewardSet')}
            onPress={() => setGoalOpen(true)}
          />
        </Card>

        <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
          {t('set.language')}
        </AppText>
        <Card style={styles.group}>
          {LANGUAGES.map((lang) => (
            <SettingsRow
              key={lang.code}
              icon={activeLang === lang.code ? 'radio-button-on' : 'radio-button-off'}
              label={lang.label}
              onPress={() => setSetting('language', lang.code)}
            />
          ))}
        </Card>

        <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
          {t('set.notifications')}
        </AppText>
        <Card style={styles.group}>
          <ToggleRow
            label={t('set.reminders')}
            caption={t('set.remindersCaption')}
            value={notifEnabled}
            onChange={toggleNotifications}
          />
          <ToggleRow
            label={t('set.morning')}
            caption={t('set.morningCaption')}
            value={notifEnabled && values['notif_morning'] !== 'false'}
            onChange={(v) => toggleSub('notif_morning', v)}
            disabled={!notifEnabled}
          />
          <ToggleRow
            label={t('set.evening')}
            caption={t('set.eveningCaption')}
            value={notifEnabled && values['notif_evening'] !== 'false'}
            onChange={(v) => toggleSub('notif_evening', v)}
            disabled={!notifEnabled}
          />
          <ToggleRow
            label={t('set.risky')}
            caption={t('set.riskyCaption')}
            value={notifEnabled && values['notif_risky'] !== 'false'}
            onChange={(v) => toggleSub('notif_risky', v)}
            disabled={!notifEnabled}
          />
          <ToggleRow
            label={t('set.milestones')}
            caption={t('set.milestonesCaption')}
            value={notifEnabled && values['notif_milestones'] !== 'false'}
            onChange={(v) => toggleSub('notif_milestones', v)}
            disabled={!notifEnabled}
          />
        </Card>

        <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
          {t('set.data')}
        </AppText>
        <Card style={styles.group}>
          <SettingsRow
            icon="download-outline"
            label={t('set.export')}
            caption={t('set.exportCaption')}
            onPress={() => exportDataCsv().catch(() => {})}
          />
          <SettingsRow
            icon="chatbubble-ellipses-outline"
            label={t('set.deleteRoom')}
            caption={t('set.deleteRoomCaption')}
            onPress={confirmDeleteRoom}
            destructive
          />
          <SettingsRow
            icon="trash-outline"
            label={t('set.deleteAll')}
            caption={t('set.deleteAllCaption')}
            onPress={confirmDeleteAll}
            destructive
          />
        </Card>

        <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
          {t('set.account')}
        </AppText>
        <Card style={styles.group}>
          <SettingsRow
            icon="person-circle-outline"
            label={session?.user.email ?? ''}
            caption={isPremium ? t('set.premiumActive') : t('set.freePlan')}
          />
          <SettingsRow
            icon="log-out-outline"
            label={t('set.signOut')}
            caption={t('set.signOutCaption')}
            onPress={() =>
              Alert.alert(t('set.signOutConfirm'), t('set.signOutBody'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('set.signOut'), style: 'destructive', onPress: () => signOut() },
              ])
            }
          />
        </Card>

        {__DEV__ && (
          <>
            <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
              Dev tools
            </AppText>
            <Card style={[styles.group, styles.devGroup]}>
              <SettingsRow
                icon="flask-outline"
                label={seeding ? 'Seeding…' : 'Load demo data'}
                caption="9-day streak, history and cravings for testing"
                onPress={seeding ? undefined : loadDemoData}
              />
            </Card>
          </>
        )}

        <AppText variant="caption" color={colors.textMuted} style={styles.versionFooter}>
          Exhale v{Application.nativeApplicationVersion ?? '1.0.0'} · build{' '}
          {Application.nativeBuildVersion ?? 'dev'}
        </AppText>
      </ScrollView>

      <RewardGoalSheet
        visible={goalOpen}
        onClose={() => setGoalOpen(false)}
        currency={profile?.currency ?? 'RM'}
      />
      <EditProfileSheet visible={editOpen} onClose={() => setEditOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  backButton: { padding: spacing.xs },
  content: { paddingBottom: spacing.xxl },
  profileCard: { gap: spacing.xs },
  reason: { marginTop: spacing.sm, fontStyle: 'italic' },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  group: { padding: spacing.sm, gap: spacing.xs },
  devGroup: { borderColor: 'rgba(245,166,35,0.3)', borderRadius: radii.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm,
  },
  rowText: { flex: 1, gap: 2 },
  versionFooter: { textAlign: 'center', marginTop: spacing.xl },
});
