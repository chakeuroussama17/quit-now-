import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { CoachCard } from '@/features/dashboard/CoachCard';
import { LungsHero } from '@/features/dashboard/LungsHero';
import { MilestoneRow } from '@/features/dashboard/MilestoneRow';
import { OverallProgress } from '@/features/dashboard/OverallProgress';
import { StreakHero } from '@/features/dashboard/StreakHero';
import { useEnsureReductionPlan } from '@/features/dashboard/useEnsureReductionPlan';
import { useProgress } from '@/features/dashboard/useProgress';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, radii, spacing } from '@/theme';

export default function HomeScreen() {
  const profile = useProfileStore((s) => s.profile);
  // Profile is guaranteed by the router guard, but a render can slip in during
  // "delete all data" — bail quietly instead of crashing.
  if (!profile) return null;
  return <HomeContent />;
}

function HomeContent() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile)!;
  const avatarUri = useSettingsStore((s) => s.values['avatar_uri']);
  const progress = useProgress(profile);
  useEnsureReductionPlan(profile);

  const isGradual = profile.quitMode === 'gradual';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand bar */}
        <View style={styles.topRow}>
          <AppText variant="h2" style={styles.brand}>
            EXHALE
          </AppText>
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

        {/* Hero: filling lungs (cold turkey) or today's target ring (gradual) */}
        <View style={styles.section}>
          {isGradual ? <StreakHero profile={profile} /> : <LungsHero profile={profile} />}
        </View>

        <View style={styles.section}>
          <OverallProgress profile={profile} progress={progress} />
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
  brand: { letterSpacing: 2, fontSize: 18 },
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
