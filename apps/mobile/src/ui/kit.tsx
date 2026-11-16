/**
 * Shared building blocks of the 2026 design language, so screens stop re-drawing their own versions:
 * - `HeroHeader`: full-bleed coloured header (under the status bar) with the TopBar, a Haitian motif and an optional mascot.
 * - `SectionLabel`, `Chevron`, `ListRow` (icon tile + title + sub + right side, chunky card), `SelectTile` (one look for
 *   every "pick one" control: soft fill + coloured outline when chosen), `IconButton` (44 px square, like the back button).
 * - `Loader` (Ti Zwazo + bouncing dots), `Dots`, `Skeleton`, `EmptyState`, `ErrorState` (offline / server): the same
 *   loading, empty and error screens everywhere.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { T, Row, Icon, IconTile, Button, TopBar, Motif, Mascot, readableOn, type MotifKind, type MascotMood } from './index';
import { PressScale, Bob, Pop, FadeIn, reduceMotion } from './motion';
import type { IconName } from './icons';
import { colors, fonts, radius } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { tap } from '@/lib/audio';

// ─── Headers ─────────────────────────────────────────────────────────────────
/**
 * Full-bleed coloured header: put it first in a `<Screen bleed>` (the screen then lets it run under the status bar).
 * Text colour follows `readableOn(color)`; the status bar icons follow it while the screen is focused.
 */
export function HeroHeader({ color, title, sub, right, onBack, close, motif = 'sitadel', mascot, mood = 'happy', children, pad = 20 }: {
  color: string; title: string; sub?: string; right?: React.ReactNode; onBack?: () => void; close?: boolean;
  motif?: MotifKind | null; mascot?: boolean; mood?: MascotMood; children?: React.ReactNode; /** the Screen's padding */ pad?: number;
}) {
  const insets = useSafeAreaInsets();
  const ink = readableOn(color);
  const light = ink === '#FFFFFF';
  useFocusEffect(useCallback(() => { setStatusBarStyle(light ? 'light' : 'dark'); return () => setStatusBarStyle('dark'); }, [light]));
  return (
    <View style={{ backgroundColor: color, marginHorizontal: -pad, marginTop: -pad, paddingTop: insets.top + 12, paddingHorizontal: pad, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', gap: 12, borderBottomWidth: 5, borderBottomColor: 'rgba(20,33,61,0.18)' }}>
      {motif ? <Motif kind={motif} opacity={light ? 0.14 : 0.2} height={motif === 'drapo' ? 150 : 84} /> : null}
      {mascot ? <View pointerEvents="none" style={{ position: 'absolute', right: 8, bottom: -6 }}><Mascot size={96} mood={mood} /></View> : null}
      <View style={{ paddingRight: mascot && !right ? 84 : 0 }}><TopBar title={title} sub={sub} right={right} onBack={onBack} close={close} ink={ink} /></View>
      {children ? <View style={{ gap: 10, paddingRight: mascot ? 92 : 0 }}>{children}</View> : null}
    </View>
  );
}

export function SectionLabel({ children, right, color = colors.muted }: { children: string; right?: React.ReactNode; color?: string }) {
  return (
    <Row style={{ marginTop: 4 }}>
      <T v="label" color={color} style={{ flex: 1 }} accessibilityRole="header">{children.toUpperCase()}</T>
      {right}
    </Row>
  );
}

/** The "go there" mark at the end of a tappable row (same as Profile's rows). */
export const Chevron = ({ size = 20 }: { size?: number }) => <Icon name="pwochen" size={size} />;

/** Chunky row card: icon tile · title + sub · right side (chevron by default when tappable). */
export function ListRow({ icon, iconBg = colors.blueSoft, title, sub, subColor = colors.muted, right, onPress, a11y, soft, edge, style }: {
  icon?: IconName; iconBg?: string; title: string; sub?: string; subColor?: string; right?: React.ReactNode; onPress?: () => void; a11y?: string;
  soft?: string; edge?: string; style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <>
      {icon ? <IconTile name={icon} bg={iconBg} size={44} /> : null}
      <View style={{ flex: 1, gap: 1 }}>
        <T v="h3">{title}</T>
        {sub ? <T v="small" color={subColor}>{sub}</T> : null}
      </View>
      {right !== undefined ? right : onPress ? <Chevron /> : null}
    </>
  );
  const box = [{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 64, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: soft ?? colors.card, borderRadius: 18, borderWidth: 2, borderColor: edge ?? colors.line, borderBottomWidth: 5 }, style];
  if (!onPress) return <View style={box}>{body}</View>;
  return (
    <PressScale role="button" accessibilityLabel={a11y ?? (sub ? `${title}. ${sub}` : title)} scaleTo={0.97} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [box, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 3 }]}>{body}</PressScale>
  );
}

/** One look for every "pick one" control: chosen = soft fill + 3 px coloured outline, pressed down; idle = white chunky card. */
export function SelectTile({ on, onPress, children, color = colors.blue, soft = colors.blueSoft, style, a11y, disabled }: {
  on: boolean; onPress: () => void; children: React.ReactNode; color?: string; soft?: string; style?: StyleProp<ViewStyle>; a11y?: string; disabled?: boolean;
}) {
  return (
    <PressScale debounceMs={0} role="button" disabled={disabled} accessibilityLabel={a11y} accessibilityState={{ selected: on, disabled }} scaleTo={0.96}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [{ minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 4,
        backgroundColor: on ? soft : colors.card, borderWidth: on ? 3 : 2, borderColor: on ? color : colors.lineStrong, borderBottomWidth: on ? 3 : 5 },
        on && { transform: [{ translateY: 2 }] }, pressed && !on && { transform: [{ translateY: 2 }], borderBottomWidth: 3 }, disabled && { opacity: 0.45 }, style]}>
      {children}
    </PressScale>
  );
}

/** 44 px square button with one of our icons (refresh, hint…), same box as the TopBar's back button. */
export function IconButton({ icon, onPress, label, bg = colors.card, size = 24 }: { icon: IconName; onPress: () => void; label: string; bg?: string; size?: number }) {
  return (
    <PressScale role="button" accessibilityLabel={label} scaleTo={0.9} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 14, backgroundColor: bg, borderWidth: 2, borderColor: colors.line, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' }, pressed && { borderBottomWidth: 2, transform: [{ translateY: 2 }] }]}>
      <Icon name={icon} size={size} />
    </PressScale>
  );
}

// ─── Loading ─────────────────────────────────────────────────────────────────
/** Three dots hopping one after the other (also inside busy buttons, so nothing jumps). */
export function Dots({ color = colors.blue, size = 9 }: { color?: string; size?: number }) {
  const v = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (reduceMotion()) { v.forEach((x) => x.setValue(0.5)); return; }
    const loops = v.map((x, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 140),
      Animated.timing(x, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay((2 - i) * 140 + 200),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.6, alignItems: 'center', height: size * 2.4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {v.map((x, i) => <Animated.View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: x.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }), transform: [{ translateY: x.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.7] }) }] }} />)}
    </View>
  );
}

/** Ti Zwazo thinking over hopping dots: every "please wait" in the app. Fills its parent and centres itself. */
export function Loader({ label, mood = 'think', size = 112, fill = true }: { label?: string; mood?: MascotMood; size?: number; fill?: boolean }) {
  const t = useT();
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label ?? t('pl_loading')} style={[{ alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 24 }, fill && { flex: 1 }]}>
      <Bob amount={6} duration={1600}><Mascot size={size} mood={mood} /></Bob>
      <Dots />
      <T v="body" center color={colors.muted}>{label ?? t('pl_loading')}</T>
    </View>
  );
}

/** A grey placeholder block that breathes while the real content loads (keeps the layout from jumping). */
export function Skeleton({ h = 16, w = '100%', r = 10, style }: { h?: number; w?: number | `${number}%`; r?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion()) return;
    const l = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 700, useNativeDriver: true })]));
    l.start(); return () => l.stop();
  }, []);
  return <Animated.View style={[{ height: h, width: w, borderRadius: r, backgroundColor: colors.line, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }, style]} />;
}

/** A card-shaped skeleton row (avatar circle + two lines), for lists that come from the server. */
export function SkeletonRow() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.line, backgroundColor: colors.card }}>
      <Skeleton w={40} h={40} r={20} />
      <View style={{ flex: 1, gap: 8 }}><Skeleton w="60%" h={14} /><Skeleton w="85%" h={8} /></View>
      <Skeleton w={36} h={20} />
    </View>
  );
}

// ─── Empty / error ───────────────────────────────────────────────────────────
type Action = { title: string; onPress: () => void; icon?: IconName; color?: string };

/** Nothing here (yet): Ti Zwazo, a title, one line, and one clear thing to do. */
export function EmptyState({ mood = 'happy', title, sub, action, secondary, badge, fill = true }: { mood?: MascotMood; title: string; sub?: string; action?: Action; secondary?: Action; /** small icon pinned on the bird */ badge?: IconName; fill?: boolean }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 }, fill && { flex: 1 }]}>
      <View>
        <Pop><Mascot size={136} mood={mood} /></Pop>
        {badge ? <Pop delay={250} style={{ position: 'absolute', right: -6, bottom: 6 }}><IconTile name={badge} bg={colors.card} size={48} /></Pop> : null}
      </View>
      <FadeIn delay={120}><T v="h1" center accessibilityRole="header">{title}</T></FadeIn>
      {sub ? <FadeIn delay={180}><T v="body" center color={colors.muted} style={{ maxWidth: 320 }}>{sub}</T></FadeIn> : null}
      {action || secondary ? (
        <FadeIn delay={260} style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
          {action ? <Button title={action.title} icon={action.icon} color={action.color ?? colors.blue} onPress={action.onPress} lines={2} /> : null}
          {secondary ? <Button variant="secondary" title={secondary.title} icon={secondary.icon} color={secondary.color ?? colors.blue} onPress={secondary.onPress} lines={2} /> : null}
        </FadeIn>
      ) : null}
    </View>
  );
}

/** Offline / server trouble, said kindly, with a way to try again. `sub` overrides the default line. */
export function ErrorState({ kind = 'offline', sub, onRetry, secondary, fill = true }: { kind?: 'offline' | 'server'; sub?: string; onRetry?: () => void; secondary?: Action; fill?: boolean }) {
  const t = useT();
  return (
    <EmptyState fill={fill} mood={kind === 'offline' ? 'sad' : 'nervous'} badge={kind === 'offline' ? 'wifi' : 'sanentenet'}
      title={t(kind === 'offline' ? 'pl_offline_title' : 'pl_server_title')} sub={sub ?? t(kind === 'offline' ? 'pl_offline_sub' : 'pl_server_sub')}
      action={onRetry ? { title: t('maint_retry'), icon: 'chanje', onPress: onRetry } : undefined} secondary={secondary} />
  );
}

/** Drawn stars (our star icon), for levels and scores. */
export function StarIcons({ n, of = 3, size = 18, gap = 2 }: { n: number; of?: number; size?: number; gap?: number }) {
  return <Row gap={gap}>{Array.from({ length: of }, (_, i) => <Icon key={i} name={i < n ? 'pwen' : 'zetwal_gri'} size={size} />)}</Row>;
}

export const kitStyles = { cardTitle: { fontFamily: fonts.display, fontSize: 17, lineHeight: 21 } };

/** Notification texts keep their emoji (the phone draws them); when we show one inside the app, we take them out. */
export const stripEmoji = (s: string) => s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]\u{FE0F}?/gu, '').replace(/\s+$/, '').replace(/\s{2,}/g, ' ');
