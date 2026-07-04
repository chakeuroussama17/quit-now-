import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, radii, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { formatMoney, primaryProduct } from '@/utils/baseline';
import { lifeRegainedMinutes } from '@/utils/health';

import type { Progress } from './useProgress';

function Tile({
  label,
  value,
  caption,
  onPress,
}: {
  label: string;
  value: string;
  caption: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
    >
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
      <AppText variant="stat">{value}</AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {caption}
      </AppText>
    </Pressable>
  );
}

/** "Money saved / RM 142 / 18% to new watch" + "Not smoked / 134 / ≈ 24h regained". */
export function TilesRow({ profile, progress }: { profile: UserProfile; progress: Progress }) {
  const t = useT();
  const router = useRouter();
  const goalName = useSettingsStore((s) => s.values['reward_goal_name']);
  const goalPriceRaw = useSettingsStore((s) => s.values['reward_goal_price']);
  const goalPrice = goalPriceRaw ? parseFloat(goalPriceRaw) : 0;

  const moneyCaption =
    goalName && goalPrice > 0
      ? t('home.toGoal', {
          percent: Math.min(100, Math.round((progress.moneySaved / goalPrice) * 100)),
          goal: goalName.toLowerCase(),
        })
      : t('home.setGoal');

  const product = primaryProduct(profile);
  const isCig = product === 'cigarette' || product === 'rolled';
  const units = Math.floor(progress.unitsAvoided);
  const minutes = lifeRegainedMinutes(units);
  const time =
    minutes >= 1440
      ? `${Math.round(minutes / 144) / 10} ${t('common.days')}`
      : minutes >= 60
        ? `${Math.round(minutes / 60)}h`
        : `${minutes} min`;
  const avoidedCaption = isCig
    ? t('home.regained', { time })
    : product === 'vape'
      ? t('home.mlAvoided')
      : t('home.sessionsSkipped');

  return (
    <View style={styles.row}>
      <Tile
        label={t('home.moneySaved')}
        value={formatMoney(progress.moneySaved, profile.currency)}
        caption={moneyCaption}
        onPress={() => router.push('/settings')}
      />
      <Tile label={t('home.notSmoked')} value={units.toLocaleString()} caption={avoidedCaption} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: spacing.xs,
  },
});
