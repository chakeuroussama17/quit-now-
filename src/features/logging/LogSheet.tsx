import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Chip } from '@/components/ui/Chip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { getPostLogReflection } from '@/services/aiService';
import { useLogsStore } from '@/state/useLogsStore';
import { useProfileStore } from '@/state/useProfileStore';
import { colors, durations, spacing } from '@/theme';
import type { Emotion, ProductType, TriggerType } from '@/types/models';

import { randomAckLine } from './copy';
import { EMOTION_OPTIONS, PRODUCT_LABELS, TRIGGER_OPTIONS } from './options';

interface LogSheetProps {
  visible: boolean;
  onClose: () => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="micro" color={colors.textMuted} style={styles.sectionLabel}>
      {children}
    </AppText>
  );
}

/**
 * One-screen logging form (product pre-selected → tap trigger → tap emotion →
 * Log it). Intensity slider is optional. No shaming after — a calm line, and
 * occasionally a short coach reflection.
 */
export function LogSheet({ visible, onClose }: LogSheetProps) {
  const profile = useProfileStore((s) => s.profile);
  const logSmoke = useLogsStore((s) => s.logSmoke);

  const products = profile?.products ?? ['cigarette'];
  const [product, setProduct] = useState<ProductType | null>(null);
  const [trigger, setTrigger] = useState<TriggerType | null>(null);
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [intensityTouched, setIntensityTouched] = useState(false);
  const [ackLine, setAckLine] = useState<string | null>(null);
  const [reflection, setReflection] = useState<string | null>(null);

  const selectedProduct = product ?? products[0];
  const canLog = trigger !== null && emotion !== null;

  const reset = () => {
    setProduct(null);
    setTrigger(null);
    setEmotion(null);
    setIntensity(5);
    setIntensityTouched(false);
    setAckLine(null);
    setReflection(null);
  };

  const close = () => {
    onClose();
    setTimeout(reset, durations.slow);
  };

  const logIt = async () => {
    if (!canLog) return;
    await logSmoke({
      productType: selectedProduct,
      trigger,
      emotion,
      cravingIntensity: intensityTouched ? intensity : null,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAckLine(randomAckLine());
    // Occasionally (throttled, max 3/day) the coach adds a short reflection.
    getPostLogReflection({ trigger, emotion }).then((text) => {
      if (text) setReflection(text);
    });
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      {ackLine == null ? (
        <View>
          <AppText variant="h2" style={styles.title}>
            Log a smoke
          </AppText>

          <SectionLabel>What did you use?</SectionLabel>
          <View style={styles.chipRow}>
            {products.map((p) => (
              <Chip
                key={p}
                label={PRODUCT_LABELS[p] ?? p}
                selected={selectedProduct === p}
                onPress={() => setProduct(p)}
              />
            ))}
          </View>

          <SectionLabel>What triggered it?</SectionLabel>
          <View style={styles.chipRow}>
            {TRIGGER_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={trigger === option.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTrigger(option.value);
                }}
              />
            ))}
          </View>

          <SectionLabel>How do you feel?</SectionLabel>
          <View style={styles.chipRow}>
            {EMOTION_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={emotion === option.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setEmotion(option.value);
                }}
              />
            ))}
          </View>

          <SectionLabel>Craving intensity</SectionLabel>
          <View style={styles.sliderRow}>
            <AppText variant="caption" color={colors.textMuted}>
              1
            </AppText>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={intensity}
              onValueChange={(v) => {
                setIntensity(v);
                setIntensityTouched(true);
              }}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor="rgba(255,255,255,0.12)"
              thumbTintColor={colors.accent}
              accessibilityLabel="Craving intensity"
            />
            <AppText variant="caption" color={colors.textMuted}>
              10
            </AppText>
            <AppText variant="title" color={colors.accent} style={styles.sliderValue}>
              {intensityTouched ? intensity : '–'}
            </AppText>
          </View>

          <View style={styles.footer}>
            <PrimaryButton label="Log it" onPress={logIt} disabled={!canLog} />
          </View>
        </View>
      ) : (
        <Animated.View entering={FadeInDown.duration(durations.base)}>
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
          <View style={styles.footer}>
            <PrimaryButton label="Done" onPress={close} />
          </View>
        </Animated.View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.sm },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slider: { flex: 1, height: 36 },
  sliderValue: { width: 28, textAlign: 'right' },
  footer: { marginTop: spacing.xl },
  ack: { marginTop: spacing.sm, lineHeight: 26 },
  reflection: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.accentDim,
    gap: spacing.xs,
  },
  reflectionText: { lineHeight: 19 },
});
