import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RewardGoalSheet } from '@/features/settings/RewardGoalSheet';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, radii, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { formatMoney } from '@/utils/baseline';

import type { Progress } from './useProgress';

/**
 * The reward goal ("Car — RM 80,000") as a standing reminder on Home,
 * filling with the money not burned. Renders nothing until a goal exists;
 * tap to edit. When the savings reach the price, it flips to a done state.
 */
export function RewardGoalCard({
  profile,
  progress,
}: {
  profile: UserProfile;
  progress: Progress;
}) {
  const t = useT();
  const goalName = useSettingsStore((s) => s.values['reward_goal_name']);
  const goalPrice = useSettingsStore((s) => s.values['reward_goal_price']);
  const [sheetOpen, setSheetOpen] = useState(false);

  const price = parseFloat(goalPrice ?? '');
  if (!goalName || !Number.isFinite(price) || price <= 0) return null;

  const ratio = Math.min(1, progress.moneySaved / price);
  const reached = progress.moneySaved >= price;

  return (
    <>
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('goal.title')}
        style={styles.wrap}
      >
        {({ pressed }) => (
          <Card style={pressed ? { ...styles.card, opacity: 0.85 } : styles.card}>
            <View style={styles.header}>
              <View
                style={[styles.iconWrap, reached && { backgroundColor: colors.accentDim }]}
              >
                <Ionicons
                  name={reached ? 'checkmark-circle' : 'trophy-outline'}
                  size={18}
                  color={reached ? colors.accent : colors.amber}
                />
              </View>
              <View style={styles.titles}>
                <AppText variant="title" numberOfLines={1}>
                  {goalName}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {t('goal.title')}
                </AppText>
              </View>
              <AppText variant="bodyMedium" color={reached ? colors.accent : colors.text}>
                {Math.floor(ratio * 100)}%
              </AppText>
            </View>

            <ProgressBar
              progress={ratio}
              height={7}
              color={reached ? colors.accent : colors.amber}
            />

            <AppText variant="caption" color={colors.textSecondary}>
              {reached
                ? t('home.goalReached', { name: goalName })
                : t('home.goalProgress', {
                    saved: formatMoney(progress.moneySaved, profile.currency),
                    total: formatMoney(price, profile.currency),
                  })}
            </AppText>
          </Card>
        )}
      </Pressable>

      <RewardGoalSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currency={profile.currency}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Own margin: Home renders this unwrapped so a missing goal leaves no gap.
  wrap: { marginTop: spacing.lg },
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.amberDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1 },
});
