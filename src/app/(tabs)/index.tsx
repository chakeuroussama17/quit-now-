import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { CoachCard } from '@/features/dashboard/CoachCard';
import { MilestoneRow } from '@/features/dashboard/MilestoneRow';
import { StreakHero } from '@/features/dashboard/StreakHero';
import { TilesRow } from '@/features/dashboard/TilesRow';
import { useEnsureReductionPlan } from '@/features/dashboard/useEnsureReductionPlan';
import { useProgress } from '@/features/dashboard/useProgress';
import { useT } from '@/i18n';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, radii, spacing } from '@/theme';
import { dayPart } from '@/utils/time';

export default function HomeScreen() {
  const profile = useProfileStore((s) => s.profile);
  // Profile is guaranteed by the router guard, but a render can slip in during
  // "delete all data" — bail quietly instead of crashing.
  if (!profile) return null;
  return <HomeContent />;
}

function HomeContent() {
  const t = useT();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile)!;
  const avatarUri = useSettingsStore((s) => s.values['avatar_uri']);
  const progress = useProgress(profile);
  useEnsureReductionPlan(profile);
  const greeting = `${t(`home.${dayPart() === 'night' ? 'night' : dayPart()}` as 'home.morning')}, ${profile.name}`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <AppText variant="caption" color={colors.textMuted}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </AppText>
            <AppText variant="h2">{greeting}</AppText>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.8 }]}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <StreakHero profile={profile} />
        </View>

        <View style={styles.section}>
          <TilesRow profile={profile} progress={progress} />
        </View>

        <View style={styles.section}>
          <MilestoneRow profile={profile} />
        </View>

        <View style={styles.section}>
          <CoachCard profile={profile} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xxl },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  section: { marginTop: spacing.lg },
});
