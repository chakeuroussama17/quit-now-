import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { useAuthStore } from '@/state/useAuthStore';
import { colors, radii, spacing } from '@/theme';

/**
 * Stripe Payment Link for the $3.99/month SOS subscription. Create it in the
 * Stripe dashboard and set EXPO_PUBLIC_STRIPE_PAYMENT_LINK (or paste it here).
 * client_reference_id carries the Supabase user id to the webhook.
 */
const PAYMENT_LINK = (process.env.EXPO_PUBLIC_STRIPE_PAYMENT_LINK ?? '').trim();

const PERKS = [
  { icon: 'timer-outline' as const, text: 'Urge-surf timer with guided 4-7-8 breathing' },
  { icon: 'chatbubble-ellipses-outline' as const, text: 'Real-time AI coach for the hard minutes' },
  {
    icon: 'shield-checkmark-outline' as const,
    text: 'Win logging that tracks cravings getting weaker',
  },
  { icon: 'flash-outline' as const, text: 'There exactly when the craving hits' },
];

/** Shown in place of SOS features until the subscription is active. */
export function Paywall() {
  const session = useAuthStore((s) => s.session);
  const refreshPremium = useAuthStore((s) => s.refreshPremium);
  const [checking, setChecking] = useState(false);

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
          <Ionicons name="flame" size={30} color={colors.amber} />
        </View>
        <AppText variant="h1" style={styles.title}>
          Craving SOS
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
          Your emergency toolkit for the moments that decide everything.
        </AppText>

        <View style={styles.perks}>
          {PERKS.map((perk) => (
            <View key={perk.text} style={styles.perkRow}>
              <Ionicons name={perk.icon} size={18} color={colors.accent} />
              <AppText variant="body" color={colors.textSecondary} style={styles.perkText}>
                {perk.text}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.priceRow}>
          <AppText variant="display" color={colors.accent}>
            $3.99
          </AppText>
          <AppText variant="body" color={colors.textMuted}>
            / month · cancel anytime
          </AppText>
        </View>

        <PrimaryButton label="Unlock SOS" onPress={subscribe} />

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

        <AppText variant="caption" color={colors.textMuted} style={styles.fineprint}>
          Everything else in Exhale stays free: tracking, stats, ranks, The Room and your daily
          coach line.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.xxl },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.amberDim,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  perks: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  perkText: { flex: 1 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  refresh: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.sm },
  fineprint: { textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },
});
