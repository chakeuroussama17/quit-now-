import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme';

interface CardProps extends PropsWithChildren {
  style?: ViewStyle | ViewStyle[];
  /** Subtle glass overlay instead of solid charcoal. */
  glass?: boolean;
}

export function Card({ children, style, glass = false }: CardProps) {
  return <View style={[styles.card, glass && styles.glass, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
  },
  glass: {
    backgroundColor: colors.glass,
  },
});
