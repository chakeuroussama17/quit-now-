import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
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
  const router = useRouter();
  const goalName = useSettingsStore((s) => s.values['reward_goal_name']);
  const goalPriceRaw = useSettingsStore((s) => s.values['reward_goal_price']);
  const goalPrice = goalPriceRaw ? parseFloat(goalPriceRaw) : 0;

  const moneyCaption =
    goalName && goalPrice > 0
      ? `${Math.min(100, Math.round((progress.moneySaved / goalPrice) * 100))}% to ${goalName.toLowerCase()}`
      : 'Set a reward goal →';

  const product = primaryProduct(profile);
  const isCig = product === 'cigarette' || product === 'rolled';
  const units = Math.floor(progress.unitsAvoided);
  const minutes = lifeRegainedMinutes(units);
  const regained =
    minutes >= 1440
      ? `≈ ${Math.round(minutes / 144) / 10} days regained`
      : minutes >= 60
        ? `≈ ${Math.round(minutes / 60)}h regained`
        : `≈ ${minutes} min regained`;
  const avoidedCaption = isCig
    ? regained
    : product === 'vape'
      ? 'ml of e-liquid avoided'
      : 'sessions skipped';

  return (
    <View style={styles.row}>
      <Tile
        label="Money saved"
        value={formatMoney(progress.moneySaved, profile.currency)}
        caption={moneyCaption}
        onPress={() => router.push('/settings')}
      />
      <Tile label="Not smoked" value={units.toLocaleString()} caption={avoidedCaption} />
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
