import { StyleSheet, View } from 'react-native';

import { AppTextInput } from '@/components/ui/AppTextInput';
import { Chip } from '@/components/ui/Chip';
import { Stepper } from '@/components/ui/Stepper';
import { AppText } from '@/components/ui/AppText';
import { useT, type TKey } from '@/i18n';
import { colors, spacing } from '@/theme';
import type { Gender } from '@/types/models';
import { ageFromDob } from '@/utils/time';

import { PRODUCT_OPTIONS } from '../options';
import { draftDobIso, useOnboardingStore } from '../onboardingStore';
import { ChipGrid, FieldLabel, MoneyInput, StepScreen } from './common';

const GENDERS: Gender[] = ['male', 'female', 'other', 'prefer_not'];

export function NameStep() {
  const t = useT();
  const { draft, patch } = useOnboardingStore();
  return (
    <StepScreen title={t('onb.name.title')} subtitle={t('onb.name.subtitle')}>
      <AppTextInput
        placeholder={t('onb.name.placeholder')}
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
  const t = useT();
  const { draft, patch } = useOnboardingStore();
  const dobIso = draftDobIso(draft);
  const filled = draft.dobDay !== '' && draft.dobMonth !== '' && draft.dobYear.length === 4;

  return (
    <StepScreen title={t('onb.about.title')} subtitle={t('onb.about.subtitle')}>
      <FieldLabel>{t('onb.about.dob')}</FieldLabel>
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
          ? t('onb.about.age', { age: ageFromDob(dobIso) })
          : filled
            ? t('onb.about.dobBad')
            : t('onb.about.dobHint')}
      </AppText>

      <FieldLabel>{t('onb.about.gender')}</FieldLabel>
      <ChipGrid>
        {GENDERS.map((gender) => (
          <Chip
            key={gender}
            label={t(`gender.${gender}` as TKey)}
            selected={draft.gender === gender}
            onPress={() => patch({ gender })}
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
  const t = useT();
  const { draft, toggleIn } = useOnboardingStore();
  return (
    <StepScreen title={t('onb.products.title')} subtitle={t('onb.products.subtitle')}>
      <ChipGrid>
        {PRODUCT_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={t(`product.${option.value}` as TKey)}
            selected={draft.products.includes(option.value)}
            onPress={() => toggleIn('products', option.value)}
          />
        ))}
      </ChipGrid>
    </StepScreen>
  );
}

export function UsageStep() {
  const t = useT();
  const { draft, patch } = useOnboardingStore();
  const usesCigs = draft.products.includes('cigarette') || draft.products.includes('rolled');
  const usesVape = draft.products.includes('vape');
  const usesShisha = draft.products.includes('shisha');

  return (
    <StepScreen title={t('onb.usage.title')} subtitle={t('onb.usage.subtitle')}>
      {usesCigs && (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title">{t('onb.usage.cigs')}</AppText>
          <FieldLabel>{t('onb.usage.sticksPerDay')}</FieldLabel>
          <Stepper
            value={draft.cigsPerDay}
            onChange={(cigsPerDay) => patch({ cigsPerDay })}
            min={1}
            max={100}
          />
          <FieldLabel>{t('onb.usage.pricePerPack')}</FieldLabel>
          <MoneyInput
            value={draft.pricePerPack}
            currency={draft.currency}
            onChange={(pricePerPack) => patch({ pricePerPack })}
          />
          <FieldLabel>{t('onb.usage.sticksPerPack')}</FieldLabel>
          <Stepper
            value={draft.sticksPerPack}
            onChange={(sticksPerPack) => patch({ sticksPerPack })}
            min={1}
            max={50}
          />
          <FieldLabel>{t('onb.usage.brand')}</FieldLabel>
          <AppTextInput
            placeholder="e.g. Marlboro"
            defaultValue={draft.cigBrand}
            onChangeText={(cigBrand) => patch({ cigBrand })}
          />
        </View>
      )}

      {usesVape && (
        <View style={{ gap: spacing.sm, marginTop: usesCigs ? spacing.xl : 0 }}>
          <AppText variant="title">{t('onb.usage.vape')}</AppText>
          <FieldLabel>{t('onb.usage.nicotine')}</FieldLabel>
          <Stepper
            value={draft.vapeNicotineMgMl}
            onChange={(vapeNicotineMgMl) => patch({ vapeNicotineMgMl })}
            min={0}
            max={60}
            suffix="mg/ml"
          />
          <FieldLabel>{t('onb.usage.trackHow')}</FieldLabel>
          <ChipGrid>
            <Chip
              label={t('onb.usage.mlPerDay')}
              selected={draft.vapeAnswerMode === 'ml'}
              onPress={() => patch({ vapeAnswerMode: 'ml' })}
            />
            <Chip
              label={t('onb.usage.podsPerWeek')}
              selected={draft.vapeAnswerMode === 'pods'}
              onPress={() => patch({ vapeAnswerMode: 'pods' })}
            />
          </ChipGrid>
          {draft.vapeAnswerMode === 'ml' ? (
            <>
              <FieldLabel>{t('onb.usage.mlPerDay')}</FieldLabel>
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
              <FieldLabel>{t('onb.usage.podsPerWeek')}</FieldLabel>
              <Stepper
                value={draft.vapePodsPerWeek}
                onChange={(vapePodsPerWeek) => patch({ vapePodsPerWeek })}
                min={1}
                max={30}
              />
            </>
          )}
          <FieldLabel>{t('onb.usage.costPerPod')}</FieldLabel>
          <MoneyInput
            value={draft.vapeCostPerUnit}
            currency={draft.currency}
            onChange={(vapeCostPerUnit) => patch({ vapeCostPerUnit })}
          />
        </View>
      )}

      {usesShisha && (
        <View style={{ gap: spacing.sm, marginTop: usesCigs || usesVape ? spacing.xl : 0 }}>
          <AppText variant="title">{t('onb.usage.shisha')}</AppText>
          <FieldLabel>{t('onb.usage.sessionsPerWeek')}</FieldLabel>
          <Stepper
            value={draft.shishaSessionsPerWeek}
            onChange={(shishaSessionsPerWeek) => patch({ shishaSessionsPerWeek })}
            min={1}
            max={30}
          />
          <FieldLabel>{t('onb.usage.costPerSession')}</FieldLabel>
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
  const t = useT();
  const { draft, patch } = useOnboardingStore();
  return (
    <StepScreen title={t('onb.duration.title')} subtitle={t('onb.duration.subtitle')}>
      <FieldLabel>{t('onb.duration.years')}</FieldLabel>
      <Stepper
        value={draft.yearsUsing}
        onChange={(yearsUsing) => patch({ yearsUsing })}
        min={0}
        max={60}
      />
      <FieldLabel>{t('onb.duration.months')}</FieldLabel>
      <Stepper
        value={draft.monthsUsing}
        onChange={(monthsUsing) => patch({ monthsUsing })}
        min={0}
        max={11}
      />
      <AppText variant="caption" color={colors.textMuted}>
        Combined: {draft.yearsUsing > 0 ? `${draft.yearsUsing}y ` : ''}
        {draft.monthsUsing}m
      </AppText>
    </StepScreen>
  );
}
