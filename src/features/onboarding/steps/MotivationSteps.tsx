import { AppTextInput } from '@/components/ui/AppTextInput';
import { Chip } from '@/components/ui/Chip';
import { AppText } from '@/components/ui/AppText';
import { useT, type TKey } from '@/i18n';
import { colors, spacing } from '@/theme';

import { QUIT_REASON_OPTIONS, USAGE_MOMENT_OPTIONS } from '../options';
import { useOnboardingStore } from '../onboardingStore';
import { ChipGrid, StepScreen } from './common';

export function ReasonsStep() {
  const t = useT();
  const { draft, toggleIn } = useOnboardingStore();
  return (
    <StepScreen title={t('onb.reasons.title')} subtitle={t('onb.reasons.subtitle')}>
      <ChipGrid>
        {QUIT_REASON_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={t(`reason.${option.value}` as TKey)}
            selected={draft.quitReasons.includes(option.value)}
            onPress={() => toggleIn('quitReasons', option.value)}
          />
        ))}
      </ChipGrid>
    </StepScreen>
  );
}

export function ReasonTextStep() {
  const t = useT();
  const { draft, patch } = useOnboardingStore();
  return (
    <StepScreen title={t('onb.reasonText.title')} subtitle={t('onb.reasonText.subtitle')}>
      <AppTextInput
        placeholder={t('onb.reasonText.placeholder')}
        defaultValue={draft.quitReasonText}
        onChangeText={(quitReasonText) => patch({ quitReasonText })}
        multiline
        numberOfLines={4}
        style={{ minHeight: 120, textAlignVertical: 'top', paddingTop: spacing.md }}
        accessibilityLabel={t('onb.reasonText.title')}
      />
      <AppText variant="caption" color={colors.textMuted}>
        {t('onb.reasonText.privacy')}
      </AppText>
    </StepScreen>
  );
}

export function MomentsStep() {
  const t = useT();
  const { draft, toggleIn } = useOnboardingStore();
  return (
    <StepScreen title={t('onb.moments.title')} subtitle={t('onb.moments.subtitle')}>
      <ChipGrid>
        {USAGE_MOMENT_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={t(`moment.${option.value}` as TKey)}
            selected={draft.usageMoments.includes(option.value)}
            onPress={() => toggleIn('usageMoments', option.value)}
          />
        ))}
      </ChipGrid>
    </StepScreen>
  );
}
