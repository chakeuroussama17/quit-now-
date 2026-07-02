/**
 * Exhale design language — "Mature Mode".
 * Dark, calm, premium. One accent (clean-breath teal), amber for warnings.
 * No confetti, no mascots. Think Whoop/Strava, not a kids' game.
 */
export const colors = {
  bg: '#0A0A0C',
  bgElevated: '#101014',
  card: '#141418',
  cardPressed: '#1B1B21',
  hairline: 'rgba(255,255,255,0.07)',
  glass: 'rgba(255,255,255,0.045)',

  accent: '#4ADEB5',
  accentDim: 'rgba(74,222,181,0.14)',
  accentGlow: 'rgba(74,222,181,0.32)',
  onAccent: '#06251C',

  amber: '#F5A623',
  amberDim: 'rgba(245,166,35,0.14)',

  danger: '#E5675F',
  dangerDim: 'rgba(229,103,95,0.14)',

  text: '#F4F5F7',
  textSecondary: '#A3A8B0',
  textMuted: '#5F636B',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
  sheet: 28,
} as const;

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Animation durations (ms) — keep everything in the 200–300ms band. */
export const durations = {
  fast: 200,
  base: 250,
  slow: 300,
} as const;

/** Soft accent glow for hero elements. */
export const accentGlowShadow = {
  shadowColor: colors.accent,
  shadowOpacity: 0.35,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 0 },
  elevation: 12,
} as const;
