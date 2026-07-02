import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { AvoidedCard } from '@/features/dashboard/AvoidedCard';
import { DailyLine } from '@/features/dashboard/DailyLine';
import { HealthMilestoneCard } from '@/features/dashboard/HealthMilestoneCard';
import { MoneyCard } from '@/features/dashboard/MoneyCard';
import { StreakHero } from '@/features/dashboard/StreakHero';
import { TodayStats } from '@/features/dashboard/TodayStats';
import { TrendCard } from '@/features/dashboard/TrendCard';
import { useProgress } from '@/features/dashboard/useProgress';
import { LogSheet } from '@/features/logging/LogSheet';
import { ResistedSheet } from '@/features/logging/ResistedSheet';
import { useEnsureReductionPlan } from '@/features/dashboard/useEnsureReductionPlan';
import { useProfileStore } from '@/state/useProfileStore';
import { accentGlowShadow, colors, radii, spacing } from '@/theme';
import { greeting } from '@/utils/time';

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
  const progress = useProgress(profile);
  useEnsureReductionPlan(profile);
  const [logOpen, setLogOpen] = useState(false);
  const [resistedOpen, setResistedOpen] = useState(false);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <AppText variant="h2" style={styles.greeting}>
              {greeting(profile.name)}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </AppText>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/sos-chat');
            }}
            accessibilityRole="button"
            accessibilityLabel="SOS — talk to your coach now"
            style={({ pressed }) => [styles.sosButton, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="flash" size={16} color={colors.amber} />
            <AppText variant="bodyMedium" color={colors.amber}>
              SOS
            </AppText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <StreakHero profile={profile} />
        </View>

        <View style={styles.section}>
          <DailyLine profile={profile} />
        </View>

        <View style={styles.section}>
          <MoneyCard profile={profile} progress={progress} />
        </View>

        <View style={styles.section}>
          <HealthMilestoneCard profile={profile} />
        </View>

        <View style={styles.section}>
          <AvoidedCard profile={profile} progress={progress} />
        </View>

        <View style={styles.section}>
          <TrendCard profile={profile} />
        </View>

        <View style={styles.section}>
          <TodayStats />
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setResistedOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="I resisted a craving"
          style={({ pressed }) => [styles.resistedButton, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.accent} />
          <View style={styles.resistedTextWrap}>
            <AppText variant="title" color={colors.accent}>
              I resisted a craving
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              The single strongest thing you can log.
            </AppText>
          </View>
        </Pressable>
      </ScrollView>

      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setLogOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Log a smoke or vape"
          style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <Ionicons name="add" size={34} color={colors.onAccent} />
        </Pressable>
      </View>

      <LogSheet visible={logOpen} onClose={() => setLogOpen(false)} />
      <ResistedSheet visible={resistedOpen} onClose={() => setResistedOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: 140 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.amberDim,
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.35)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  greeting: { marginBottom: spacing.xs },
  section: { marginTop: spacing.lg },
  resistedButton: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(74,222,181,0.35)',
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  resistedTextWrap: { flex: 1, gap: 2 },
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl,
    alignItems: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlowShadow,
  },
});
