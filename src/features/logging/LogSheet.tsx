import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Chip } from '@/components/ui/Chip';
import { IntensityPicker } from '@/components/ui/IntensityPicker';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { getPostLogReflection } from '@/services/aiService';
import { useLogsStore } from '@/state/useLogsStore';
import { useProfileStore } from '@/state/useProfileStore';
import { colors, durations, spacing } from '@/theme';
import type { Emotion, LocationTag, ProductType, TriggerType } from '@/types/models';

import { randomAckLine } from './copy';
import { EMOTION_OPTIONS, LOCATION_OPTIONS, PRODUCT_LABELS, TRIGGER_OPTIONS } from './options';

interface LogSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Step = 'trigger' | 'emotion' | 'done';

/**
 * The fast logging flow — three taps total:
 * "+" opens the sheet (product pre-selected) → tap a trigger → tap an emotion.
 * The log is saved immediately on the emotion tap; details are optional afterwards.
 */
export function LogSheet({ visible, onClose }: LogSheetProps) {
  const profile = useProfileStore((s) => s.profile);
  const logSmoke = useLogsStore((s) => s.logSmoke);
  const addSmokeDetail = useLogsStore((s) => s.addSmokeDetail);

  const [step, setStep] = useState<Step>('trigger');
  const [product, setProduct] = useState<ProductType | null>(null);
  const [trigger, setTrigger] = useState<TriggerType | null>(null);
  const [loggedId, setLoggedId] = useState<number | null>(null);
  const [ackLine, setAckLine] = useState('');
  const [reflection, setReflection] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [location, setLocation] = useState<LocationTag | null>(null);
  const [note, setNote] = useState('');

  const products = profile?.products ?? ['cigarette'];
  const selectedProduct = product ?? products[0];

  const reset = () => {
    setStep('trigger');
    setProduct(null);
    setTrigger(null);
    setLoggedId(null);
    setReflection(null);
    setShowDetail(false);
    setIntensity(null);
    setLocation(null);
    setNote('');
  };

  const close = () => {
    onClose();
    // Let the exit animation finish before wiping the content.
    setTimeout(reset, durations.slow);
  };

  const pickTrigger = (value: TriggerType) => {
    Haptics.selectionAsync();
    setTrigger(value);
    setStep('emotion');
  };

  const pickEmotion = async (value: Emotion) => {
    const id = await logSmoke({
      productType: selectedProduct,
      trigger,
      emotion: value,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoggedId(id);
    setAckLine(randomAckLine());
    setStep('done');
    // Occasionally (throttled, max 3/day) the coach adds a short reflection.
    getPostLogReflection({ trigger, emotion: value }).then((text) => {
      if (text) setReflection(text);
    });
  };

  const saveDetails = async () => {
    if (loggedId != null) {
      await addSmokeDetail(loggedId, {
        cravingIntensity: intensity,
        locationTag: location,
        note: note.trim() || null,
      });
    }
    close();
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      {step !== 'done' && (
        <View style={styles.productRow}>
          {products.map((p) => (
            <Chip
              key={p}
              label={PRODUCT_LABELS[p] ?? p}
              size="sm"
              selected={selectedProduct === p}
              onPress={() => setProduct(p)}
            />
          ))}
        </View>
      )}

      {step === 'trigger' && (
        <Animated.View entering={FadeInDown.duration(durations.fast)}>
          <AppText variant="h2">Why this one?</AppText>
          <View style={styles.chipGrid}>
            {TRIGGER_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={trigger === option.value}
                onPress={() => pickTrigger(option.value)}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {step === 'emotion' && (
        <Animated.View entering={FadeInDown.duration(durations.fast)}>
          <View style={styles.stepHeader}>
            <Pressable onPress={() => setStep('trigger')} accessibilityLabel="Back to triggers">
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </Pressable>
            <AppText variant="h2">How do you feel right now?</AppText>
          </View>
          <View style={styles.chipGrid}>
            {EMOTION_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={false}
                onPress={() => pickEmotion(option.value)}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {step === 'done' && (
        <Animated.View entering={FadeInDown.duration(durations.fast)}>
          <AppText variant="title" color={colors.textSecondary} style={styles.ack}>
            {ackLine}
          </AppText>

          {reflection && (
            <Animated.View entering={FadeInDown.duration(durations.base)} style={styles.reflection}>
              <AppText variant="micro" color={colors.accent}>
                Coach
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} style={styles.reflectionText}>
                {reflection}
              </AppText>
            </Animated.View>
          )}

          {!showDetail ? (
            <Pressable onPress={() => setShowDetail(true)} style={styles.detailToggle}>
              <AppText variant="bodyMedium" color={colors.accent}>
                Add detail (optional)
              </AppText>
            </Pressable>
          ) : (
            <View style={styles.detailBlock}>
              <AppText variant="caption" color={colors.textSecondary}>
                How strong was the craving?
              </AppText>
              <IntensityPicker value={intensity} onChange={setIntensity} />
              <AppText variant="caption" color={colors.textSecondary}>
                Where are you?
              </AppText>
              <View style={styles.chipGridTight}>
                {LOCATION_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    size="sm"
                    selected={location === option.value}
                    onPress={() => setLocation(option.value)}
                  />
                ))}
              </View>
              <AppTextInput
                placeholder="A note to your future self…"
                defaultValue={note}
                onChangeText={setNote}
                multiline
                style={styles.noteInput}
              />
            </View>
          )}

          <View style={styles.doneFooter}>
            <PrimaryButton label="Done" onPress={showDetail ? saveDetails : close} />
          </View>
        </Animated.View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  productRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  chipGridTight: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ack: { marginTop: spacing.sm, lineHeight: 26 },
  reflection: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.accentDim,
    gap: spacing.xs,
  },
  reflectionText: { lineHeight: 19 },
  detailToggle: { marginTop: spacing.lg, paddingVertical: spacing.sm },
  detailBlock: { marginTop: spacing.lg, gap: spacing.md },
  noteInput: { minHeight: 72, textAlignVertical: 'top', paddingTop: spacing.md },
  doneFooter: { marginTop: spacing.xl },
});
