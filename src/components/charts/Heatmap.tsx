import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { colors, font, spacing } from '@/theme';

/**
 * Validated teal ordinal ramp for dark surfaces (dark mode: more = brighter).
 * Passed scripts/validate_palette.js --ordinal against #141418:
 * monotone L, ΔL ≥ 0.06 per step, light end 2.05:1 vs surface.
 */
const RAMP = ['#245147', '#32836E', '#3EB292', '#4ADEB5'] as const;
const EMPTY_CELL = 'rgba(255,255,255,0.045)';

interface HeatmapProps {
  /** 7×24 counts, rows Sunday..Saturday (JS getDay order), columns 0–23h. */
  matrix: number[][];
}

// Display Monday-first; matrix rows are Sunday-first.
const ROW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const ROW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const HOUR_TICKS = [0, 6, 12, 18];

/** Hour-of-day × day-of-week grid showing when it happens most. */
export function Heatmap({ matrix }: HeatmapProps) {
  const [width, setWidth] = useState(0);

  const gap = 2; // surface gap between fills
  const labelCol = 18;
  const cell = width > 0 ? Math.floor((width - labelCol - 24 * gap) / 24) : 0;
  const gridHeight = 7 * (cell + gap) + 14;

  const max = Math.max(1, ...matrix.flat());
  const colorFor = (n: number) => {
    if (n === 0) return EMPTY_CELL;
    const bin = Math.min(RAMP.length - 1, Math.floor((n / max) * RAMP.length));
    return RAMP[bin];
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && cell > 0 && (
        <Svg width={width} height={gridHeight}>
          {ROW_ORDER.map((dow, r) => (
            <SvgText
              key={`label-${dow}`}
              x={0}
              y={r * (cell + gap) + cell / 2 + 3.5}
              fontSize={10}
              fontFamily={font.regular}
              fill={colors.textMuted}
            >
              {ROW_LABELS[r]}
            </SvgText>
          ))}
          {ROW_ORDER.map((dow, r) =>
            matrix[dow].map((n, h) => (
              <Rect
                key={`${dow}-${h}`}
                x={labelCol + h * (cell + gap)}
                y={r * (cell + gap)}
                width={cell}
                height={cell}
                rx={2}
                fill={colorFor(n)}
              />
            )),
          )}
          {HOUR_TICKS.map((h) => (
            <SvgText
              key={`tick-${h}`}
              x={labelCol + h * (cell + gap)}
              y={gridHeight - 2}
              fontSize={10}
              fontFamily={font.regular}
              fill={colors.textMuted}
            >
              {h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`}
            </SvgText>
          ))}
        </Svg>
      )}
      <View style={styles.legend}>
        <AppText variant="caption" color={colors.textMuted}>
          less
        </AppText>
        {RAMP.map((c) => (
          <View key={c} style={[styles.legendCell, { backgroundColor: c }]} />
        ))}
        <AppText variant="caption" color={colors.textMuted}>
          more
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
});
