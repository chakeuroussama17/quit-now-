import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Chip } from '@/components/ui/Chip';
import { colors, radii, spacing } from '@/theme';
import { formatShortDate, addDaysIso } from '@/utils/time';

import { QUIT_DATE_CHOICES, RELAPSE_CAUSE_OPTIONS } from '../options';
import { useOnboardingStore } from '../onboardingStore';
import { ChipGrid, FieldLabel, StepScreen } from './common';

function ModeCard({
  title,
  description,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.modeCard,
        selected && styles.modeCardSelected,
        pressed && { opacity: 0.85 },
      ]}
    >
      <AppText variant="title" color={selected ? colors.accent : colors.text}>
        {title}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
        {description}
      </AppText>
    </Pressable>
  );
}

export function ApproachStep() {
  const { draft, patch } = useOnboardingStore();
  return (
    <StepScreen
      title="How do you want to do this?"
      subtitle="Both paths work. Pick the one you can commit to."
    >
      <ModeCard
        title="Cold turkey"
        description="Pick a quit date and stop completely. Fastest recovery, hardest first week."
        selected={draft.quitMode === 'cold_turkey'}
        onPress={() => patch({ quitMode: 'cold_turkey' })}
      />
      <ModeCard
        title="Gradual reduction"
        description="Taper down week by week with daily targets. Slower, gentler on withdrawal."
        selected={draft.quitMode === 'gradual'}
        onPress={() => patch({ quitMode: 'gradual' })}
      />

      {draft.quitMode === 'cold_turkey' && (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <FieldLabel>Your quit date</FieldLabel>
          <ChipGrid>
            {QUIT_DATE_CHOICES.map((choice) => (
              <Chip
                key={choice.offsetDays}
                label={choice.label}
                selected={draft.quitDateOffsetDays === choice.offsetDays}
                onPress={() => patch({ quitDateOffsetDays: choice.offsetDays })}
              />
            ))}
          </ChipGrid>
          <AppText variant="caption" color={colors.textMuted}>
            Quit day: {formatShortDate(addDaysIso(draft.quitDateOffsetDays))}
          </AppText>
        </View>
      )}
    </StepScreen>
  );
}

export function HistoryStep() {
  const { draft, patch, toggleIn } = useOnboardingStore();
  return (
    <StepScreen
      title="Have you tried quitting before?"
      subtitle="Past attempts aren't failures — they're data about what to watch for."
    >
      <ChipGrid>
        <Chip
          label="Yes"
          selected={draft.triedBefore === true}
          onPress={() => patch({ triedBefore: true })}
        />
        <Chip
          label="No, this is my first try"
          selected={draft.triedBefore === false}
          onPress={() => patch({ triedBefore: false })}
        />
      </ChipGrid>

      {draft.triedBefore === true && (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <FieldLabel>What made you go back?</FieldLabel>
          <ChipGrid>
            {RELAPSE_CAUSE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={draft.previousRelapseCauses.includes(option.value)}
                onPress={() => toggleIn('previousRelapseCauses', option.value)}
              />
            ))}
          </ChipGrid>
          <FieldLabel>Anything else about it? (optional)</FieldLabel>
          <AppTextInput
            placeholder="What was happening when you went back?"
            defaultValue={draft.previousRelapseText}
            onChangeText={(previousRelapseText) => patch({ previousRelapseText })}
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.md }}
          />
        </View>
      )}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  modeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
  },
  modeCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
});
