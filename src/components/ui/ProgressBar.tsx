import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, durations, radii } from '@/theme';

interface ProgressBarProps {
  /** 0–1. Values above 1 are clamped and shown in amber (over target). */
  progress: number;
  height?: number;
  color?: string;
}

export function ProgressBar({ progress, height = 5, color }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const width = useSharedValue(clamped);

  useEffect(() => {
    width.value = withTiming(clamped, { duration: durations.slow });
  }, [clamped, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  const fillColor = color ?? (progress > 1 ? colors.amber : colors.accent);

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[styles.fill, fillStyle, { backgroundColor: fillColor, borderRadius: height / 2 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    borderRadius: radii.pill,
  },
  fill: { height: '100%' },
});
