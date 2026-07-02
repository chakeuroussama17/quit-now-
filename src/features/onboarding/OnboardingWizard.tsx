import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ComponentType } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { useProfileStore } from '@/state/useProfileStore';
import { colors, durations, spacing } from '@/theme';

import { draftToProfile, useOnboardingStore, type OnboardingDraft } from './onboardingStore';
import { DurationStep, NameStep, ProductsStep, UsageStep } from './steps/BasicsSteps';
import { MomentsStep, ReasonsStep, ReasonTextStep } from './steps/MotivationSteps';
import { ApproachStep, HistoryStep } from './steps/PlanSteps';

interface StepDef {
  key: string;
  component: ComponentType;
  canContinue: (draft: OnboardingDraft) => boolean;
}

function usageComplete(draft: OnboardingDraft): boolean {
  const usesCigs = draft.products.includes('cigarette') || draft.products.includes('rolled');
  const usesVape = draft.products.includes('vape');
  const usesShisha = draft.products.includes('shisha');
  if (usesCigs && !(draft.cigsPerDay > 0 && draft.pricePerPack > 0 && draft.sticksPerPack > 0))
    return false;
  if (usesVape) {
    const amountOk =
      draft.vapeAnswerMode === 'ml' ? draft.vapeMlPerDay > 0 : draft.vapePodsPerWeek > 0;
    if (!(amountOk && draft.vapeCostPerUnit > 0)) return false;
  }
  if (usesShisha && !(draft.shishaSessionsPerWeek > 0 && draft.shishaCostPerSession > 0))
    return false;
  return true;
}

const STEPS: StepDef[] = [
  { key: 'name', component: NameStep, canContinue: (d) => d.name.trim().length > 0 },
  { key: 'products', component: ProductsStep, canContinue: (d) => d.products.length > 0 },
  { key: 'usage', component: UsageStep, canContinue: usageComplete },
  {
    key: 'duration',
    component: DurationStep,
    canContinue: (d) => d.yearsUsing + d.monthsUsing > 0,
  },
  { key: 'reasons', component: ReasonsStep, canContinue: (d) => d.quitReasons.length > 0 },
  {
    key: 'reasonText',
    component: ReasonTextStep,
    canContinue: (d) => d.quitReasonText.trim().length >= 5,
  },
  { key: 'moments', component: MomentsStep, canContinue: (d) => d.usageMoments.length > 0 },
  { key: 'approach', component: ApproachStep, canContinue: (d) => d.quitMode !== null },
  { key: 'history', component: HistoryStep, canContinue: (d) => d.triedBefore !== null },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const draft = useOnboardingStore((s) => s.draft);
  const setProfile = useProfileStore((s) => s.setProfile);

  const step = STEPS[index];
  const StepComponent = step.component;
  const isLast = index === STEPS.length - 1;
  const canContinue = useMemo(() => step.canContinue(draft), [step, draft]);

  const goBack = () => {
    if (index > 0) setIndex(index - 1);
  };

  const goNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    setSaving(true);
    try {
      await setProfile(draftToProfile(draft));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            disabled={index === 0}
            accessibilityLabel="Back"
            style={[styles.backButton, index === 0 && { opacity: 0 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.progressWrap}>
            <ProgressBar progress={(index + 1) / STEPS.length} />
          </View>
          <AppText variant="caption" color={colors.textMuted}>
            {index + 1}/{STEPS.length}
          </AppText>
        </View>

        <Animated.View
          key={step.key}
          entering={FadeInDown.duration(durations.base)}
          exiting={FadeOut.duration(durations.fast)}
          style={styles.flex}
        >
          <StepComponent />
        </Animated.View>

        <View style={styles.footer}>
          <PrimaryButton
            label={isLast ? 'Start my journey' : 'Continue'}
            onPress={goNext}
            disabled={!canContinue}
            loading={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: { padding: spacing.xs },
  progressWrap: { flex: 1 },
  footer: { paddingVertical: spacing.md },
});
