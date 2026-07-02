import { AppTextInput } from '@/components/ui/AppTextInput';
import { Chip } from '@/components/ui/Chip';
import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme';

import { QUIT_REASON_OPTIONS, USAGE_MOMENT_OPTIONS } from '../options';
import { useOnboardingStore } from '../onboardingStore';
import { ChipGrid, StepScreen } from './common';

export function ReasonsStep() {
  const { draft, toggleIn } = useOnboardingStore();
  return (
    <StepScreen title="Why do you want to quit?" subtitle="Pick everything that's true for you.">
      <ChipGrid>
        {QUIT_REASON_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={draft.quitReasons.includes(option.value)}
            onPress={() => toggleIn('quitReasons', option.value)}
          />
        ))}
      </ChipGrid>
    </StepScreen>
  );
}

export function ReasonTextStep() {
  const { draft, patch } = useOnboardingStore();
  return (
    <StepScreen
      title="In your own words —"
      subtitle="Write 1–2 sentences about your deepest reason. On the hard days, these exact words will be what pulls you back."
    >
      <AppTextInput
        placeholder='e.g. "I want to be around long enough to see my daughter grow up."'
        defaultValue={draft.quitReasonText}
        onChangeText={(quitReasonText) => patch({ quitReasonText })}
        multiline
        numberOfLines={4}
        style={{ minHeight: 120, textAlignVertical: 'top', paddingTop: spacing.md }}
        accessibilityLabel="Your deepest reason for quitting"
      />
      <AppText variant="caption" color={colors.textMuted}>
        Stored only on your device. Used to personalize your coaching.
      </AppText>
    </StepScreen>
  );
}

export function MomentsStep() {
  const { draft, toggleIn } = useOnboardingStore();
  return (
    <StepScreen
      title="When do you usually smoke or vape most?"
      subtitle="This helps spot your risky moments before they hit."
    >
      <ChipGrid>
        {USAGE_MOMENT_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={draft.usageMoments.includes(option.value)}
            onPress={() => toggleIn('usageMoments', option.value)}
          />
        ))}
      </ChipGrid>
    </StepScreen>
  );
}
