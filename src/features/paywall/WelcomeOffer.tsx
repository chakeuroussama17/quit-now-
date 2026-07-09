import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { useT, type TKey } from '@/i18n';
import {
  getPremiumOffers,
  purchasePremium,
  purchasesConfigured,
  type PremiumOffers,
} from '@/services/purchases';
import { useAuthStore } from '@/state/useAuthStore';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, radii, spacing } from '@/theme';
import { baselineDailyCost, baselinePerDay, formatMoney, primaryProduct } from '@/utils/baseline';

/** Shown before store prices load, and when billing isn't configured yet. */
const MONTHLY_FALLBACK = '$3.99';
const YEARLY_FALLBACK = '$35.91';

type Plan = 'monthly' | 'yearly';

/**
 * One-time upsell shown straight after onboarding, before the dashboard.
 * It leads with the user's OWN yearly smoking cost — the most persuasive
 * number we have — then offers monthly or yearly (25% off). Always skippable.
 */
export function WelcomeOffer() {
  const t = useT();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const setSetting = useSettingsStore((s) => s.set);
  const refreshPremium = useAuthStore((s) => s.refreshPremium);

  const [offers, setOffers] = useState<PremiumOffers>({ monthly: null, annual: null });
  const [plan, setPlan] = useState<Plan>('yearly');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPremiumOffers().then((o) => {
      if (!cancelled) setOffers(o);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile) return null;

  const currency = profile.currency;
  const dailyCost = baselineDailyCost(profile);
  const yearlyCost = dailyCost * 365;
  const monthlyCost = dailyCost * 30;
  const perDay = Math.round(baselinePerDay(profile) * 10) / 10;
  const productLabel = t(`product.${primaryProduct(profile)}` as TKey);

  const monthlyPrice = offers.monthly?.priceString ?? MONTHLY_FALLBACK;
  const yearlyPrice = offers.annual?.priceString ?? YEARLY_FALLBACK;

  const finish = async () => {
    await setSetting('welcome_offer_seen', 'true');
    router.replace('/');
  };

  const subscribe = async () => {
    const pkg = plan === 'yearly' ? offers.annual : offers.monthly;
    if (!purchasesConfigured() || !pkg) {
      Alert.alert(t('pay.soon'), t('pay.soonBody'));
      return;
    }
    setBusy(true);
    const result = await purchasePremium(pkg.package);
    setBusy(false);
    if (result === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshPremium();
      await finish();
    } else if (result === 'error') {
      Alert.alert(t('pay.error'));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Their own numbers, first — nothing sells harder. */}
        <Card style={styles.costCard}>
          <AppText variant="micro" color={colors.textSecondary}>
            {t('offer.spendLabel')}
          </AppText>
          <AppText variant="display" color={colors.amber}>
            {formatMoney(yearlyCost, currency)}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('offer.perYearOn', { product: productLabel.toLowerCase() })}
          </AppText>
          <AppText variant="caption" color={colors.textMuted} style={styles.costSub}>
            {t('offer.perDay', {
              n: perDay,
              product: productLabel.toLowerCase(),
              monthly: formatMoney(monthlyCost, currency),
            })}
          </AppText>
        </Card>

        <AppText variant="h1" style={styles.title}>
          {t('offer.title')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.sub}>
          {t('offer.compare')}
        </AppText>

        {/* Plans */}
        <View style={styles.plans}>
          <PlanCard
            selected={plan === 'yearly'}
            onPress={() => setPlan('yearly')}
            name={t('offer.yearly')}
            price={yearlyPrice}
            per={t('offer.perYr')}
            badge={t('offer.save25')}
          />
          <PlanCard
            selected={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
            name={t('offer.monthly')}
            price={monthlyPrice}
            per={t('offer.perMo')}
          />
        </View>

        {/* What 3 months smoke-free actually does */}
        <Card style={styles.healthCard}>
          <AppText variant="title">{t('offer.health3m')}</AppText>
          <HealthRow icon="pulse-outline" text={t('offer.h1')} />
          <HealthRow icon="fitness-outline" text={t('offer.h2')} />
          <HealthRow icon="leaf-outline" text={t('offer.h3')} />
          <HealthRow
            icon="wallet-outline"
            text={t('offer.h4', { amount: formatMoney(dailyCost * 90, currency) })}
          />
        </Card>

        <View style={styles.footer}>
          <PrimaryButton label={t('offer.cta')} onPress={subscribe} loading={busy} />
          <Pressable onPress={finish} accessibilityRole="button" style={styles.skip}>
            <AppText variant="bodyMedium" color={colors.textMuted}>
              {t('offer.skip')}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function PlanCard({
  selected,
  onPress,
  name,
  price,
  per,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  name: string;
  price: string;
  per: string;
  badge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.plan,
        selected && styles.planSelected,
        pressed && { opacity: 0.9 },
      ]}
    >
      {badge ? (
        <View style={styles.badge}>
          <AppText variant="micro" color={colors.onAccent}>
            {badge}
          </AppText>
        </View>
      ) : null}
      <AppText variant="caption" color={colors.textSecondary}>
        {name}
      </AppText>
      <AppText variant="stat" color={selected ? colors.accent : colors.text}>
        {price}
      </AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {per}
      </AppText>
    </Pressable>
  );
}

function HealthRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.healthRow}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <AppText variant="caption" color={colors.textSecondary} style={styles.healthText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  costCard: { alignItems: 'center', gap: 2, marginTop: spacing.md },
  costSub: { marginTop: spacing.xs, textAlign: 'center' },
  title: { textAlign: 'center', marginTop: spacing.xl },
  sub: { textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
  plans: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  plan: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  planSelected: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  badge: {
    position: 'absolute',
    top: -10,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  healthCard: { marginTop: spacing.xl, gap: spacing.md },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  healthText: { flex: 1, lineHeight: 18 },
  footer: { marginTop: spacing.xl },
  skip: { alignItems: 'center', padding: spacing.lg },
});
