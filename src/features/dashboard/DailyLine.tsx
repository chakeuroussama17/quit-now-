import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';

import { dailyLine } from './motivation';

/** One quiet line a day. Phase 3 swaps the source to the AI coach (cached daily). */
export function DailyLine({ profile }: { profile: UserProfile }) {
  const { text, isOwnWords } = dailyLine(profile);
  return (
    <View style={styles.wrap}>
      <View style={styles.rule} />
      <View style={styles.textWrap}>
        <AppText variant="micro" color={colors.textMuted}>
          {isOwnWords ? 'Your words' : 'Today'}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.line}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xs },
  rule: { width: 2, borderRadius: 1, backgroundColor: colors.accentDim },
  textWrap: { flex: 1, gap: spacing.xs },
  line: { lineHeight: 22 },
});
