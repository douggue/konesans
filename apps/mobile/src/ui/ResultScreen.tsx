/**
 * End-of-activity screen shared by the quiz, lesson, Vwayaj, Defi Jodi a and Kalkil Mantal:
 * Ti Zwazo drops in (mood by score) on a soft glow, a headline that changes with the score, our stars,
 * three stat cards with coloured header bands (XP · Presizyon · Tan) that count up, the screen's own extras,
 * and one big primary button (+ an optional secondary) pinned at the bottom.
 * `ResultHero` and `StatCards` are exported on their own for screens that put more under them (daily ranking).
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, Button, Icon, Stars, Mascot, DEEP_GREEN, readableOn, type MascotMood } from './index';
import { Drop, Hop, Pop, FadeIn, Pulse, Burst, Confetti, useCountUp } from './motion';
import type { IconName } from './icons';
import { RankUpListener } from './RankUp';
import { colors } from '@/lib/theme';
import { useT, type StrKey } from '@/lib/i18n';
import { tap } from '@/lib/audio';

export type Tier = 'perfect' | 'great' | 'good' | 'low';
export const tierFor = (ratio: number): Tier => (ratio >= 1 ? 'perfect' : ratio >= 0.8 ? 'great' : ratio >= 0.5 ? 'good' : 'low');
const HEAD: Record<Tier, StrKey[]> = {
  perfect: ['rs_perfect_1', 'rs_perfect_2'], great: ['rs_great_1', 'rs_great_2'], good: ['rs_good_1', 'rs_good_2'], low: ['rs_low_1', 'rs_low_2'],
};
/** Headline colours: all ≥ 3:1 on the page background (large text). */
const INK: Record<Tier, string> = { perfect: DEEP_GREEN, great: DEEP_GREEN, good: colors.blue, low: '#A64B00' };
const GLOW: Record<Tier, string> = { perfect: colors.yellowSoft, great: colors.greenSoft, good: colors.blueSoft, low: colors.orangeSoft };
export const moodFor = (tier: Tier): MascotMood => (tier === 'perfect' ? 'wow' : tier === 'great' ? 'cheer' : tier === 'good' ? 'happy' : 'think');

/** 83 s → "1:23" */
export const fmtTime = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function ResultHero({ tier, mood, headline, sub, stars, compact }: { tier: Tier; mood?: MascotMood; headline?: string; sub?: string; stars?: number; /** smaller mascot, no drop (coming back to look) */ compact?: boolean }) {
  const t = useT();
  const [pick] = useState(() => Math.floor(Math.random() * 2));
  const title = headline ?? t(HEAD[tier][pick % HEAD[tier].length]);
  const m = mood ?? moodFor(tier);
  const happy = tier !== 'low';
  const size = compact ? 104 : 150;
  const bird = happy && !compact ? <Hop height={10} duration={1100}><Mascot size={size} mood={m} /></Hop> : <Mascot size={size} mood={m} />;
  const [landed, setLanded] = useState(false);
  // the bird lands: a little buzz of joy on a good score (haptics respect Paramèt → Vibrasyon)
  useEffect(() => { if (compact) return; const id = setTimeout(() => { setLanded(true); if (happy) tap('success'); }, 520); return () => clearTimeout(id); }, []);
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: size + 40, height: size + 16, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Pulse amount={0.06} duration={2400} style={{ position: 'absolute', bottom: 0, width: size + 30, height: size + 10, borderRadius: (size + 30) / 2, backgroundColor: GLOW[tier] }}><View /></Pulse>
        {compact ? bird : <Drop>{bird}</Drop>}
        {happy && <Burst trigger={landed ? 1 : null} count={12} radius={size * 0.8} shapes="stars" />}
      </View>
      <FadeIn delay={compact ? 0 : 450}><T v="display" center color={INK[tier]} accessibilityRole="header">{title}</T></FadeIn>
      {sub ? <FadeIn delay={compact ? 0 : 600}><T v="h3" center color={colors.muted}>{sub}</T></FadeIn> : null}
      {stars !== undefined && <Stars n={stars} size={compact ? 30 : 40} pop={!compact} />}
    </View>
  );
}

export type Stat = { label: string; value: number; /** shown value (defaults to the number) */ format?: (n: number) => string; icon: IconName | 'target' | 'clock'; color: string; ink: string };

/** The three stat cards. Numbers count up; each card pops in after the last. */
export function StatCards({ items, delay = 900, a11y }: { items: Stat[]; delay?: number; a11y?: string }) {
  return (
    <View accessible={!!a11y} accessibilityLabel={a11y} style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
      {items.map((s, i) => <Pop key={s.label} delay={delay + i * 140} style={{ flex: 1 }}><StatCard s={s} /></Pop>)}
    </View>
  );
}
function StatCard({ s }: { s: Stat }) {
  const n = useCountUp(s.value, undefined, 800);
  const band = readableOn(s.color);
  return (
    <View style={{ flex: 1, borderRadius: 18, borderWidth: 2, borderBottomWidth: 5, borderColor: s.color, backgroundColor: colors.card, overflow: 'hidden' }}>
      <View style={{ backgroundColor: s.color, paddingVertical: 4, paddingHorizontal: 4, minHeight: 24, justifyContent: 'center' }}>
        <T v="label" center color={band} style={{ letterSpacing: 0.5, fontSize: 11, lineHeight: 14 }}>{s.label.toUpperCase()}</T>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 4 }}>
        <StatGlyph icon={s.icon} color={s.ink} />
        <T v="h2" color={s.ink} style={{ fontVariant: ['tabular-nums'] }}>{s.format ? s.format(n) : n}</T>
      </View>
    </View>
  );
}
/** Small glyphs drawn with views (no new art): a target for accuracy, a clock for time; else one of our icons. */
function StatGlyph({ icon, color }: { icon: Stat['icon']; color: string }) {
  if (icon === 'target') return <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: color, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} /></View>;
  if (icon === 'clock') return <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: color }}><View style={{ position: 'absolute', left: 5, top: 1, width: 3, height: 7, borderRadius: 2, backgroundColor: color }} /><View style={{ position: 'absolute', left: 5, top: 5, width: 7, height: 3, borderRadius: 2, backgroundColor: color }} /></View>;
  return <Icon name={icon} size={22} />;
}

/** Standard XP / accuracy / time cards (pass `third` to swap the time card, e.g. Kalkil Mantal's best streak). */
export function useStdStats({ xp, xpLabel, correct, total, timeMs, third }: { xp: number; xpLabel?: string; correct: number; total: number; timeMs?: number; third?: Stat }): { items: Stat[]; a11y: string } {
  const t = useT();
  const acc = total ? Math.round((correct / total) * 100) : 0;
  const items: Stat[] = [
    { label: xpLabel ?? t('rs_xp'), value: xp, format: (n) => (xpLabel ? String(n) : `+${n}`), icon: 'pwen', color: colors.yellowDark, ink: '#5C4600' },
    { label: t('rs_accuracy'), value: acc, format: (n) => `${n}%`, icon: 'target', color: DEEP_GREEN, ink: '#12632F' },
  ];
  if (third) items.push(third);
  else if (timeMs !== undefined) items.push({ label: t('rs_time'), value: Math.round(timeMs / 1000), format: (n) => fmtTime(n * 1000), icon: 'clock', color: colors.blue, ink: colors.blue });
  return { items, a11y: t('rs_stats_a11y', { xp, acc, time: timeMs !== undefined ? fmtTime(timeMs) : '' }) };
}

type Btn = { title: string; onPress: () => void; color?: string; icon?: IconName };

export function ResultScreen({ tier, mood, headline, sub, stars, stats, statsA11y, extras, primary, secondary, confetti, rankUpDelay = 2200, rankUp = true }: {
  tier: Tier; mood?: MascotMood; headline?: string; sub?: string; stars?: number;
  stats: Stat[]; statsA11y?: string;
  /** the screen's own extras under the cards (unlock card, bonus pills, tips…) */
  extras?: React.ReactNode;
  primary: Btn; secondary?: Btn;
  confetti?: boolean;
  /** rank-up / new-trophy popups after the screen has played (off for the trial) */
  rankUp?: boolean; rankUpDelay?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      {confetti && <Confetti />}
      {rankUp && <RankUpListener delayMs={rankUpDelay} />}
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, gap: 18 }}>
        <ResultHero tier={tier} mood={mood} headline={headline} sub={sub} stars={stars} />
        <StatCards items={stats} a11y={statsA11y} />
        {extras ? <View style={{ alignItems: 'center', gap: 10 }}>{extras}</View> : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 + insets.bottom, gap: 10 }}>
        <FadeIn delay={1300} from={20}><Button title={primary.title} color={primary.color ?? colors.blue} icon={primary.icon} onPress={primary.onPress} lines={2} /></FadeIn>
        {secondary ? <FadeIn delay={1400} from={20}><Button variant="secondary" title={secondary.title} color={secondary.color ?? colors.blue} icon={secondary.icon} onPress={secondary.onPress} lines={2} /></FadeIn> : null}
      </View>
    </SafeAreaView>
  );
}
