import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Line, G, Text as SvgText, Ellipse } from 'react-native-svg';
import { SHAPES, SHAPE_VIEWBOX, worldByIso, type MediaSpec } from '@konesans/core';
import { colors, fonts } from '@/lib/theme';
import { useL } from '@/lib/i18n';
import { T, Flag } from './index';

/**
 * Question pictures (fractions, clocks, money, polygons, country outlines, flags), drawn in the
 * illustration style of design/illustrations/STYLE.md: navy #14213D outlines, flat palette fills.
 * `spec` comes from core `parseMedia`, which is tested against every generator.
 */
const NAVY = colors.ink;
const SW = 3;

export function QuestionMedia({ spec }: { spec: MediaSpec }) {
  switch (spec.type) {
    case 'flag': return <Flag iso={spec.iso} width={232} />;
    case 'shape': return <CountryShape iso={spec.iso} width={240} />;
    case 'shapes': return <CountryPair isos={spec.isos} />;
    case 'fraction': return <FractionPicture n={spec.n} d={spec.d} />;
    case 'clock': return <ClockFace h={spec.h} m={spec.m} />;
    case 'money': return <MoneyPicture items={spec.items} />;
    case 'polygon': return <PolygonPicture name={spec.name} sides={spec.sides} />;
  }
}

// ─── Country outlines ────────────────────────────────────────────────────────
function CountryShape({ iso, width }: { iso: string; width: number }) {
  return (
    <View style={{ width, height: width * 0.6, borderRadius: 16, backgroundColor: '#DCEBFF', borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width={width - 16} height={(width - 16) * 0.6} viewBox={SHAPE_VIEWBOX}><Path d={SHAPES[iso]} fill={colors.blueLight} stroke={NAVY} strokeWidth={1.5} strokeLinejoin="round" /></Svg>
    </View>
  );
}

/** "Ki peyi ki pi gwo?" — both outlines side by side, each fitted to its own box (not to scale), with its name. */
function CountryPair({ isos }: { isos: [string, string] }) {
  const l = useL();
  return (
    <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
      {isos.map((iso) => {
        const c = worldByIso[iso];
        return (
          <View key={iso} style={{ alignItems: 'center', gap: 4, flexShrink: 1 }}>
            <CountryShape iso={iso} width={148} />
            {c ? <T v="small" center numberOfLines={2} style={{ maxWidth: 148 }}>{l({ ht: c.name, fr: c.nameFr })}</T> : null}
          </View>
        );
      })}
    </View>
  );
}

// ─── Fractions ───────────────────────────────────────────────────────────────
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
};
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Halves, thirds and quarters as a pie; sixths and eighths as a bar (easier to count). */
export function FractionPicture({ n, d }: { n: number; d: number }) {
  const label = `${n}/${d}`;
  if (d <= 4) {
    const cx = 60, cy = 60, r = 48;
    return (
      <View accessible accessibilityLabel={label} style={{ alignItems: 'center' }}>
        <Svg width={150} height={150} viewBox="0 0 120 120">
          <Ellipse cx={60} cy={113} rx={34} ry={4} fill={NAVY} opacity={0.08} />
          {d === 1 ? (
            <Circle cx={cx} cy={cy} r={r} fill={n ? colors.blueLight : '#FFFFFF'} stroke={NAVY} strokeWidth={SW} />
          ) : Array.from({ length: d }, (_, i) => {
            const a0 = (360 / d) * i, a1 = (360 / d) * (i + 1);
            const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
            const large = a1 - a0 > 180 ? 1 : 0;
            return <Path key={i} d={`M${cx} ${cy}L${r1(x0)} ${r1(y0)}A${r} ${r} 0 ${large} 1 ${r1(x1)} ${r1(y1)}Z`} fill={i < n ? colors.blueLight : '#FFFFFF'} stroke={NAVY} strokeWidth={SW} strokeLinejoin="round" />;
          })}
          <Path d="M32 34 Q38 26 47 22" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" opacity={n ? 0.9 : 0} />
        </Svg>
      </View>
    );
  }
  const w = 220, h = 64, x0 = 10, y0 = 12, part = w / d;
  return (
    <View accessible accessibilityLabel={label} style={{ alignItems: 'center' }}>
      <Svg width={260} height={92} viewBox="0 0 240 86">
        <Ellipse cx={120} cy={81} rx={100} ry={4} fill={NAVY} opacity={0.08} />
        <Rect x={x0} y={y0} width={w} height={h} rx={10} fill="#FFFFFF" />
        {Array.from({ length: d }, (_, i) => (
          <Rect key={i} x={r1(x0 + i * part)} y={y0} width={r1(part)} height={h} fill={i < n ? colors.blueLight : '#FFFFFF'} stroke={NAVY} strokeWidth={2.5} strokeLinejoin="round" />
        ))}
        <Rect x={x0} y={y0} width={w} height={h} rx={10} fill="none" stroke={NAVY} strokeWidth={SW} />
      </Svg>
    </View>
  );
}

// ─── Clock ───────────────────────────────────────────────────────────────────
/** Analogue clock: short thick hour hand (deep blue), long thin minute hand (red), digits 1–12. */
export function ClockFace({ h, m }: { h: number; m: number }) {
  const cx = 60, cy = 60;
  const hourDeg = ((h % 12) + m / 60) * 30, minDeg = m * 6;
  const [hx, hy] = polar(cx, cy, 24, hourDeg), [mx, my] = polar(cx, cy, 37, minDeg);
  return (
    <View accessible accessibilityLabel={`${h}:${String(m).padStart(2, '0')}`} style={{ alignItems: 'center' }}>
      <Svg width={170} height={170} viewBox="0 0 120 120">
        <Ellipse cx={60} cy={115} rx={36} ry={4} fill={NAVY} opacity={0.08} />
        <Circle cx={cx} cy={cy} r={55} fill={colors.yellow} stroke={NAVY} strokeWidth={SW} />
        <Circle cx={cx} cy={cy} r={47} fill="#FFFFFF" stroke={NAVY} strokeWidth={2.5} />
        {Array.from({ length: 60 }, (_, i) => {
          const big = i % 5 === 0;
          const [x0, y0] = polar(cx, cy, big ? 41 : 43.5, i * 6), [x1, y1] = polar(cx, cy, 45.5, i * 6);
          return <Line key={i} x1={r1(x0)} y1={r1(y0)} x2={r1(x1)} y2={r1(y1)} stroke={NAVY} strokeWidth={big ? 2.2 : 1} strokeLinecap="round" opacity={big ? 1 : 0.45} />;
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const [x, y] = polar(cx, cy, 33, (i + 1) * 30);
          return <SvgText key={i} x={r1(x)} y={r1(y + 4)} fontSize={11} fontWeight="bold" fontFamily={fonts.display} fill={NAVY} textAnchor="middle">{String(i + 1)}</SvgText>;
        })}
        <Line x1={cx} y1={cy} x2={r1(mx)} y2={r1(my)} stroke={colors.redLight} strokeWidth={4} strokeLinecap="round" />
        <Line x1={cx} y1={cy} x2={r1(hx)} y2={r1(hy)} stroke={colors.blue} strokeWidth={6.5} strokeLinecap="round" />
        <Circle cx={cx} cy={cy} r={4.5} fill={colors.yellow} stroke={NAVY} strokeWidth={2} />
        <Path d="M28 30 Q34 22 43 18" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.9} />
      </Svg>
    </View>
  );
}

// ─── Money (gourdes) ─────────────────────────────────────────────────────────
const NOTE_FILL: Record<number, string> = { 10: colors.redLight, 25: colors.blueLight, 50: colors.greenLight, 100: colors.purple, 250: colors.orange, 500: colors.red, 1000: colors.blue };

function Coin({ v }: { v: number }) {
  return (
    <Svg width={52} height={52} viewBox="0 0 52 52">
      <Circle cx={26} cy={26} r={22} fill={v >= 5 ? colors.yellowDark : '#D9DEEA'} stroke={NAVY} strokeWidth={SW} />
      <Circle cx={26} cy={26} r={15.5} fill="none" stroke={NAVY} strokeWidth={1.5} opacity={0.5} />
      <SvgText x={26} y={31} fontSize={15} fontWeight="bold" fontFamily={fonts.display} fill={NAVY} textAnchor="middle">{String(v)}</SvgText>
      <Path d="M12 18 Q15 12 21 9" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function Note({ v }: { v: number }) {
  const fill = NOTE_FILL[v] ?? colors.greenLight;
  return (
    <Svg width={84} height={48} viewBox="0 0 84 48">
      <Rect x={2} y={2} width={80} height={44} rx={6} fill={fill} stroke={NAVY} strokeWidth={SW} />
      <Rect x={8} y={8} width={68} height={32} rx={4} fill="none" stroke={NAVY} strokeWidth={1.5} opacity={0.4} />
      <Ellipse cx={42} cy={24} rx={22} ry={12} fill="#FFFFFF" stroke={NAVY} strokeWidth={2} />
      <SvgText x={42} y={29} fontSize={v >= 1000 ? 12 : 14} fontWeight="bold" fontFamily={fonts.display} fill={NAVY} textAnchor="middle">{`${v} G`}</SvgText>
    </Svg>
  );
}

/** Coins (1 G, 5 G) and notes, in the order of the sum in the prompt. */
export function MoneyPicture({ items }: { items: number[] }) {
  return (
    <View accessible accessibilityLabel={items.map((v) => `${v} G`).join(' + ')} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 8 }}>
      {items.map((v, i) => (v < 10 ? <Coin key={i} v={v} /> : <Note key={i} v={v} />))}
    </View>
  );
}

// ─── Polygons ────────────────────────────────────────────────────────────────
const POLY_FILL: Record<string, string> = { triyang: colors.redLight, kare: colors.blueLight, rektang: colors.greenLight, pentagòn: colors.purple, egzagòn: colors.yellow, oktogòn: colors.orange };

/** A regular polygon (a rectangle for "rektang"), corners marked so they are easy to count. */
export function PolygonPicture({ name, sides }: { name: string; sides: number }) {
  const cx = 60, cy = 62;
  const pts: (readonly [number, number])[] = name === 'rektang'
    ? [[14, 34], [106, 34], [106, 90], [14, 90]]
    : name === 'kare'
      ? [[22, 24], [98, 24], [98, 100], [22, 100]]
      : Array.from({ length: sides }, (_, i) => polar(cx, cy, 48, (360 / sides) * i + (sides % 2 ? 0 : 180 / sides)));
  const d = 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'Z';
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={150} height={150} viewBox="0 0 120 120">
        <Ellipse cx={60} cy={114} rx={34} ry={4} fill={NAVY} opacity={0.08} />
        <G>
          <Path d={d} fill={POLY_FILL[name] ?? colors.blueLight} stroke={NAVY} strokeWidth={SW} strokeLinejoin="round" />
          {pts.map(([x, y], i) => <Circle key={i} cx={r1(x)} cy={r1(y)} r={3.2} fill={NAVY} />)}
        </G>
      </Svg>
    </View>
  );
}
