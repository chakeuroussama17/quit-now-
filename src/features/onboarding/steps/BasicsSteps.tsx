import { StyleSheet, View } from 'react-native';

import { AppTextInput } from '@/components/ui/AppTextInput';
import { Chip } from '@/components/ui/Chip';
import { Stepper } from '@/components/ui/Stepper';
import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme';
import type { Gender } from '@/types/models';
import { ageFromDob } from '@/utils/time';

import { PRODUCT_OPTIONS } from '../options';
import { draftDobIso, useOnboardingStore } from '../onboardingStore';
import { ChipGrid, FieldLabel, MoneyInput, StepScreen } from './common';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

export function NameStep() {
  const { draft, patch } = useOnboardingStore();
  return (
    <StepScreen title="What should we call you?" subtitle="Just a first name is fine.">
      <AppTextInput
        placeholder="Your name"
        defaultValue={draft.name}
        onChangeText={(name) => patch({ name })}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        accessibilityLabel="Your name"
      />
    </StepScreen>
  );
}

export function AboutYouStep() {
  const { draft, patch } = useOnboardingStore();
  const dobIso = draftDobIso(draft);
  const filled = draft.dobDay !== '' && draft.dobMonth !== '' && draft.dobYear.length === 4;

  return (
    <StepScreen title="About you" subtitle="Helps personalize your recovery timeline and coaching.">
      <FieldLabel>Date of birth</FieldLabel>
      <View style={dobStyles.row}>
        <AppTextInput
          placeholder="DD"
          keyboardType="number-pad"
          maxLength={2}
          defaultValue={draft.dobDay}
          onChangeText={(dobDay) => patch({ dobDay: dobDay.replace(/\D/g, '') })}
          style={dobStyles.small}
          accessibilityLabel="Day of birth"
        />
        <AppTextInput
          placeholder="MM"
          keyboardType="number-pad"
          maxLength={2}
          defaultValue={draft.dobMonth}
          onChangeText={(dobMonth) => patch({ dobMonth: dobMonth.replace(/\D/g, '') })}
          style={dobStyles.small}
          accessibilityLabel="Month of birth"
        />
        <AppTextInput
          placeholder="YYYY"
          keyboardType="number-pad"
          maxLength={4}
          defaultValue={draft.dobYear}
          onChangeText={(dobYear) => patch({ dobYear: dobYear.replace(/\D/g, '') })}
          style={dobStyles.year}
          accessibilityLabel="Year of birth"
        />
      </View>
      <AppText variant="caption" color={filled && !dobIso ? colors.danger : colors.textMuted}>
        {dobIso
          ? `You're ${ageFromDob(dobIso)}`
          : filled
            ? 'That date doesn’t look right — check it once more.'
            : 'Day / month / year'}
      </AppText>

      <FieldLabel>Gender</FieldLabel>
      <ChipGrid>
        {GENDER_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={draft.gender === option.value}
            onPress={() => patch({ gender: option.value })}
          />
        ))}
      </ChipGrid>
    </StepScreen>
  );
}

const dobStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  small: { flex: 1, textAlign: 'center' },
  year: { flex: 1.6, textAlign: 'center' },
});

export function ProductsStep() {
  const { draft, toggleIn } = useOnboardingStore();
  return (
    <StepScreen title="What do you use?" subtitle="Select everything that applies.">
      <ChipGrid>
        {PRODUCT_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={draft.products.includes(option.value)}
            onPress={() => toggleIn('products', option.value)}
          />
        ))}
      </ChipGrid>
    </StepScreen>
  );
}

export function UsageStep() {
  const { draft, patch } = useOnboardingStore();
  const usesCigs = draft.products.includes('cigarette') || draft.products.includes('rolled');
  const usesVape = draft.products.includes('vape');
  const usesShisha = draft.products.includes('shisha');

  return (
    <StepScreen
      title="How much do you use?"
      subtitle="Honest numbers make your savings and progress accurate."
    >
      {usesCigs && (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title">Cigarettes / rolled</AppText>
          <FieldLabel>Sticks per day</FieldLabel>
          <Stepper
            value={draft.cigsPerDay}
            onChange={(cigsPerDay) => patch({ cigsPerDay })}
            min={1}
            max={100}
            suffix="sticks"
          />
          <FieldLabel>Price per pack</FieldLabel>
          <MoneyInput
            value={draft.pricePerPack}
            currency={draft.currency}
            onChange={(pricePerPack) => patch({ pricePerPack })}
          />
          <FieldLabel>Sticks per pack</FieldLabel>
          <Stepper
            value={draft.sticksPerPack}
            onChange={(sticksPerPack) => patch({ sticksPerPack })}
            min={1}
            max={50}
            suffix="per pack"
          />
          <FieldLabel>Brand (optional)</FieldLabel>
          <AppTextInput
            placeholder="e.g. Marlboro"
            defaultValue={draft.cigBrand}
            onChangeText={(cigBrand) => patch({ cigBrand })}
          />
        </View>
      )}

      {usesVape && (
        <View style={{ gap: spacing.sm, marginTop: usesCigs ? spacing.xl : 0 }}>
          <AppText variant="title">Vape</AppText>
          <FieldLabel>Nicotine strength (mg/ml)</FieldLabel>
          <Stepper
            value={draft.vapeNicotineMgMl}
            onChange={(vapeNicotineMgMl) => patch({ vapeNicotineMgMl })}
            min={0}
            max={60}
            suffix="mg/ml"
          />
          <FieldLabel>How do you track it?</FieldLabel>
          <ChipGrid>
            <Chip
              label="ml per day"
              selected={draft.vapeAnswerMode === 'ml'}
              onPress={() => patch({ vapeAnswerMode: 'ml' })}
            />
            <Chip
              label="Pods per week"
              selected={draft.vapeAnswerMode === 'pods'}
              onPress={() => patch({ vapeAnswerMode: 'pods' })}
            />
          </ChipGrid>
          {draft.vapeAnswerMode === 'ml' ? (
            <>
              <FieldLabel>ml per day</FieldLabel>
              <Stepper
                value={draft.vapeMlPerDay}
                onChange={(vapeMlPerDay) => patch({ vapeMlPerDay })}
                min={0.5}
                max={30}
                step={0.5}
                suffix="ml"
              />
            </>
          ) : (
            <>
              <FieldLabel>Pods per week</FieldLabel>
              <Stepper
                value={draft.vapePodsPerWeek}
                onChange={(vapePodsPerWeek) => patch({ vapePodsPerWeek })}
                min={1}
                max={30}
                suffix="pods"
              />
            </>
          )}
          <FieldLabel>Cost per pod / bottle</FieldLabel>
          <MoneyInput
            value={draft.vapeCostPerUnit}
            currency={draft.currency}
            onChange={(vapeCostPerUnit) => patch({ vapeCostPerUnit })}
          />
        </View>
      )}

      {usesShisha && (
        <View style={{ gap: spacing.sm, marginTop: usesCigs || usesVape ? spacing.xl : 0 }}>
          <AppText variant="title">Shisha</AppText>
          <FieldLabel>Sessions per week</FieldLabel>
          <Stepper
            value={draft.shishaSessionsPerWeek}
            onChange={(shishaSessionsPerWeek) => patch({ shishaSessionsPerWeek })}
            min={1}
            max={30}
            suffix="sessions"
          />
          <FieldLabel>Cost per session</FieldLabel>
          <MoneyInput
            value={draft.shishaCostPerSession}
            currency={draft.currency}
            onChange={(shishaCostPerSession) => patch({ shishaCostPerSession })}
          />
        </View>
      )}
    </StepScreen>
  );
}

export function DurationStep() {
  const { draft, patch } = useOnboardingStore();
  return (
    <StepScreen
      title="How long have you been using?"
      subtitle="Roughly is fine — this shapes your recovery timeline."
    >
      <FieldLabel>Years</FieldLabel>
      <Stepper
        value={draft.yearsUsing}
        onChange={(yearsUsing) => patch({ yearsUsing })}
        min={0}
        max={60}
        suffix="years"
      />
      <FieldLabel>Months</FieldLabel>
      <Stepper
        value={draft.monthsUsing}
        onChange={(monthsUsing) => patch({ monthsUsing })}
        min={0}
        max={11}
        suffix="months"
      />
      <AppText variant="caption" color={colors.textMuted}>
        Combined: {draft.yearsUsing > 0 ? `${draft.yearsUsing}y ` : ''}
        {draft.monthsUsing}m
      </AppText>
    </StepScreen>
  );
}
