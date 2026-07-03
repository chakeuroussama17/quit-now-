import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { radii } from '@/theme';

interface SkeletonProps {
  height: number;
  width?: DimensionValue;
  borderRadius?: number;
}

/** Soft pulsing placeholder — no layout jump, no spinner. */
export function Skeleton({ height, width = '100%', borderRadius = radii.md }: SkeletonProps) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 700 }), withTiming(0.35, { duration: 700 })),
      -1,
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ height, width, borderRadius, backgroundColor: 'rgba(255,255,255,0.08)' }, style]}
    />
  );
}
