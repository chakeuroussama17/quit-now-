import { useEffect, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps extends PropsWithChildren {
  /** 0–1. */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
}

/**
 * A circular progress ring with a soft "breathing" glow behind it — the
 * premium fitness-app hero (Whoop/Oura style). The ring animates to its value
 * on mount/change; the glow pulses gently unless the user has reduce-motion on.
 */
export function ProgressRing({
  progress,
  size = 188,
  stroke = 9,
  color = colors.accent,
  trackColor = 'rgba(255,255,255,0.08)',
  children,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));

  const offset = useSharedValue(circumference);
  const glow = useSharedValue(0.18);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    offset.value = withTiming(circumference * (1 - clamped), { duration: 1100 });
  }, [clamped, circumference, offset]);

  useEffect(() => {
    if (reduceMotion) {
      glow.value = 0.22;
      return;
    }
    // Slow, calm breathe — mirrors the app's whole ethos.
    glow.value = withRepeat(
      withSequence(withTiming(0.34, { duration: 2600 }), withTiming(0.16, { duration: 2600 })),
      -1,
      false,
    );
  }, [reduceMotion, glow]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: size,
            backgroundColor: color,
          },
          glowStyle,
        ]}
      />
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  glow: {
    position: 'absolute',
    // Soft blur-like glow via a large radius fill; opacity animates.
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
