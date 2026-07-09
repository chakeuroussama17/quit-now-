import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useT } from '@/i18n';
import { useLogsStore } from '@/state/useLogsStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';
import { getDailyTargetFor } from '@/utils/reduction';

import { CravingSpark } from './CravingSpark';

/**
 * Gradual-reduction hero: today's count against the plan's daily target, drawn
 * as a ring. (Cold turkey gets the filling lungs instead — see LungsHero.)
 */
export function StreakHero({ profile }: { profile: UserProfile }) {
  const t = useT();
  const todayQuantity = useLogsStore((s) => s.todaySmokedQuantity);
  const planJson = useSettingsStore((s) => s.values['reduction_plan']);

  const target = getDailyTargetFor(profile, planJson);
  const over = todayQuantity > target;
  const ratio = target > 0 ? Math.min(1, todayQuantity / target) : todayQuantity > 0 ? 1 : 0;

  return (
    <Card style={styles.card}>
      <AppText variant="micro" color={colors.textSecondary} style={styles.centered}>
        {t('home.todayTarget')}
      </AppText>

      <View style={styles.ringWrap}>
        <ProgressRing progress={ratio} size={192} color={over ? colors.amber : colors.accent}>
          <View style={styles.bigRow}>
            <AppText variant="display" color={over ? colors.amber : colors.accent}>
              {todayQuantity}
            </AppText>
            <AppText variant="h2" color={colors.textMuted} style={styles.bigSuffix}>
              /{target}
            </AppText>
          </View>
        </ProgressRing>
      </View>

      <AppText variant="caption" color={colors.textSecondary} style={styles.centered}>
        {over
          ? t('home.overTarget')
          : t('home.underTarget', { left: Math.max(0, target - todayQuantity) })}
      </AppText>

      <CravingSpark />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  centered: { textAlign: 'center' },
  ringWrap: { alignItems: 'center', marginVertical: spacing.md },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  bigSuffix: { paddingBottom: 4 },
});
