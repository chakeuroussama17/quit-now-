import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { useAuthStore } from '@/state/useAuthStore';
import { useProfileStore } from '@/state/useProfileStore';
import { colors, radii, spacing } from '@/theme';
import { baselineDailyCost, formatMoney } from '@/utils/baseline';

/**
 * Stripe Payment Link for the $3.99/month Premium subscription. Create it in
 * the Stripe dashboard and set EXPO_PUBLIC_STRIPE_PAYMENT_LINK.
 * client_reference_id carries the Supabase user id to the webhook.
 */
const PAYMENT_LINK = (process.env.EXPO_PUBLIC_STRIPE_PAYMENT_LINK ?? '').trim();

const PREMIUM_FEATURES = [
  {
    icon: 'flame' as const,
    title: 'Craving SOS toolkit',
    detail:
      '5-minute urge-surf timer with guided 4-7-8 breathing, quick actions, and win logging that proves your cravings are getting shorter.',
  },
  {
    icon: 'chatbubbles' as const,
    title: 'AI Coach — live, 24/7',
    detail:
      'A real-time coach that knows your quit reason, your triggers and your risky hours. It talks you through the wave exactly when it hits.',
  },
  {
    icon: 'heart-circle' as const,
    title: 'The Room, with Mind',
    detail:
      'A private space to vent and untangle the stress behind the urge. Warm but honest — and everything stays on your phone.',
  },
];

const FREE_FEATURES = [
  'Streak, money saved & health milestones',
  'Fast logging, stats, heatmap & trends',
  'Ranks, XP and achievements',
  'Daily coach line & weekly insight',
];

/** Shown in place of SOS and The Room until the subscription is active. */
export function Paywall() {
  const session = useAuthStore((s) => s.session);
  const refreshPremium = useAuthStore((s) => s.refreshPremium);
  const profile = useProfileStore((s) => s.profile);
  const [checking, setChecking] = useState(false);

  // Their own numbers do the selling: what a day of smoking used to cost.
  const dailyCost = profile ? baselineDailyCost(profile) : 0;
  const currency = profile?.currency ?? 'RM';

  const subscribe = async () => {
    if (!PAYMENT_LINK) {
      Alert.alert(
        'Payments not connected yet',
        'The Stripe payment link has not been configured. Set EXPO_PUBLIC_STRIPE_PAYMENT_LINK and rebuild.',
      );
      return;
    }
    const url = `${PAYMENT_LINK}?client_reference_id=${session?.user.id ?? ''}&prefilled_email=${encodeURIComponent(session?.user.email ?? '')}`;
    await WebBrowser.openBrowserAsync(url);
  };

  const checkAgain = async () => {
    setChecking(true);
    await refreshPremium();
    setChecking(false);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={28} color={colors.accent} />
        </View>
        <AppText variant="h1" style={styles.title}>
          Exhale Premium
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
          Quitting is decided in a handful of hard moments. Premium is the support system built for
          exactly those moments.
        </AppText>

        {PREMIUM_FEATURES.map((feature) => (
          <Card key={feature.title} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name={feature.icon} size={20} color={colors.accent} />
            </View>
            <View style={styles.featureText}>
              <AppText variant="title">{feature.title}</AppText>
              <AppText variant="caption" color={colors.textSecondary} style={styles.featureDetail}>
                {feature.detail}
              </AppText>
            </View>
          </Card>
        ))}

        <View style={styles.priceBlock}>
          <View style={styles.priceRow}>
            <AppText variant="display" color={colors.accent}>
              $3.99
            </AppText>
            <AppText variant="body" color={colors.textMuted}>
              / month
            </AppText>
          </View>
          {dailyCost > 0.5 ? (
            <AppText variant="caption" color={colors.textSecondary} style={styles.priceNote}>
              Smoking used to cost you about {formatMoney(dailyCost, currency)} every single day.
              Premium costs less than most people spent before lunch — and it exists to keep that
              money in your pocket.
            </AppText>
          ) : (
            <AppText variant="caption" color={colors.textSecondary} style={styles.priceNote}>
              Less than a single pack. Cancel anytime, in one tap.
            </AppText>
          )}
        </View>

        <PrimaryButton label="Start Premium — $3.99/month" onPress={subscribe} />

        <View style={styles.trustRow}>
          <AppText variant="caption" color={colors.textMuted}>
            Cancel anytime · No ads, ever · Your logs never leave your phone
          </AppText>
        </View>

        <Pressable
          onPress={checkAgain}
          accessibilityRole="button"
          style={styles.refresh}
          disabled={checking}
        >
          <AppText variant="bodyMedium" color={colors.accent}>
            {checking ? 'Checking…' : 'I already subscribed — refresh'}
          </AppText>
        </Pressable>

        <View style={styles.freeBlock}>
          <AppText variant="micro" color={colors.textMuted} style={styles.freeTitle}>
            Always free, no subscription needed
          </AppText>
          {FREE_FEATURES.map((item) => (
            <View key={item} style={styles.freeRow}>
              <Ionicons name="checkmark" size={14} color={colors.textMuted} />
              <AppText variant="caption" color={colors.textMuted}>
                {item}
              </AppText>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: { textAlign: 'center' },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  featureCard: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, gap: 2 },
  featureDetail: { lineHeight: 18 },
  priceBlock: { alignItems: 'center', marginVertical: spacing.xl, gap: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  priceNote: { textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.lg },
  trustRow: { alignItems: 'center', marginTop: spacing.md },
  refresh: { alignItems: 'center', marginTop: spacing.md, padding: spacing.sm },
  freeBlock: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    gap: spacing.sm,
  },
  freeTitle: { marginBottom: spacing.xs },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
