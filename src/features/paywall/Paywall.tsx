import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { useT } from '@/i18n';
import {
  getPremiumOffer,
  purchasePremium,
  purchasesConfigured,
  restorePremium,
  type PremiumOffer,
} from '@/services/purchases';
import { useAuthStore } from '@/state/useAuthStore';
import { useProfileStore } from '@/state/useProfileStore';
import { colors, radii, spacing } from '@/theme';
import { baselineDailyCost, formatMoney } from '@/utils/baseline';

/** Shown in place of SOS and The Room until the subscription is active. */
export function Paywall() {
  const t = useT();
  const refreshPremium = useAuthStore((s) => s.refreshPremium);
  const profile = useProfileStore((s) => s.profile);
  const [offer, setOffer] = useState<PremiumOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Load the localized price/package from Google Play via RevenueCat.
  useEffect(() => {
    let cancelled = false;
    getPremiumOffer().then((o) => {
      if (!cancelled) setOffer(o);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const features = [
    { icon: 'flame' as const, title: t('pay.f1.title'), detail: t('pay.f1.detail') },
    { icon: 'chatbubbles' as const, title: t('pay.f2.title'), detail: t('pay.f2.detail') },
    { icon: 'heart-circle' as const, title: t('pay.f3.title'), detail: t('pay.f3.detail') },
  ];
  const freeFeatures = [t('pay.free1'), t('pay.free2'), t('pay.free3'), t('pay.free4')];

  // Their own numbers do the selling: what a day of smoking used to cost.
  const dailyCost = profile ? baselineDailyCost(profile) : 0;
  const currency = profile?.currency ?? 'RM';
  // Real Google Play price when available, else the intended $3.99.
  const priceLabel = offer?.priceString ?? '$3.99';

  const subscribe = async () => {
    if (!purchasesConfigured() || !offer) {
      Alert.alert(t('pay.soon'), t('pay.soonBody'));
      return;
    }
    setBusy(true);
    const result = await purchasePremium(offer.package);
    setBusy(false);
    if (result === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshPremium();
    } else if (result === 'error') {
      Alert.alert(t('pay.error'));
    }
    // 'cancelled' → the user backed out; stay silent.
  };

  const restore = async () => {
    setRestoring(true);
    const ok = await restorePremium();
    await refreshPremium();
    setRestoring(false);
    if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Alert.alert(t('pay.restoreNone'));
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={28} color={colors.accent} />
        </View>
        <AppText variant="h1" style={styles.title}>
          {t('pay.title')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
          {t('pay.subtitle')}
        </AppText>

        {features.map((feature) => (
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
              {priceLabel}
            </AppText>
            <AppText variant="body" color={colors.textMuted}>
              {t('pay.month')}
            </AppText>
          </View>
          {dailyCost > 0.5 ? (
            <AppText variant="caption" color={colors.textSecondary} style={styles.priceNote}>
              {t('pay.anchor', { amount: formatMoney(dailyCost, currency) })}
            </AppText>
          ) : (
            <AppText variant="caption" color={colors.textSecondary} style={styles.priceNote}>
              {t('pay.cheap')}
            </AppText>
          )}
        </View>

        <PrimaryButton label={t('pay.cta')} onPress={subscribe} loading={busy} />

        <View style={styles.trustRow}>
          <AppText variant="caption" color={colors.textMuted}>
            {t('pay.trust')}
          </AppText>
        </View>

        <Pressable
          onPress={restore}
          accessibilityRole="button"
          style={styles.refresh}
          disabled={restoring}
        >
          <AppText variant="bodyMedium" color={colors.accent}>
            {restoring ? t('pay.checking') : t('pay.restore')}
          </AppText>
        </Pressable>

        <View style={styles.freeBlock}>
          <AppText variant="micro" color={colors.textMuted} style={styles.freeTitle}>
            {t('pay.freeTitle')}
          </AppText>
          {freeFeatures.map((item) => (
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
