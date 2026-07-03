import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { colors, font } from '@/theme';

type Variant =
  'display' | 'stat' | 'h1' | 'h2' | 'title' | 'body' | 'bodyMedium' | 'caption' | 'micro';

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

const variants = StyleSheet.create<Record<Variant, TextStyle>>({
  display: {
    fontFamily: font.bold,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  // Proportional figures on static stats (tabular digits look loose at display
  // sizes); 'display' keeps tabular-nums because the live counter ticks.
  stat: {
    fontFamily: font.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  h1: { fontFamily: font.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  h2: { fontFamily: font.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  title: { fontFamily: font.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: font.medium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  micro: {
    fontFamily: font.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

export function AppText({ variant = 'body', color = colors.text, style, ...rest }: AppTextProps) {
  // Dynamic type support with a cap on the huge numerals so layouts survive
  // the largest system font sizes.
  const maxScale = variant === 'display' || variant === 'stat' ? 1.4 : 2;
  return (
    <Text
      maxFontSizeMultiplier={maxScale}
      style={[variants[variant], { color }, style]}
      {...rest}
    />
  );
}
