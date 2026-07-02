import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { getUnlockedAchievements, unlockAchievement } from '@/db/achievementsRepo';
import { getCravingStats } from '@/db/logsRepo';
import { getAllTimeCounts, getLongestGapDays } from '@/db/statsRepo';
import { ACHIEVEMENT_DEFS, levelFor, RANKS, totalXp, type GameInputs } from '@/features/ranks/game';
import { useProgress } from '@/features/dashboard/useProgress';
import { useLogsStore } from '@/state/useLogsStore';
import { useProfileStore } from '@/state/useProfileStore';
import { colors, radii, spacing } from '@/theme';
import { streakStart } from '@/utils/streak';

export default function RanksScreen() {
  const profile = useProfileStore((s) => s.profile);
  if (!profile) return null;
  return <RanksContent />;
}

function RanksContent() {
  const profile = useProfileStore((s) => s.profile)!;
  const lastSmokeAt = useLogsStore((s) => s.lastSmokeAt);
  const progress = useProgress(profile);
  const [game, setGame] = useState<GameInputs | null>(null);
  const [unlockedKeys, setUnlockedKeys] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [cravings, counts, longest, unlocked] = await Promise.all([
          getCravingStats(),
          getAllTimeCounts(),
          getLongestGapDays(profile.programStartDate),
          getUnlockedAchievements(),
        ]);
        if (cancelled) return;
        const { startMs, pending } = streakStart(profile, lastSmokeAt);
        const cleanDays = pending ? 0 : Math.floor((Date.now() - startMs) / 86_400_000);
        const inputs: GameInputs = {
          cravingsResisted: cravings.resisted,
          cravingsTotal: cravings.total,
          winRate: cravings.total > 0 ? cravings.resisted / cravings.total : null,
          smokeLogCount: counts.smokeLogCount,
          urgeSurfCount: counts.urgeSurfCount,
          cleanDays,
          longestDays: Math.floor(longest),
          moneySaved: progress.moneySaved,
          unitsAvoided: progress.unitsAvoided,
        };
        setGame(inputs);
        setUnlockedKeys(unlocked);
        // Persist first-time unlocks so unlocked_at survives data shifts.
        for (const def of ACHIEVEMENT_DEFS) {
          if (def.unlocked(inputs) && !unlocked[def.key]) unlockAchievement(def.key);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [profile, lastSmokeAt, progress]),
  );

  if (!game) return <Screen />;

  const xp = totalXp(game);
  const { level, progress: levelProgress, toNext } = levelFor(xp);
  const bestDays = Math.max(game.cleanDays, game.longestDays);
  const currentRankIndex = RANKS.reduce((best, r, i) => (bestDays >= r.day ? i : best), -1);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppText variant="h1">Ranks</AppText>

        <Card style={styles.levelCard}>
          <View style={styles.levelRow}>
            <View>
              <AppText variant="micro" color={colors.textSecondary}>
                Level {level}
              </AppText>
              <AppText variant="stat">{xp.toLocaleString()} XP</AppText>
            </View>
            <AppText variant="caption" color={colors.textMuted}>
              {toNext} to level {level + 1}
            </AppText>
          </View>
          <ProgressBar progress={levelProgress} />
          <AppText variant="caption" color={colors.textMuted}>
            Resisted cravings earn the most. Honest logs count too — honesty beats perfection.
          </AppText>
        </Card>

        <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
          The road
        </AppText>
        <Card style={styles.listCard}>
          {RANKS.map((rank, i) => {
            const unlocked = bestDays >= rank.day;
            const isCurrent = i === currentRankIndex;
            return (
              <View key={rank.day} style={[styles.rankRow, isCurrent && styles.rankRowCurrent]}>
                <View style={[styles.emblem, unlocked && styles.emblemUnlocked]}>
                  <Ionicons
                    name="shield-outline"
                    size={17}
                    color={unlocked ? colors.accent : colors.textMuted}
                  />
                </View>
                <View style={styles.rankText}>
                  <AppText variant="bodyMedium" color={unlocked ? colors.text : colors.textMuted}>
                    {rank.name}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {rank.detail}
                  </AppText>
                </View>
                <AppText variant="caption" color={unlocked ? colors.accent : colors.textMuted}>
                  Day {rank.day}
                </AppText>
              </View>
            );
          })}
        </Card>

        <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
          Achievements
        </AppText>
        <Card style={styles.listCard}>
          {ACHIEVEMENT_DEFS.map((def) => {
            const unlocked = def.unlocked(game) || unlockedKeys[def.key] != null;
            return (
              <View key={def.key} style={styles.rankRow}>
                <Ionicons
                  name={unlocked ? 'checkmark-circle' : 'lock-closed-outline'}
                  size={20}
                  color={unlocked ? colors.accent : colors.textMuted}
                />
                <View style={styles.rankText}>
                  <AppText variant="bodyMedium" color={unlocked ? colors.text : colors.textMuted}>
                    {def.title}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {def.detail}
                  </AppText>
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  levelCard: { gap: spacing.sm, marginTop: spacing.md },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  listCard: { gap: spacing.md },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rankRowCurrent: {
    backgroundColor: colors.accentDim,
    borderRadius: radii.sm,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emblem: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemUnlocked: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  rankText: { flex: 1, gap: 1 },
});
