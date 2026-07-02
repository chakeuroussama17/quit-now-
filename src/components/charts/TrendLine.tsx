import { useState } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { colors, font } from '@/theme';

interface TrendLineProps {
  /** One value per point, oldest first. */
  data: number[];
  /** X label per point (e.g. weekday initials). */
  labels: string[];
  height?: number;
  /** Optional horizontal target/threshold line (gradual mode). */
  target?: number | null;
  /** Surface behind the chart, used for the end-dot ring. */
  surface?: string;
  color?: string;
}

interface Pt {
  x: number;
  y: number;
}

/** Catmull-Rom → cubic bezier, with control points clamped to the plot band. */
function smoothPath(pts: Pt[], top: number, bottom: number): string {
  if (pts.length < 2) return '';
  const clamp = (y: number) => Math.min(bottom, Math.max(top, y));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6);
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Round a max up to a clean 1/2/5 × 10^k so the scale doesn't look arbitrary. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  for (const m of [1, 2, 5, 10]) {
    if (m * power >= value) return m * power;
  }
  return 10 * power;
}

/**
 * Single-series trend line: 2px smooth stroke with a soft glow, ~10% gradient
 * wash underneath, end dot with a surface ring, endpoint value label.
 * No legend (one series — the card title names it), no grid clutter.
 */
export function TrendLine({
  data,
  labels,
  height = 140,
  target = null,
  surface = colors.card,
  color = colors.accent,
}: TrendLineProps) {
  const [width, setWidth] = useState(0);

  const padTop = 18;
  const padBottom = 22;
  const padX = 10;
  const plotBottom = height - padBottom;

  const max = niceMax(Math.max(...data, target ?? 0, 1) * 1.1);
  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;
  const yFor = (v: number) => plotBottom - (v / max) * (plotBottom - padTop);
  const pts: Pt[] = data.map((v, i) => ({ x: padX + i * stepX, y: yFor(v) }));

  const line = smoothPath(pts, padTop, plotBottom);
  const area =
    pts.length >= 2
      ? `${line} L ${pts[pts.length - 1].x} ${plotBottom} L ${pts[0].x} ${plotBottom} Z`
      : '';
  const end = pts[pts.length - 1];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.14} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* baseline — the only gridline */}
          <Line
            x1={padX}
            y1={plotBottom}
            x2={width - padX}
            y2={plotBottom}
            stroke={colors.hairline}
            strokeWidth={1}
          />

          {target != null && target <= max && (
            <>
              <Line
                x1={padX}
                y1={yFor(target)}
                x2={width - padX}
                y2={yFor(target)}
                stroke={colors.textMuted}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <SvgText
                x={width - padX}
                y={yFor(target) - 4}
                fontSize={10}
                fontFamily={font.regular}
                fill={colors.textMuted}
                textAnchor="end"
              >
                target {target}
              </SvgText>
            </>
          )}

          {area !== '' && <Path d={area} fill="url(#trendFill)" />}

          {/* soft glow under the 2px line */}
          <Path
            d={line}
            stroke={color}
            strokeWidth={7}
            strokeOpacity={0.18}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Path
            d={line}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* end dot with surface ring + endpoint value (text token, not series color) */}
          {end && (
            <>
              <Circle cx={end.x} cy={end.y} r={6.5} fill={surface} />
              <Circle cx={end.x} cy={end.y} r={4.5} fill={color} />
              <SvgText
                x={Math.min(end.x, width - padX - 4)}
                y={end.y - 10}
                fontSize={11}
                fontFamily={font.semibold}
                fill={colors.textSecondary}
                textAnchor="end"
              >
                {Math.round(data[data.length - 1] * 10) / 10}
              </SvgText>
            </>
          )}

          {labels.map((label, i) => (
            <SvgText
              key={i}
              x={padX + i * stepX}
              y={height - 6}
              fontSize={10}
              fontFamily={font.regular}
              fill={colors.textMuted}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}
