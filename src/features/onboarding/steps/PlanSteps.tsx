import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Chip } from '@/components/ui/Chip';
import { useT, type TKey } from '@/i18n';
import { colors, radii, spacing } from '@/theme';
import { formatShortDate, addDaysIso } from '@/utils/time';

import { QUIT_DATE_CHOICES, RELAPSE_CAUSE_OPTIONS } from '../options';
import { useOnboardingStore } from '../onboardingStore';
import { ChipGrid, FieldLabel, StepScreen } from './common';

const QUIT_DATE_KEYS: TKey[] = [
  'quitdate.today',
  'quitdate.tomorrow',
  'quitdate.in3',
  'quitdate.week',
];

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
  const t = useT();
  const { draft, patch } = useOnboardingStore();
  return (
    <StepScreen title={t('onb.approach.title')} subtitle={t('onb.approach.subtitle')}>
      <ModeCard
        title={t('onb.approach.cold')}
        description={t('onb.approach.coldDesc')}
        selected={draft.quitMode === 'cold_turkey'}
        onPress={() => patch({ quitMode: 'cold_turkey' })}
      />
      <ModeCard
        title={t('onb.approach.gradual')}
        description={t('onb.approach.gradualDesc')}
        selected={draft.quitMode === 'gradual'}
        onPress={() => patch({ quitMode: 'gradual' })}
      />

      {draft.quitMode === 'cold_turkey' && (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <FieldLabel>{t('onb.approach.quitDate')}</FieldLabel>
          <ChipGrid>
            {QUIT_DATE_CHOICES.map((choice, i) => (
              <Chip
                key={choice.offsetDays}
                label={t(QUIT_DATE_KEYS[i])}
                selected={draft.quitDateOffsetDays === choice.offsetDays}
                onPress={() => patch({ quitDateOffsetDays: choice.offsetDays })}
              />
            ))}
          </ChipGrid>
          <AppText variant="caption" color={colors.textMuted}>
            {t('onb.approach.quitDay', {
              date: formatShortDate(addDaysIso(draft.quitDateOffsetDays)),
            })}
          </AppText>
        </View>
      )}
    </StepScreen>
  );
}

export function HistoryStep() {
  const t = useT();
  const { draft, patch, toggleIn } = useOnboardingStore();
  return (
    <StepScreen title={t('onb.history.title')} subtitle={t('onb.history.subtitle')}>
      <ChipGrid>
        <Chip
          label={t('onb.history.yes')}
          selected={draft.triedBefore === true}
          onPress={() => patch({ triedBefore: true })}
        />
        <Chip
          label={t('onb.history.no')}
          selected={draft.triedBefore === false}
          onPress={() => patch({ triedBefore: false })}
        />
      </ChipGrid>

      {draft.triedBefore === true && (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <FieldLabel>{t('onb.history.causes')}</FieldLabel>
          <ChipGrid>
            {RELAPSE_CAUSE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={t(`relapse.${option.value}` as TKey)}
                selected={draft.previousRelapseCauses.includes(option.value)}
                onPress={() => toggleIn('previousRelapseCauses', option.value)}
              />
            ))}
          </ChipGrid>
          <FieldLabel>{t('onb.history.more')}</FieldLabel>
          <AppTextInput
            placeholder={t('onb.history.morePlaceholder')}
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
