import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { randomResistedLine } from '@/features/logging/copy';
import { useLogsStore } from '@/state/useLogsStore';
import { colors, durations, radii, spacing } from '@/theme';

const SURF_SECONDS = 5 * 60;
// 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s.
const BREATH_CYCLE = [
  { label: 'Breathe in', seconds: 4 },
  { label: 'Hold', seconds: 7 },
  { label: 'Let it go', seconds: 8 },
] as const;
const CYCLE_SECONDS = 19;

function phaseAt(elapsed: number): string {
  const t = elapsed % CYCLE_SECONDS;
  if (t < 4) return BREATH_CYCLE[0].label;
  if (t < 11) return BREATH_CYCLE[1].label;
  return BREATH_CYCLE[2].label;
}

function QuickAction({
  icon,
  label,
  onPress,
  done = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  done?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
    >
      <Ionicons
        name={done ? 'checkmark-circle' : icon}
        size={16}
        color={done ? colors.accent : colors.textSecondary}
      />
      <AppText variant="bodyMedium" color={done ? colors.accent : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Craving SOS (mockup 4): a 5-minute urge-surf countdown with a 4-7-8
 * breathing circle, quick actions, and a big win button. The wave passes.
 */
export function UrgeSurf() {
  const router = useRouter();
  const logResistedCraving = useLogsStore((s) => s.logResistedCraving);

  const [remaining, setRemaining] = useState(SURF_SECONDS);
  const [phase, setPhase] = useState(BREATH_CYCLE[0].label as string);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [waterDone, setWaterDone] = useState(false);
  const [pushupsDone, setPushupsDone] = useState(false);
  const elapsedRef = useRef(0);
  const lastPhaseRef = useRef<string>(BREATH_CYCLE[0].label);

  const scale = useSharedValue(1);

  useFocusEffect(
    useCallback(() => {
      // Restart the surf each time the tab gains focus.
      elapsedRef.current = 0;
      setRemaining(SURF_SECONDS);
      setCelebration(null);
      setWaterDone(false);
      setPushupsDone(false);

      // Reanimated shared values are meant to be written like this; the React
      // Compiler's immutability lint doesn't know that yet.
      // eslint-disable-next-line react-hooks/immutability
      scale.value = withRepeat(
        withSequence(
          withTiming(1.28, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.28, { duration: 7000 }),
          withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );

      const interval = setInterval(() => {
        elapsedRef.current += 1;
        setRemaining((r) => Math.max(0, r - 1));
        const next = phaseAt(elapsedRef.current);
        if (next !== lastPhaseRef.current) {
          lastPhaseRef.current = next;
          setPhase(next);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, 1000);

      return () => {
        clearInterval(interval);
        cancelAnimation(scale);
      };
    }, [scale]),
  );

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const logWin = async () => {
    const duration = Math.min(SURF_SECONDS, elapsedRef.current);
    await logResistedCraving(null, 'urge_surf', duration);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCelebration(randomResistedLine());
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="h2">Craving SOS</AppText>
          <View style={styles.modePill}>
            <AppText variant="caption" color={colors.amber}>
              Urge surfing
            </AppText>
          </View>
        </View>

        {celebration == null ? (
          <>
            <View style={styles.circleArea}>
              <Animated.View style={[styles.breathCircle, circleStyle]}>
                <AppText variant="title" color={colors.accent}>
                  {phase}
                </AppText>
              </Animated.View>
            </View>

            <AppText variant="display" color={colors.text} style={styles.timer}>
              {minutes}:{String(seconds).padStart(2, '0')}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
              {remaining === 0
                ? 'The wave passed. You outlasted it.'
                : 'This wave peaks in about 90 seconds'}
            </AppText>

            <View style={styles.actionsGrid}>
              <QuickAction
                icon="water-outline"
                label="Drink water"
                done={waterDone}
                onPress={() => {
                  Haptics.selectionAsync();
                  setWaterDone(true);
                }}
              />
              <QuickAction
                icon="fitness-outline"
                label="5 push-ups"
                done={pushupsDone}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPushupsDone(true);
                }}
              />
              <QuickAction
                icon="call-outline"
                label="Call someone"
                onPress={() => Linking.openURL('tel:').catch(() => {})}
              />
              <QuickAction
                icon="chatbubble-ellipses-outline"
                label="Talk to coach"
                onPress={() => router.push('/sos-chat')}
              />
            </View>

            <Pressable
              onPress={logWin}
              accessibilityRole="button"
              accessibilityLabel="I beat it — log this win"
              style={({ pressed }) => [styles.winButton, pressed && { opacity: 0.85 }]}
            >
              <AppText variant="title" color={colors.accent}>
                I beat it — log this win
              </AppText>
            </Pressable>
          </>
        ) : (
          <Animated.View entering={FadeInDown.duration(durations.base)} style={styles.celebration}>
            <View style={styles.winBadge}>
              <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
            </View>
            <AppText variant="micro" color={colors.accent}>
              Craving beaten · +40 XP
            </AppText>
            <AppText variant="title" style={styles.celebrationText}>
              {celebration}
            </AppText>
            <Pressable
              onPress={() => {
                elapsedRef.current = 0;
                setRemaining(SURF_SECONDS);
                setCelebration(null);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.winButton, pressed && { opacity: 0.85 }]}
            >
              <AppText variant="title" color={colors.accent}>
                Done
              </AppText>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modePill: {
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.4)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  circleArea: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  breathCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: { textAlign: 'center', marginTop: spacing.md },
  hint: { textAlign: 'center', marginTop: spacing.xs },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  action: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  winButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(74,222,181,0.35)',
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
  },
  celebration: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.md },
  winBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationText: { textAlign: 'center', lineHeight: 26, paddingHorizontal: spacing.lg },
});
