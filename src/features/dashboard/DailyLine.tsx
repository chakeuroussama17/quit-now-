import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { getDailyMotivation } from '@/services/aiService';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';

import { dailyLine } from './motivation';

/**
 * One quiet line a day. AI-written when the proxy is reachable (one call/day,
 * cached in ai_messages); otherwise the bundled rotation, with the user's own
 * quit reason surfacing every third day.
 */
export function DailyLine({ profile }: { profile: UserProfile }) {
  const fallback = dailyLine(profile);
  const [line, setLine] = useState<{ text: string; isOwnWords: boolean }>(fallback);

  useEffect(() => {
    let cancelled = false;
    // Own-words days stay verbatim — their reason beats anything generated.
    if (fallback.isOwnWords) return;
    getDailyMotivation().then(({ text }) => {
      if (!cancelled && text) setLine({ text, isOwnWords: false });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.createdAt]);

  return (
    <View style={styles.wrap}>
      <View style={styles.rule} />
      <View style={styles.textWrap}>
        <AppText variant="micro" color={colors.textMuted}>
          {line.isOwnWords ? 'Your words' : 'Today'}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.line}>
          {line.text}
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
