import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const VB_W = 220;
const VB_H = 240;
/** Vertical span the liquid travels inside the lobes. */
const LUNG_TOP = 80;
const LUNG_BOTTOM = 208;

/**
 * One lobe (viewer's right): narrow apex, full outer bulge, broad base,
 * slightly concave inner edge. The left lobe is this, mirrored.
 */
const LOBE =
  'M 114 84 ' +
  'C 126 72, 150 74, 164 92 ' +
  'C 178 110, 184 140, 180 170 ' +
  'C 177 190, 168 204, 152 206 ' +
  'C 136 208, 124 198, 119 178 ' +
  'C 115 160, 113 120, 114 84 Z';
const MIRROR = `translate(${VB_W}, 0) scale(-1, 1)`;

/** Bronchial branches, drawn faintly inside each lobe. */
const BRANCHES =
  'M 130 96 C 137 116, 141 138, 142 164 ' +
  'M 141 122 C 151 116, 160 114, 169 117 ' +
  'M 142 146 C 151 146, 160 149, 168 156 ' +
  'M 137 106 C 145 101, 152 99, 159 101';

interface LungsProps {
  /** 0–1 — how full the lungs are (1 = fully recovered). */
  progress: number;
  size?: number;
}

/**
 * Anatomical lungs that fill with luminous green liquid as the smoke-free
 * streak grows. Radial volume shading + a bright meniscus give the 3D read;
 * the surface undulates and the organ breathes. Honors reduce-motion.
 */
export function Lungs({ progress, size = 240 }: LungsProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const height = size * (VB_H / VB_W);

  const fillTop = useSharedValue(LUNG_BOTTOM);
  const amp = useSharedValue(0);
  const breath = useSharedValue(1);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    fillTop.value = withTiming(LUNG_BOTTOM - clamped * (LUNG_BOTTOM - LUNG_TOP), {
      duration: 1400,
    });
  }, [clamped, fillTop]);

  useEffect(() => {
    if (reduceMotion) {
      amp.value = 0;
      breath.value = 1;
      return;
    }
    amp.value = withRepeat(
      withSequence(withTiming(5, { duration: 1900 }), withTiming(-5, { duration: 1900 })),
      -1,
      false,
    );
    breath.value = withRepeat(
      withSequence(withTiming(1.022, { duration: 2600 }), withTiming(1, { duration: 2600 })),
      -1,
      false,
    );
  }, [reduceMotion, amp, breath]);

  /** Wavy top edge, filled down to the bottom of the viewBox. */
  const liquidProps = useAnimatedProps(() => {
    const top = fillTop.value;
    const a = amp.value;
    return {
      d:
        `M 0 ${top} Q ${VB_W * 0.25} ${top - a}, ${VB_W * 0.5} ${top} ` +
        `T ${VB_W} ${top} L ${VB_W} ${VB_H} L 0 ${VB_H} Z`,
    };
  });

  /** The same curve, unclosed — stroked as a bright meniscus. */
  const surfaceProps = useAnimatedProps(() => {
    const top = fillTop.value;
    const a = amp.value;
    return {
      d: `M 0 ${top} Q ${VB_W * 0.25} ${top - a}, ${VB_W * 0.5} ${top} T ${VB_W} ${top}`,
      opacity: fillTop.value < LUNG_BOTTOM - 1 ? 0.9 : 0,
    };
  });

  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  return (
    <Animated.View style={[styles.wrap, { width: size, height }, breathStyle]}>
      <Svg width={size} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Defs>
          {/* Liquid: bright mint at the surface → deep teal at the base */}
          <LinearGradient id="liquid" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor="#7DF7D6" />
            <Stop offset="0.5" stopColor={colors.accent} />
            <Stop offset="1" stopColor="#158A6B" />
          </LinearGradient>
          {/* Empty lung tissue */}
          <LinearGradient id="empty" x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor="#2A2A32" />
            <Stop offset="1" stopColor="#131318" />
          </LinearGradient>
          {/* Volume: lit from upper-left, darkened at the rim → reads as 3D */}
          <RadialGradient id="volume" cx="34%" cy="26%" r="82%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.20" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.03" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.42" />
          </RadialGradient>
          <ClipPath id="lungClip">
            <Path d={LOBE} />
            <Path d={LOBE} transform={MIRROR} />
          </ClipPath>
        </Defs>

        {/* Trachea + bronchi */}
        <G stroke="#93A4AC" strokeLinecap="round" fill="none">
          <Path d="M 110 26 V 62" strokeWidth={11} />
          <Path d="M 110 30 L 96 12" strokeWidth={8} />
          <Path d="M 110 30 L 124 12" strokeWidth={8} />
          <Path d="M 110 60 L 128 90" strokeWidth={9} />
          <Path d="M 110 60 L 92 90" strokeWidth={9} />
        </G>

        {/* Lobes: empty tissue → liquid → volume shading, all clipped */}
        <G clipPath="url(#lungClip)">
          <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#empty)" />
          <AnimatedPath animatedProps={liquidProps} fill="url(#liquid)" />
          <AnimatedPath
            animatedProps={surfaceProps}
            stroke="#BFFFEB"
            strokeWidth={2}
            fill="none"
          />
          {/* Faint bronchial tree, visible through the liquid */}
          <G opacity={0.2}>
            <Path
              d={BRANCHES}
              stroke="#E4F2EE"
              strokeWidth={2.2}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={BRANCHES}
              transform={MIRROR}
              stroke="#E4F2EE"
              strokeWidth={2.2}
              fill="none"
              strokeLinecap="round"
            />
          </G>
          {/* The 3D pass — sits above everything inside the lungs */}
          <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#volume)" />
        </G>

        {/* Rim light */}
        <G fill="none" stroke={colors.accent} strokeWidth={1.8} opacity={0.55}>
          <Path d={LOBE} />
          <Path d={LOBE} transform={MIRROR} />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    // Soft teal aura behind the organ
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
});
