import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { formatMoney } from '@/utils/baseline';

import type { Progress } from './useProgress';

/** Money saved vs baseline, plus progress toward the user's reward goal. */
export function MoneyCard({ profile, progress }: { profile: UserProfile; progress: Progress }) {
  const router = useRouter();
  const goalName = useSettingsStore((s) => s.values['reward_goal_name']);
  const goalPriceRaw = useSettingsStore((s) => s.values['reward_goal_price']);
  const goalPrice = goalPriceRaw ? parseFloat(goalPriceRaw) : 0;
  const hasGoal = !!goalName && goalPrice > 0;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="wallet-outline" size={14} color={colors.accent} />
          <AppText variant="micro" color={colors.textSecondary}>
            Money saved
          </AppText>
        </View>
      </View>

      <AppText variant="stat" color={colors.accent}>
        {formatMoney(progress.moneySaved, profile.currency)}
      </AppText>

      {hasGoal ? (
        <View style={styles.goal}>
          <View style={styles.goalRow}>
            <AppText variant="caption" color={colors.textSecondary}>
              {goalName}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {formatMoney(goalPrice, profile.currency)}
            </AppText>
          </View>
          <ProgressBar progress={goalPrice > 0 ? progress.moneySaved / goalPrice : 0} />
          <AppText variant="caption" color={colors.textMuted}>
            {Math.min(100, Math.round((progress.moneySaved / goalPrice) * 100))}% of the way there
          </AppText>
        </View>
      ) : (
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <AppText variant="caption" color={colors.accent}>
            Set a reward goal — give this money a job →
          </AppText>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goal: { gap: spacing.sm, marginTop: spacing.xs },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
