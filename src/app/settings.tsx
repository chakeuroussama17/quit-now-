import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { wipeAllData, wipeRoomData } from '@/db/database';
import { seedDemoData } from '@/db/seed';
import { PRODUCT_LABELS } from '@/features/logging/options';
import { RewardGoalSheet } from '@/features/settings/RewardGoalSheet';
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

export default function SettingsScreen() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const hydrateProfile = useProfileStore((s) => s.hydrate);
  const clearProfile = useProfileStore((s) => s.clearProfile);
  const refreshLogs = useLogsStore((s) => s.refresh);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const goalName = useSettingsStore((s) => s.values['reward_goal_name']);
  const [seeding, setSeeding] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const confirmDeleteRoom = () => {
    Alert.alert(
      'Delete all Room conversations?',
      'Every session with Mind is erased from this device. Nothing else is touched. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete conversations',
          style: 'destructive',
          onPress: () => wipeRoomData(),
        },
      ],
    );
  };

  const confirmDeleteAll = () => {
    Alert.alert(
      'Delete all data?',
      'This wipes your profile, every log and every setting from this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await wipeAllData();
            await Promise.all([refreshLogs(), hydrateSettings()]);
            clearProfile(); // guard flips → back to onboarding
          },
        },
      ],
    );
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
        <AppText variant="h2">Settings</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {profile && (
          <Card style={styles.profileCard}>
            <AppText variant="title">{profile.name}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {profile.products.map((p) => PRODUCT_LABELS[p] ?? p).join(' · ')} ·{' '}
              {profile.quitMode === 'cold_turkey'
                ? `Cold turkey${profile.quitDate ? ` since ${formatShortDate(profile.quitDate)}` : ''}`
                : 'Gradual reduction'}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={styles.reason}>
              “{profile.quitReasonText}”
            </AppText>
          </Card>
        )}

        <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
          Goals
        </AppText>
        <Card style={styles.group}>
          <SettingsRow
            icon="trophy-outline"
            label="Reward goal"
            caption={goalName ? `Saving for: ${goalName}` : 'Set what your saved money is for'}
            onPress={() => setGoalOpen(true)}
          />
        </Card>

        <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
          Coming in later phases
        </AppText>
        <Card style={styles.group}>
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            caption="Morning check-ins and risky-hour warnings — Phase 5"
            disabled
          />
          <SettingsRow
            icon="download-outline"
            label="Export data (CSV)"
            caption="Phase 5"
            disabled
          />
        </Card>

        <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
          Data
        </AppText>
        <Card style={styles.group}>
          <SettingsRow
            icon="chatbubble-ellipses-outline"
            label="Delete all Room conversations"
            caption="Your most private data, wiped separately"
            onPress={confirmDeleteRoom}
            destructive
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete all data"
            caption="Everything lives only on this device"
            onPress={confirmDeleteAll}
            destructive
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
      </ScrollView>

      <RewardGoalSheet
        visible={goalOpen}
        onClose={() => setGoalOpen(false)}
        currency={profile?.currency ?? 'RM'}
      />
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
});
