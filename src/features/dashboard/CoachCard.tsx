import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useT } from '@/i18n';
import { getDailyMotivation } from '@/services/aiService';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types/models';

import { dailyLine } from './motivation';

/**
 * The COACH card (mockup 1) — one line a day. AI-written when the proxy is
 * configured, otherwise the bundled rotation; every third day it's the user's
 * own quit reason, verbatim.
 */
export function CoachCard({ profile }: { profile: UserProfile }) {
  const t = useT();
  const fallback = dailyLine(profile);
  const [line, setLine] = useState(fallback);

  useEffect(() => {
    if (fallback.isOwnWords) return;
    let cancelled = false;
    getDailyMotivation().then(({ text }) => {
      if (!cancelled && text) setLine({ text, isOwnWords: false });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.createdAt]);

  return (
    <Card style={styles.card}>
      <AppText variant="micro" color={colors.textMuted}>
        {line.isOwnWords ? t('home.yourWords') : t('home.coach')}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} style={styles.line}>
        {line.text}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  line: { lineHeight: 22 },
});
