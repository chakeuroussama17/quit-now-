import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useT } from '@/i18n';
import { colors, radii, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { formatMoney, primaryProduct } from '@/utils/baseline';
import { lifeRegainedMinutes } from '@/utils/health';

import type { Progress } from './useProgress';

function Stat({
  icon,
  tint,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.iconWrap, { backgroundColor: `${tint}22`, borderColor: `${tint}55` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <AppText variant="stat" style={styles.value}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

/** "Overall Progress": days quit · units avoided · money saved · life won back. */
export function OverallProgress({
  profile,
  progress,
}: {
  profile: UserProfile;
  progress: Progress;
}) {
  const t = useT();
  const product = primaryProduct(profile);
  const isCig = product === 'cigarette' || product === 'rolled';
  const units = Math.floor(progress.unitsAvoided);

  const minutes = isCig ? lifeRegainedMinutes(units) : 0;
  const wonBack =
    minutes >= 1440
      ? `${Math.floor(minutes / 1440)}d`
      : minutes >= 60
        ? `${Math.floor(minutes / 60)}h`
        : `${minutes}m`;

  return (
    <Card style={styles.card}>
      <AppText variant="title">{t('home.overall')}</AppText>
      <View style={styles.row}>
        <Stat
          icon="calendar-outline"
          tint="#6AA9F5"
          value={String(Math.floor(progress.daysElapsed))}
          label={t('home.daysQuit')}
        />
        <Stat
          icon="flame-outline"
          tint="#F08A7A"
          value={units.toLocaleString()}
          label={isCig ? t('home.cigsAvoided') : t('home.unitsAvoided')}
        />
        <Stat
          icon="cash-outline"
          tint={colors.amber}
          value={formatMoney(progress.moneySaved, profile.currency)}
          label={t('home.savedLabel')}
        />
        <Stat
          icon="time-outline"
          tint={colors.accent}
          value={isCig ? wonBack : '—'}
          label={t('home.wonBack')}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 20, lineHeight: 26 },
  label: { textAlign: 'center', fontSize: 11 },
});
