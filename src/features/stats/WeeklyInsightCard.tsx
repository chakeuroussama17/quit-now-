import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useT } from '@/i18n';
import { getWeeklyInsight } from '@/services/aiService';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, font, spacing } from '@/theme';

/** Renders **bold** spans from the AI text without a markdown dependency. */
function InsightText({ content }: { content: string }) {
  const parts = content.split('**');
  return (
    <Text style={styles.body}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={styles.bold}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

/**
 * The weekly coach report — cached one per ISO week in ai_messages, generated
 * lazily when Stats opens. Renders nothing when offline and uncached.
 */
export function WeeklyInsightCard() {
  const t = useT();
  const lang = useSettingsStore((s) => s.values['language']) ?? 'en';
  const [fetched, setFetched] = useState<{ text: string; lang: string } | null>(null);

  // Re-fetch when the language changes so the report matches the current one.
  useEffect(() => {
    let cancelled = false;
    getWeeklyInsight().then((text) => {
      if (!cancelled && text) setFetched({ text, lang });
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Only show it if it belongs to the current language (avoids a stale flash).
  const insight = fetched && fetched.lang === lang ? fetched.text : null;
  if (!insight) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <AppText variant="micro" color={colors.accent}>
          {t('stats.week')}
        </AppText>
      </View>
      <InsightText content={insight} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginTop: spacing.md, borderColor: 'rgba(74,222,181,0.25)' },
  header: { flexDirection: 'row', alignItems: 'center' },
  body: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  bold: { fontFamily: font.semibold, color: colors.text },
});
