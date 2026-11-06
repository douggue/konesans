import React from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Animated, Easing, type ViewStyle, type TextStyle, type StyleProp } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Ellipse, Rect, G } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import { router, usePathname } from 'expo-router';
import { colors, fonts, radius, raised } from '@/lib/theme';
import { ICONS, type IconName } from './icons';
import { useFeatures } from '@/lib/remote';
import { useT } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { tap, sfx } from '@/lib/audio';
import { PressScale, Shake, Bounce, Burst, Pulse, Pop, Bob, Hop, AnimatedBar, useBlink, useCountUp, reduceMotion } from './motion';
import { FLAG_SVG } from './flags';
export * from './motion';
export { Avatar, AvatarArt, avatarFromSeed } from './avatar';

// ─── Text ────────────────────────────────────────────────────────────────────
type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bold' | 'small' | 'label';
const SIZES: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36 },
  h1: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  h2: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24 },
  h3: { fontFamily: fonts.bodyHeavy, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.bodyRegular, fontSize: 15, lineHeight: 21 },
  bold: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 16, letterSpacing: 1 },
};
export function T({ v = 'body', color = colors.ink, style, children, center, ...rest }: { v?: Variant; color?: string; center?: boolean; style?: StyleProp<TextStyle>; children: React.ReactNode } & Omit<React.ComponentProps<typeof Text>, 'style'>) {
  const scale = useStore((s) => [0.9, 1, 1.18][s.settings.textSize]);
  const base = SIZES[v];
  // Android adds the font's own top/bottom padding (large for Baloo 2), which pushes text off-centre in buttons, pills and tiles.
  return <Text {...rest} style={[base, { fontSize: base.fontSize! * scale, lineHeight: base.lineHeight! * scale, color, includeFontPadding: false, textAlignVertical: 'center' }, center && { textAlign: 'center' }, style]}>{children}</Text>;
}

// ─── Layout ──────────────────────────────────────────────────────────────────
/** Every screen. Clears the status bar and, at the bottom, the Android gesture / 3-button bar (edge-to-edge). */
export function Screen({ children, scroll = true, pad = 20, bottom, style }: { children: React.ReactNode; scroll?: boolean; pad?: number; bottom?: React.ReactNode; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  const padBottom = bottom ? 24 : 24 + insets.bottom; // with a BottomNav, the nav itself clears the system bar
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.bg }, style]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding: pad, paddingBottom: padBottom, gap: 14 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      ) : (
        <View style={{ flex: 1, padding: pad, paddingBottom: Math.max(pad, padBottom - 4), gap: 14 }}>{children}</View>
      )}
      {bottom}
    </SafeAreaView>
  );
}

export function Card({ children, style, edge, soft, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; edge?: string; soft?: string; onPress?: () => void }) {
  const base = [raised(edge), soft ? { backgroundColor: soft } : null, { padding: 14 }, style];
  if (onPress) return <PressScale role="button" scaleTo={0.97} onPress={() => { tap(); onPress(); }} style={({ pressed }) => [base, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 3 }]}>{children}</PressScale>;
  return <View style={base}>{children}</View>;
}

export function Row({ children, gap = 10, style, center = true }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; center?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: center ? 'center' : 'flex-start', gap }, style]}>{children}</View>;
}

export function Icon({ name, size = 28, style }: { name: IconName; size?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: size, height: size }, style]}><SvgXml xml={ICONS[name]} width={size} height={size} /></View>;
}

export function IconTile({ name, bg, size = 56 }: { name: IconName; bg: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size * 0.29, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Icon name={name} size={size * 0.72} /></View>;
}

// ─── Buttons ─────────────────────────────────────────────────────────────────
export function Button({ title, onPress, variant = 'primary', color = colors.blue, icon, disabled, style, small }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost'; color?: string; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const primary = variant === 'primary';
  const bg = primary ? color : variant === 'secondary' ? colors.card : 'transparent';
  const fg = primary ? '#FFFFFF' : color;
  return (
    <PressScale role="button" disabled={disabled} scaleTo={0.96} onPress={() => { tap(); sfx('tap'); onPress(); }} style={({ pressed }) => [
      { minHeight: small ? 44 : 54, borderRadius: radius.md, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: bg },
      primary && { borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.25)' },
      variant === 'secondary' && { borderWidth: 2, borderColor: colors.line, borderBottomWidth: 5 },
      pressed && { transform: [{ translateY: 2 }], borderBottomWidth: primary ? 2 : variant === 'secondary' ? 3 : 0 },
      disabled && { opacity: 0.45 },
      style,
    ]}>
      {icon && <Icon name={icon} size={22} />}
      <T v="h3" color={fg}>{title}</T>
    </PressScale>
  );
}

type OptState = 'idle' | 'picked' | 'right' | 'wrong' | 'dim';
/** Answer option. Bounces + bursts stars when it turns right, shakes when it turns wrong. */
export function OptionButton({ label, state, onPress, letter, big, media, celebrate }: { label: string; state: OptState; onPress?: () => void; letter?: string; big?: boolean; media?: React.ReactNode; /** burst stars when this turns right (the kid picked it) */ celebrate?: boolean }) {
  const map = {
    idle: { bg: colors.card, edge: colors.line, fg: colors.ink },
    picked: { bg: colors.blueSoft, edge: colors.blue, fg: colors.blue },
    right: { bg: colors.greenSoft, edge: colors.green, fg: '#12632F' },
    wrong: { bg: colors.redSoft, edge: colors.red, fg: '#8F0A22' },
    dim: { bg: colors.card, edge: colors.line, fg: colors.muted },
  }[state];
  return (
    <Shake trigger={state === 'wrong' ? 'wrong' : null}>
      <Bounce trigger={state === 'right' ? 'right' : null} amount={0.05}>
        <PressScale role="button" disabled={!onPress} scaleTo={0.97} onPress={() => { tap(); sfx('tap'); onPress?.(); }} style={({ pressed }) => [
          { minHeight: big ? 72 : 60, borderRadius: radius.md, borderWidth: 2, borderColor: map.edge, borderBottomWidth: 5, backgroundColor: map.bg, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
          pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 3 },
          state === 'dim' && { opacity: 0.5 },
        ]}>
          {letter && <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: state === 'idle' || state === 'dim' ? colors.blueSoft : map.edge, alignItems: 'center', justifyContent: 'center' }}><T v="small" color={state === 'idle' || state === 'dim' ? colors.blue : '#FFFFFF'}>{state === 'right' ? '✓' : state === 'wrong' ? '✕' : letter}</T></View>}
          {media}
          {label ? <T v={big ? 'h2' : 'h3'} color={map.fg} style={{ flex: 1 }}>{label}</T> : <View style={{ flex: 1 }} />}
        </PressScale>
        <Burst trigger={state === 'right' && celebrate ? 'right' : null} count={10} radius={70} shapes="stars" />
      </Bounce>
    </Shake>
  );
}

export function Pill({ text, color = colors.blue, bg = colors.blueSoft, icon, pulse }: { text: string; color?: string; bg?: string; icon?: IconName; pulse?: boolean }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>{icon && (pulse ? <Pulse amount={0.18}><Icon name={icon} size={16} /></Pulse> : <Icon name={icon} size={16} />)}<T v="small" color={color}>{text}</T></View>;
}

/** Number that counts up from the last value shown under the same key (coins, XP, streak). */
export function CountPill({ value, k, suffix = '', ...p }: { value: number; k: string; suffix?: string; color?: string; bg?: string; icon?: IconName; pulse?: boolean }) {
  const n = useCountUp(value, k);
  return <Bounce trigger={n === value && value > 0 ? value : null} amount={0.12}><Pill {...p} text={`${n}${suffix}`} /></Bounce>;
}

export function Progress({ value, color = colors.blueLight, height = 10, track = colors.line, style, linear }: { value: number; color?: string; height?: number; track?: string; style?: StyleProp<ViewStyle>; linear?: boolean }) {
  return <AnimatedBar value={value} color={color} height={height} track={track} style={style} linear={linear} />;
}

export function Stars({ n, size = 18, pop }: { n: number; size?: number; pop?: boolean }) {
  return (
    <Row gap={2}>
      {[1, 2, 3].map((i) => {
        const star = <T style={{ fontSize: size, lineHeight: size + 4 }} color={i <= n ? colors.yellowDark : colors.line}>★</T>;
        return pop ? <Pop key={i} delay={250 + i * 220} rotate={-25}>{star}</Pop> : <View key={i}>{star}</View>;
      })}
    </Row>
  );
}

// ─── Top bar / Bottom nav ────────────────────────────────────────────────────
export function TopBar({ title, sub, right, onBack, close }: { title: string; sub?: string; right?: React.ReactNode; onBack?: () => void; close?: boolean }) {
  const t = useT();
  return (
    <Row gap={12}>
      <PressScale role="button" accessibilityLabel={t('back')} scaleTo={0.9} onPress={() => { tap(); onBack ? onBack() : router.canGoBack() ? router.back() : router.replace('/home'); }} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={close ? 'femen' : 'retounen'} size={24} />
      </PressScale>
      <View style={{ flex: 1 }}>
        <T v="h1">{title}</T>
        {sub ? <T v="small" color={colors.muted}>{sub}</T> : null}
      </View>
      {right}
    </Row>
  );
}

const ALL_TABS: { href: string; icon: IconName; key: 'home' | 'challenge' | 'course' | 'coding' | 'me' }[] = [
  { href: '/home', icon: 'lakay', key: 'home' }, { href: '/categories', icon: 'defi', key: 'challenge' }, { href: '/course', icon: 'kou', key: 'course' }, { href: '/coding', icon: 'robo', key: 'coding' }, { href: '/profile', icon: 'avata', key: 'me' },
];
let lastTab = 0; // where the indicator was on the previous tab screen, so it can slide from there
let navLock = 0;
export function BottomNav() {
  const t = useT();
  const features = useFeatures();
  const TABS = ALL_TABS.filter((tab) => (tab.key !== 'course' || features.courses) && (tab.key !== 'coding' || features.coding));
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const idx = Math.max(0, TABS.findIndex((tab) => path === tab.href || path.startsWith(tab.href + '/')));
  const [w, setW] = React.useState(0);
  const x = React.useRef(new Animated.Value(lastTab)).current;
  React.useEffect(() => {
    if (reduceMotion()) x.setValue(idx);
    else Animated.spring(x, { toValue: idx, useNativeDriver: true, speed: 14, bounciness: 7 }).start();
    lastTab = idx;
  }, [idx]);
  const tabW = w / TABS.length;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width - 12)} style={{ flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 2, borderTopColor: colors.line, paddingTop: 8, paddingBottom: 8 + Math.max(insets.bottom, 10), paddingHorizontal: 6 }}>
      {w > 0 && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 8, left: 6, width: tabW, height: 34, alignItems: 'center', transform: [{ translateX: x.interpolate({ inputRange: [0, TABS.length - 1], outputRange: [0, tabW * (TABS.length - 1)] }) }], opacity: TABS.length > 1 ? 1 : 0 }}>
          <View style={{ width: 52, height: 34, borderRadius: 12, backgroundColor: colors.blueSoft }} />
        </Animated.View>
      )}
      {TABS.map((tab, i) => {
        const on = i === idx;
        return (
          <PressScale role="button" key={tab.key} accessibilityLabel={t(tab.key)} accessibilityState={{ selected: on }} scaleTo={0.88}
            onPress={() => { const n = Date.now(); if (on || n - navLock < 500) return; navLock = n; tap(); router.replace(tab.href as never); }}
            style={{ flex: 1, alignItems: 'center', height: 54, justifyContent: 'flex-start' }}>
            {/* a fixed 34px icon row = exactly the sliding highlight's box, so icon and highlight always line up */}
            <View style={{ height: 34, width: 52, alignItems: 'center', justifyContent: 'center', opacity: on ? 1 : 0.55 }}><Icon name={tab.icon} size={28} /></View>
            <T v="small" color={on ? colors.blue : colors.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} center style={{ width: '100%', paddingHorizontal: 2, marginTop: 2 }}>{t(tab.key)}</T>
          </PressScale>
        );
      })}
    </View>
  );
}

// ─── Sheet (confirm) ─────────────────────────────────────────────────────────
/** Bottom sheet: backdrop fades, sheet springs up (mockup sUp/sScrim); both play in reverse on close. */
export function Sheet({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = React.useState(open);
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (open) {
      setMounted(true);
      if (reduceMotion()) v.setValue(1);
      else Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(v, { toValue: 0, duration: reduceMotion() ? 0 : 220, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [open]);
  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,33,61,0.45)', opacity: v }} />
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 28 + insets.bottom, gap: 12, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 6 }} />
          <T v="h1" center>{title}</T>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Mascot: Ti Zwazo (art in ./mascot-art.ts, live rig in ./mascot.tsx) ─────
export { Mascot, MascotArt, MascotRig, MASCOT_MOODS, type MascotMood, type RigValues } from './mascot';
// ─── Haitian motifs for blue hero cards: Sitadèl Laferyè, Monument Vètyè, the flag's white panel ──
// The arms are the real emblem (from the MIT-licensed flag-icons flag) flattened to white; the two monuments are hand-drawn silhouettes pending traced photos.
const MOTIF_SVG = {
  sitadel: "<path fill-rule=\"evenodd\" fill=\"#FFFFFF\" d=\" M0 100 L0 88 Q40 82 86 76 L108 73 L118 60 L150 12 L158 10 L176 22 L176 30 L188 30 L188 24 L256 24 L256 30 L270 30 L270 20 L286 20 L296 16 L310 16 L320 20 L336 20 L336 34 L344 34 L344 52 Q370 62 390 84 L390 100 Z M126 44 h5 v5 h-5 Z M135 44 h5 v5 h-5 Z M144 44 h5 v5 h-5 Z M126 56 h5 v5 h-5 Z M135 56 h5 v5 h-5 Z M144 56 h5 v5 h-5 Z M153 56 h5 v5 h-5 Z M194 34 h5 v5 h-5 Z M206 34 h5 v5 h-5 Z M218 34 h5 v5 h-5 Z M230 34 h5 v5 h-5 Z M242 34 h5 v5 h-5 Z M194 48 h5 v5 h-5 Z M206 48 h5 v5 h-5 Z M218 48 h5 v5 h-5 Z M230 48 h5 v5 h-5 Z M242 48 h5 v5 h-5 Z M254 48 h5 v5 h-5 Z M194 62 h5 v5 h-5 Z M206 62 h5 v5 h-5 Z M218 62 h5 v5 h-5 Z M230 62 h5 v5 h-5 Z M242 62 h5 v5 h-5 Z M254 62 h5 v5 h-5 Z M266 62 h5 v5 h-5 Z M284 30 h5 v5 h-5 Z M296 30 h5 v5 h-5 Z M308 30 h5 v5 h-5 Z M320 30 h5 v5 h-5 Z M284 44 h5 v5 h-5 Z M296 44 h5 v5 h-5 Z M308 44 h5 v5 h-5 Z M320 44 h5 v5 h-5 Z M332 44 h5 v5 h-5 Z M300 58 h5 v5 h-5 Z M312 58 h5 v5 h-5 Z M324 58 h5 v5 h-5 Z M336 58 h5 v5 h-5 Z\"/> <path d=\"M178 28 L270 28\" stroke=\"#000\" stroke-opacity=\".25\" stroke-width=\"1.5\"/>",
  vetye: "<g fill=\"#FFFFFF\"> <path d=\"M40 100 L40 92 L70 92 L70 86 L96 86 L96 80 L300 80 L300 86 L326 86 L326 92 L352 92 L352 100 Z\"/> <g transform=\"translate(96 10) scale(0.72)\"> <ellipse cx=\"45\" cy=\"62\" rx=\"30\" ry=\"14\" transform=\"rotate(-40 45 62)\"/> <path d=\"M60 48 L70 34 L80 22 L90 24 L86 36 L76 48 L66 58 Z\"/> <path d=\"M80 22 L90 14 L104 20 L102 30 L92 30 L86 36 L78 30 Z\"/> <path d=\"M88 14 L90 4 L95 15 Z M95 15 L100 6 L102 18 Z\"/> <path d=\"M26 74 L20 100 L30 100 L36 78 Z M40 80 L42 100 L52 100 L50 82 Z\"/> <path d=\"M62 50 L80 42 L84 50 L68 58 Z M58 60 L76 60 L76 70 L60 66 Z\"/> <path d=\"M20 66 Q4 64 2 84 Q12 74 24 76 Z\"/> <circle cx=\"52\" cy=\"20\" r=\"6\"/> <path d=\"M40 46 L46 30 L56 26 L62 34 L58 50 Z\"/> <path d=\"M58 32 L74 26 L76 30 L62 38 Z\"/> </g> <path d=\"M170 80 L178 72 L196 70 L206 72 L210 76 L208 80 Z M202 66 a5 5 0 1 1 10 0 a5 5 0 1 1 -10 0 Z\"/> <path d=\"M214 80 L218 46 L226 40 L224 28 a6 6 0 1 1 12 0 L234 40 L242 44 L258 22 L262 25 L246 48 L250 80 Z\"/> <path d=\"M256 23 L272 2 L276 5 L262 27 Z\"/> <path d=\"M254 80 L258 56 L266 50 L264 40 a5 5 0 1 1 10 0 L272 50 L282 56 L284 80 Z\"/> <path d=\"M276 52 L272 8 L275 8 L279 52 Z\"/><path d=\"M273 8 L306 16 L273 26 Z\"/> <path d=\"M288 80 L292 58 L300 52 L298 42 a5 5 0 1 1 10 0 L306 50 L316 44 L322 48 L312 56 L318 80 Z\"/> <path d=\"M320 80 L324 60 L331 54 L329 44 a5 5 0 1 1 10 0 L337 54 L344 60 L346 80 Z M330 66 h14 v12 h-14 Z\"/> </g>",
  drapo: "<g fill=\"#FFFFFF\" stroke=\"none\" > <g transform=\"translate(-80)scale(1.6)\"> <g id=\"kns-a\"> <path d=\"M244.5 143.5h1.4l2.6 10.7-.6 3.4z\"/> <path fill=\"#FFFFFF\" d=\"m243 136.3 1 8.3h1l-2-8.2z\"/> <path d=\"m245.7 154.6-4.3-11.5 1.6-.1 5 14z\"/> <path fill=\"#FFFFFF\" d=\"m239.4 136.5 1.8 8h1.4z\"/> <path d=\"m241.9 150.6-2.5-5.5 1-.2 4.7 9z\"/> <path fill=\"#FFFFFF\" d=\"m236 138.8 2.9 7.6h1.4l-4.2-7.6z\"/> <path fill=\"#FFFFFF\" d=\"m242.3 151.4-11.5-12.5c-3.6 2.8-2.9 8-2.9 8l13 10.2z\"/> <path fill=\"#FFFFFF\" d=\"m248.9 158.2-8.5-8.6c-3.6.2-.8 5.5-.6 6.2l9 7.7z\"/> <path d=\"M248.1 156.8 230.6 138l-.7.5 18.6 20.6zm-18.5-20-.4-.5v-.9l-3.6-2.3 1.6 3.7 1.3.2.3.4z\"/> <path d=\"M227.7 138.1a8.4 8.4 0 0 1 2.7-2.2l1 1.5-2.2 1.8-1.5-1z\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"m225.8 141.3.6 1c.4-.1 4-3.5 4-3.5h2.7l.7-.9c-2-2-3.7.3-3.7.3z\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"M228 143c0-1 1.8-3.2 2-3.3 1.3.4 2.5 1.2 3.9-1.8-1.2 1.4-3.5 0-3.5 0l-1 .8v.4l-3 2.8z\"/> <path fill=\"#FFFFFF\" d=\"m237.3 154.7-14.4-11.4c-2.5 2.5-.4 10.2-.4 10.2l14 7.6.7-6.4z\"/> <path fill=\"#FFFFFF\" d=\"m249.2 164-11.9-9.6c-4 .6-.8 6.5-.6 7.2l12.5 6.8z\"/> <path d=\"m248.7 162-25.6-19.2-.5.6 26.8 21zm-26.8-20.2-.4-.4-.2-.8-4-1.7 2.3 3.3h1.3l.4.4z\"/> <path d=\"M220.3 143.4a8.2 8.2 0 0 1 2.3-2.6l1.2 1.3-1.8 2.1z\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"M219 146.6v1.1c.4-.2 3.7-3.7 3.7-3.7l2.5-.5.6-.8c-1.8-2.1-3.7.7-3.7.7z\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"M221 148.5c-.2-1 1.2-3.8 1.4-4 1.6.5 3 1.2 3.5-2-1 1.6-3.5.4-3.5.4l-.8 1v.5l-2.5 3.3z\"/> <path fill=\"#FFFFFF\" d=\"M236.2 161.7a2783.3 2783.3 0 0 1-18.5-10.5c-1.3 2.3-.1 5.5.5 6 0 1.5-.6 2.3.7 5.5.4 2 1.3 3.9 2.7 5 1.6 6.4 8.2 6.9 10.7 1.6z\"/> <path fill=\"#FFFFFF\" d=\"m248.3 168.5-12.5-7.3c-4 .5 0 8 .3 8.7l12.2 4.3z\"/> <path d=\"m246.2 165.8-28.3-15-.5.6 30 16.7zM216.5 150l-.5-.3-.3-.8-4.1-1 2.7 2.9 1.2-.2.6.3z\"/> <path d=\"M215.2 151.8c.4-1 .8-1.9 1.8-3l1.4 1.1-1.4 2.4z\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"m214.1 155.2.6 1.2 3-4.6 2.5-.9.5-1c-2-1.8-3.5 1.4-3.5 1.4z\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"M216.8 156.8c-.2-1 .5-4.2.7-4.3 1.5.5 2.8.6 3.2-2.6-1 1.5-3.3 1-3.3 1l-.7 1 .1.4-2 4z\"/> </g> <use xlink:href=\"#kns-a\" width=\"100%\" height=\"100%\" transform=\"matrix(-1 0 0 1 499.9 0)\"/> </g> <g transform=\"translate(-80)scale(1.6)\"> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"m248.8 125.6-.5 9h2.9l-.4-9 3-.3-.3-3.6-7.5.3v3.2z\"/> <g id=\"kns-b\" fill=\"#FFFFFF\"> <path d=\"M249.8 121.9c-7.8-7.8-13.9-4-15.3-2.9 1 .2 1.8-.4 2.3-.5l-1 1.2s2.5-1 2.8-1c-.4.3-.8 1-.8 1 .2 0 1.6-1.1 1.8-1.1-.4.4-.5 1.5-.5 1.5l1.2-.5c.3.2-.1.6.1.6 2-.2 4.7 1.7 5 2.3\"/> <path d=\"M247.9 123.3c-.8-1.8-15.6-5-18.6.3 1.2.3 2.3-1 2.3-1v1.2l1.9-1.6-.7 1.6 1.5-1.3v1.3l2-2-.3 1.1 1.7-.7-.2 1\"/> <path d=\"M247.2 123.6c-3.8-2.5-9.6-.8-9.6-.8-3.8 2-5.8 1.7-6.2 5.6.3-.1 1.3-1.4 1.3-1.4l.8 1.5.2-2.1.6 1.7 1-2.8.2 1.9 1.4-1.9.6.6.6-1.5.6 1s1-.6 1.5-.3l1-1.2.3.9 1-1 .3.7.9-.8v.6h3\"/> <path d=\"M246.4 124c-2.7 0-10.3 2.9-12.2 5.8a13.3 13.3 0 0 1 1.3-.6l.3 1.2.5-1.2.1 1c.3-.8.6-.8 1.2-.1l.2-1.1.3 1 .5-1.1s.3 1.2.5 1.2c0 0 .8-2.2 1.2-2.3l.1 1.4.5-1.4.5 1v-1.4l.6 1s.2-1 .6-1.2l.8.7 3.4-2.5\"/> <path d=\"M246.9 124.7c-3.5 1.3-6.7 6.2-6.4 8.2 1.5-2 1.2-1.7 1.9.6 0 0 .2-2 .5-2.2l.5 1.4.1-1.9h.5l-.1-1.1.7.5c-.2-.7-.3-.9.4-1.5 0 0-1 .1-.2-1.5l.7.6s-.2-.7 0-1l2.6-.8\"/> <path d=\"m247.2 125-1.3 2.6.7.2-1.6 1.1 1.3-.1s-2 .7-2.2 2.7l2-1s-1.7 1.8-2 2.9l1.3-1s-1.2 1.2-1 3l.9-1c-.2 2.3-.2 2.5.8 4.2 0 0-.2-2.6 0-3l2.3 2.4-1.2-3.3s1.4 2 2.2 1.9l-1.8-2.7 1.8 1.4-2-3 1.8.6s-1.3-1.7-1.2-2.8l1.3 1.4s-.5-1.5-.4-2l.7.1-1.3-1.4.9-.2-.1-1 .6-.1v-1.1m-1.1 0c-2.2 3-1.1 7.5-2.4 9.9\"/> </g> <use xlink:href=\"#kns-b\" width=\"100%\" height=\"100%\" transform=\"matrix(-1 0 0 1 499.9 0)\"/> <path d=\"M251 166.5s1.1-10 1.1-14.2c0-3.4-.8-10.8-.8-10.8H248s-.5 7.4-.4 10.8c0 4.2 1.1 14.2 1.1 14.2z\"/> <path d=\"M247.7 142h4l-.5-2.7h-2.9z\"/> <path d=\"M248 139.8h3.5l-.7-2.7h-2.2z\"/> <path d=\"M248.2 137.7h3l-.6-2.7h-1.9z\"/> <path d=\"M250.7 134.7h-2l-.3 1h2.5zm.4 29.7h-2.6m2.8-2h-3m3.4-2h-3.8m4-2.1h-4m4-2.2h-4.1m4.2-2h-4.4m4.4-1.7h-4.6m4.6-2.2h-4.6m4.5-2.1h-4.5m4.3-2.2h-4.1m3.9-2h-3.7\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"M250 119c-.8-.3-2.3-1.3-1.9-1.9l.7-1.2c1-2.2 0-1.4 0-2-.2-.8 3.8-.2 3.8 1.3 0 .5-.3.2-.2 2.6l-.8 1.5a3.5 3.5 0 0 1-1.7-.2z\"/> <path d=\"m250.4 125-1-.9.3-7.1 1 .3-.3 7.6z\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"M251.7 119.3c.6-.4 1-1.5.6-2.1-1-1.3-1.7-.8-3.4-1.4-.3.4-1 1-.9 1.6 2.3 1 1.4.2 2.2.3.4 0 .6.5 1.5 1.5z\"/> </g> <g transform=\"translate(-80)scale(1.6)\"> <use xlink:href=\"#kns-c\" width=\"100%\" height=\"100%\" transform=\"matrix(1 0 0 -1 0 320.4)\"/> <path fill=\"#FFFFFF\" stroke=\"none\" stroke-linecap=\"round\" d=\"M238.4 161.8c0 1.2-.9 2.3-1.9 2.3s-1.8-1-1.8-2.4v-1.2h3.7z\"/> <ellipse cx=\"236.5\" cy=\"160.1\" fill=\"#FFFFFF\" stroke=\"none\" rx=\"1.8\" ry=\".9\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"m236.1 161-.3-3.2h1.4l-.2 3.3h-.9z\"/> <path id=\"kns-c\" fill=\"#FFFFFF\" stroke=\"none\" stroke-linecap=\"round\" d=\"M238.5 160.1c-.2.5-1 .9-2 .9s-1.7-.4-2-.9a.8.8 0 0 0 0 .4c0 .7.9 1.2 2 1.2 1.2 0 2.1-.5 2.1-1.2a.8.8 0 0 0 0-.4z\"/> <g id=\"kns-d\"> <path d=\"m246 172.8-7-2.2-3.1-5.3-10.9-.5.4 4 9.3 1.7.8 1.6 10.7 3z\"/> <path fill=\"#FFFFFF\" d=\"m238.7 174.3-11.2-16.5-.5.5 11 16.4z\"/> <path fill=\"#FFFFFF\" d=\"m228.6 158.5-1.2-2c-.3-.4-.6-.5-1.1-.2-.5.2-.4.7-.2 1.1l1 1.9z\"/> <path d=\"m240 164.1-22.5-2.3-.6 3.3 22.4 2.3z\"/> <path d=\"m217 161-.5 4.5h1l.6-4.1zm3.8.7-.2 4.1h.6l.5-3.5zm15.3 1.8-.6 3.8h1.1l.5-3.8zm3.3.1-.7 4.4 1.2.2.4-2.3c0 .5.5.8 1 .8.6 0 1-.5 1-1 0-.6-.4-1-1-1a1 1 0 0 0-1 .6l.3-1.6zm-8 .7-3.2 3.5.4.4 4-2.7zM224 173l3.1-3.5-.3-.4-4 2.7zm8.1-.9-3.7-2.9-.4.3 3 3.8zm-9.3-6.7 3.9 2.8.4-.3-3-3.8zm4.2-2.3.4 4.6h.5l1.2-4.5zm1.2 11-.3-4.5h-.6l-.7 4.6zm5.1-6-4.8.4v.5l4.8.6zm-11.4 1.5 4.7-.7v-.4l-4.8-.5v1.6z\"/> <ellipse cx=\"227.7\" cy=\"168.6\" rx=\"1.3\" ry=\"1.2\"/> <path fill-rule=\"evenodd\" stroke-linecap=\"round\" d=\"M234.4 168.6c0 3.5-3 6.5-6.7 6.5a6.6 6.6 0 0 1-6.7-6.5c0-3.6 3-6.5 6.7-6.5a6.6 6.6 0 0 1 6.7 6.5zm-1.3 0a5.3 5.3 0 0 1-5.4 5.2 5.3 5.3 0 0 1-5.4-5.3 5.3 5.3 0 0 1 5.4-5.1 5.3 5.3 0 0 1 5.4 5.2z\"/> <path d=\"m223.5 165.3-1-.8m8.5 0 1-1m1 9.2-1.1-.9m-8.4 1.9 1-1m21.7-10.6 1.1 6-.9.4-1-6.3z\"/> <path fill=\"#FFFFFF\" d=\"M245.6 161.4c-.5-.3-1.2.1-2.4-1.3-1.9 1.7 0 2 .2 3.7.5.2.9-1.4 2.3-1.5l2.3-.2-.5-.7z\"/> <path fill=\"#FFFFFF\" d=\"m246.4 162.5-.2-1.7c-.3-.7-1-.1-1 .2l.2 1.7z\"/> <path fill-rule=\"evenodd\" d=\"M240.8 167.4v1.6c-.6.2-.5.6-.5 1.2v4.7c-.1.4-.7.4-1 .6-.3.3-.2.8 1 1l1 .1c1.5-.3 1.8-.8 1-1-.3-.2-.9-.4-1-.6v-1.2h1c.2 0 .7-.6.7-1.1v-2.5c0-1.4-1-1.6-1.4-1.5v-1.3zm1.6 2.7c0-.4-.6-.8-.8-.8-.2 0-.7.5-.7.9v1c0 .4.3 1.6.9 1.7.2 0 .6-.4.6-.8z\"/> <path fill=\"#FFFFFF\" d=\"M234.3 172.3c-.7-.2-.7 1.2-.7 1.2h1c.5.2.8.8.6 1.2-.3.2-2.2-.5-2.3 0 .3 1.9 2.9 2.6 3.8 1.8.9-.9 1.1-3-1.8-3.7zm.6.6-.3.6\"/> <path d=\"m215 173-1-4m2.1 3.8-1.5-3.1m4 2.3-3.3-1.8m4.8 1.4-6.2-2.7\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"m210.2 166-2.6.1c-.2.1.5.9.4 1.1-.6 1.1-4.4 1-4.7.8-.5-.5 3.5-.8 3.6-1 0-.4-.6-1.2-.5-1.7 0-.7 1.7-1 1.7-1z\"/> <path fill=\"#FFFFFF\" d=\"m213.2 168-5-4.2s-.3-.2-.5 0 0 .4 0 .4l5.4 4.4.1-.5z\"/> <path d=\"m218.2 172.2-4.2-3.6-.3-1-.8.6c-.3.2-.6.8-.6.8h1.1l3.6 3.4 1.1-.2z\"/> <circle cx=\"232.5\" cy=\"177.1\" r=\".7\"/> <circle cx=\"230.6\" cy=\"175.7\" r=\".7\"/> <circle cx=\"228.1\" cy=\"176.6\" r=\".7\"/> <circle cx=\"224.2\" cy=\"177.4\" r=\".7\"/> <circle cx=\"222.5\" cy=\"177.6\" r=\".7\"/> <circle cx=\"220.8\" cy=\"177.6\" r=\".7\"/> <circle cx=\"219.2\" cy=\"177.6\" r=\".7\"/> <circle cx=\"220\" cy=\"176.3\" r=\".7\"/> <circle cx=\"221.6\" cy=\"176.4\" r=\".7\"/> <circle cx=\"223.1\" cy=\"176.2\" r=\".7\"/> <circle cx=\"222.4\" cy=\"175\" r=\".7\"/> <circle cx=\"220.8\" cy=\"174.9\" r=\".7\"/> <path fill-rule=\"evenodd\" d=\"M236.5 178c0-.3-.8-.2-.8-.6 0-.4 1.2 0 1.3.3.7-.6 1-.2 1.4 0 .6-.8 1.3-.8 2-.2.4-.4 1.4-.3 1.7.2.7-.6 1.3-.5 1.7 0 .2-.3.5-.3.7 0 .3-.7 1.2-.5 1.6 0 .3-.4.7-.1 1.1.1.3-.2.8-.2.8 0 0 .4-.6.3-.6.6 0 .2.4 0 .4.4 0 .3-.6.4-.7 0-.3.4-1.1.2-1.2-.2a.8.8 0 0 1-1.2 0c-.3.2-.7.2-.8 0-.5.5-1.4.4-1.7-.2h-.3a1 1 0 0 1-1.5 0c-.9.6-1.4.4-1.9 0-.5.7-1.4.7-1.5 0-.4.3-1.2.4-1.2 0 0-.2.7-.1.7-.4zm1.6.1c0 .2-.2.3-.4.3s-.4-.1-.4-.3.1-.2.4-.2.4.1.4.2zm1.9-.2c0 .2-.3.3-.6.3s-.5-.1-.5-.3c0-.1.2-.3.5-.3s.5.2.5.3zm3.5.2c0 .2-.2.3-.5.3s-.4-.1-.4-.3c0-.1.2-.3.4-.3s.5.1.5.3zm-1.9 0c0 .2-.2.3-.5.3s-.4-.1-.4-.4c0-.2.2-.4.4-.4s.5.2.5.4zm4 0c0 .1-.1.3-.3.3-.3 0-.5-.2-.5-.4s.2-.3.5-.3c.2 0 .4.1.4.3zm-1.2 0c0 .2 0 .3-.2.3s-.3-.1-.3-.3.1-.2.3-.2zm2.4.1c0 .2 0 .4-.3.4-.1 0-.3-.2-.3-.4s.2-.3.3-.3c.2 0 .3.1.3.3z\"/> </g> <use xlink:href=\"#kns-d\" width=\"100%\" height=\"100%\" transform=\"matrix(-1 0 0 1 499.9 0)\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"M249.8 165.7c-2.5 0-4.5 1-4.5 2.1 0 .2 0 .4.2.6.5.6 2.3 1 4.4 1 2 0 3.6-.3 4.2-.9.2-.2.3-.4.3-.7 0-1.1-2-2-4.6-2z\"/> <path d=\"M254.4 168v7c0 .9-2 1.5-4.5 1.5s-4.6-.6-4.6-1.5v-7c0 .8 2 1.5 4.5 1.5 2.6 0 4.6-.7 4.6-1.5z\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"M245.3 168v1l2.2 7 1.8-5.4 2 5.5 1.3-5.2 1.8 3.5v-1.9l-1.6-3.4a8.3 8.3 0 0 1-.6.2l-1 3.8-1.5-3.6a14.5 14.5 0 0 1-.7 0l-1.5 3.6-1.6-4.4c-.4-.2-.6-.5-.6-.7z\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"M254.4 173.7v1.3c0 .9-2 1.5-4.5 1.5s-4.6-.6-4.6-1.5v-1.3c0 .9 2 1.5 4.5 1.5 2.6 0 4.6-.6 4.6-1.5z\"/> <path d=\"m251.7 175-1.1.2v1.3l1.2-.1zm-4.8-.1v1.3l1.1.2v-1.3a8.9 8.9 0 0 1-1.1-.2zm-1.6-1.2v1.3c0 .3.2.5.5.7v-1.3c-.3-.2-.5-.4-.5-.7zm9.1.2c0 .2-.4.5-.8.7v1.3c.5-.2.8-.5.8-.9z\"/> <path fill=\"#FFFFFF\" d=\"M254.4 168v7c0 .9-2 1.5-4.5 1.5s-4.6-.6-4.6-1.5v-7\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"M253.4 167.5c0 .5-1.6 1-3.5 1-2 0-3.6-.5-3.6-1s1.6-.9 3.5-.9c2 0 3.6.4 3.6 1z\"/> <path d=\"m248.7 168.2.2 1.2h1l.1-1.2zm4.1-.3-1 .2.1 1.2 1-.2zm-5.4-2-.7.3.1 1 .6-.2zm2.4-.3h-.3l.2 1.2h.6l.2-1.2a9.7 9.7 0 0 0-.7 0zm2.7.4-.1 1 .7.3v-1a5.3 5.3 0 0 0-.6-.3zm-6.5 2.8.2-1.3-1-.5v1.5zm8.4-.3v-1.3l-.8.3zm9.3-8.5c.8 0 2 1 2.1 2.5 0 1-1.7 1-1.7 1 0 .5-1 .9-1.8 1-.8 0 .2-1.5.2-1.5-.5-1.3.2-2.7.2-2.7z\"/> <path d=\"M262.5 163h.8s0 .3.2.3.3-.4.3-.4h1.2\"/> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"M264.1 160.9c.7-.5.1-1.5-.4-1.5h-1c-.6 0-1.4.6-1.3 1 0 .5.4.7.8.6.2 0 .6-.6.8-.6.3 0 1 .6 1.1.5z\"/> <path fill-rule=\"evenodd\" d=\"M214.2 174.8c-.6.1-.7.8-.5 1.5-2.6.7-5 1.7-7.4 2.4-.1-.5 1.2-1.8 1.2-1.8.3.1.6.9.6.9 0-1.6 1.6-2.6 1.6-2.6-1-.2-3.7 1-4 1.4 0 0 1-.2 1.2 0 0 0-2.2 2.3-2.3 3 .4.7 4 1.3 4 1.3 0 .2-1 1-1 1 1.5.2 3.7-.8 4.3-1.4 0 0-1.7-.2-3-1.3 0 0 .2.7 0 1 0 0-2-.6-2.3-1 0 0 5-1.2 7.4-2 .1.5.6 1.3 1.2 1.1.3-.1.2-.8 0-1.4a.8.8 0 0 0 .6.2c.4 0 .7-.3.7-.7 0-.4-.3-.7-.7-.7a.8.8 0 0 0-.7.5c-.1-.5-.4-1.4-.8-1.3zm2 1.6c0 .2-.2.3-.4.3a.3.3 0 0 1-.4-.3c0-.2.2-.4.4-.4s.3.2.3.4z\"/> <path d=\"M293 177.9c.2-.4 0-2.2 0-2.2-.5 0-1 .7-1 .7.5-1.6-.8-4-.8-4 .9.1 3.9 3 4 3.6 0 0-1.3-.5-1.5-.4.3 1.5 1.3 2.2 1.7 3 0 0-1.7.3-1.6 1.8h-1.1c-.4-.5.1-1.3.1-1.3l-7.7-3.2c-.5-.2-1.6-.8-1.4-1.4.1-.5 2 .3 2.4.5z\"/> <path d=\"m285.6 176.5 1-1.6c.3-.5-.4-1-.9-.4l-1 1.5c-.4.9.5 1.1 1 .5z\"/> </g> <g fill=\"#FFFFFF\" > <path d=\"m290.2 288.6-.1-3-3.5.3-.2 3.1z\"/> <path d=\"m264.4 292.7-4.7-2.7c19.4 1.8 23.4-5 28.1-5.3 3-.3 3.3 3.2-2.3 1.5l1.5 3.6s-13.8 7.8-27.4 4.6zm84.8-4.1.1-3 4.3.2.2 3.1z\"/> <path d=\"m375.9 292 4.5-2.5c-22.4.7-17.3-3.6-28.4-4.8-3-.4-5 3.4 2.2 1.5l-1.4 3.6h3.5c7.6 5 17.8 5.5 24.6 3.9z\"/> <path d=\"M285.5 286.3v5s12.3 4.6 34.4 4.6c22.2 0 34.4-4.6 34.4-4.6v-5s-9.3 4.3-34.4 4.3c-25 0-34.4-4.3-34.4-4.3z\"/> </g> <path fill=\"#FFFFFF\" stroke=\"none\" d=\"m287.3 291.3 1.1-3.7.5.2-1 3.2 2 .5-.2.5zm3.6-1.6v-.7l.2-.7.6.2-.2.6-.3.7zm5.3-.3.5.2-.4 2.1-.4 1a1.2 1.2 0 0 1-.5.4h-1a2 2 0 0 1-.9-.4 1 1 0 0 1-.4-.6l.1-1 .5-2.2.5.1-.5 2.2a2.1 2.1 0 0 0 0 .8.7.7 0 0 0 .2.4l.5.2h1l.4-1zm.6 4 .6-3.7h.6l1.5 3.4.5-3h.5l-.6 3.9-.5-.1-1.6-3.3-.5 3zm4 .7.6-3.8h.5l-.5 3.8h-.5zm1.6-1.7c0-.6.3-1.1.7-1.4a2 2 0 0 1 1.4-.4c.4 0 .7.1 1 .3l.5.8c.2.3.2.7.1 1a2.2 2.2 0 0 1-.3 1 1.7 1.7 0 0 1-.8.7 2 2 0 0 1-1 .1 2 2 0 0 1-1-.3 1.7 1.7 0 0 1-.5-.8 2.1 2.1 0 0 1-.1-1m.5 0c0 .5 0 1 .3 1.2.2.3.5.5.9.5s.7 0 1-.3c.3-.2.4-.6.5-1a1.9 1.9 0 0 0 0-1 1.2 1.2 0 0 0-.5-.5 1.3 1.3 0 0 0-.7-.3c-.3 0-.7 0-1 .3-.2.2-.4.6-.5 1.2zm3.7 2.3.3-3.8h.6l1.8 3.2.2-3h.5l-.3 3.9h-.5l-1.9-3.2-.2 3zm5.6.4.1-3.8 2.7.1v.5l-2.1-.1-.1 1.1 1.9.1v.5l-2-.1v1.8zm3 .1 1.5-3.8h.6l1.5 4h-.6l-.4-1.3h-1.7l-.4 1.2zm1-1.5h1.4l-.4-1a9.8 9.8 0 0 1-.2-.9l-.2.8-.5 1.1zm3.1 1.6v-3.8h.6v3.8zm2.5 0V292h-1.3v-.4h3.1v.4h-1.3v3.4zm4 0-.3-4h.6l.1 3.4h2v.4zm2.6-.2 1.2-4h.6l2 3.7h-.7l-.5-1h-1.7l-.3 1.3zm1-1.7h1.4l-.5-1-.4-.9a4.8 4.8 0 0 1-.1.8zm4.7 1.2-.4-3.8 2.6-.3.1.5-2.1.2v1.2l2-.2v.5l-1.9.2.2 1.7zm3-2.1a2 2 0 0 1 .2-1.6 2 2 0 0 1 1.3-.7l1 .1c.4.1.6.3.8.6l.4 1-.1 1a1.6 1.6 0 0 1-.6.8 2 2 0 0 1-.9.4 2 2 0 0 1-1-.1 1.7 1.7 0 0 1-.8-.6 2.1 2.1 0 0 1-.4-1zm.5-.1c0 .4.2.8.5 1 .3.3.6.3 1 .3s.7-.2 1-.5c.2-.3.2-.7.2-1.2a2 2 0 0 0-.3-.8 1.3 1.3 0 0 0-.6-.5 1.4 1.4 0 0 0-.7 0c-.4 0-.7.1-1 .4-.1.3-.2.7-.1 1.3m4.1 1.3-.6-3.8 1.7-.3h.8c.2 0 .4 0 .5.2l.3.6c0 .3 0 .5-.2.7-.1.2-.4.4-.7.5a1.4 1.4 0 0 1 .3.1l.5.5 1 .9h-.7l-.7-.6a7.4 7.4 0 0 0-.5-.5 1.2 1.2 0 0 0-.3-.2.8.8 0 0 0-.3 0h-.3l-.6.1.4 1.7zm.2-2.2 1-.2a1.7 1.7 0 0 0 .6-.2.6.6 0 0 0 .3-.6.6.6 0 0 0-.2-.4h-.7l-1.3.1zm6.3-.4h.5c0 .4-.1.8-.3 1a2 2 0 0 1-1 .6 2 2 0 0 1-1 0 1.6 1.6 0 0 1-.8-.6 2.6 2.6 0 0 1-.5-1 2.2 2.2 0 0 1 0-1c0-.4.3-.7.5-.9l.9-.4h1c.4.2.6.4.8.8l-.5.2a1.2 1.2 0 0 0-.5-.5 1.1 1.1 0 0 0-.7 0 1 1 0 0 0-.7.3 1.1 1.1 0 0 0-.3.7v.7a2.3 2.3 0 0 0 .4.8c.1.2.3.4.6.4h.7a1.1 1.1 0 0 0 .6-.3c.2-.2.3-.5.3-.8m1.4 1-1-3.7 2.7-.7.2.4-2.3.6.3 1.1 2.1-.5.2.4-2.2.6.4 1.2 2.4-.6v.4z\"/> </g>",
};
const MOTIF_VIEWBOX: Record<keyof typeof MOTIF_SVG, string> = { sitadel: '0 0 390 100', vetye: '0 0 390 100', drapo: '244.3 179.7 151.4 120.5' };
export type MotifKind = keyof typeof MOTIF_SVG;
export function Motif({ kind = 'sitadel', opacity = 0.16, height = 90, shift = 0 }: { kind?: MotifKind; opacity?: number; height?: number; /** px to slide the drawing right (e.g. so the Citadelle prow clears a button) */ shift?: number }) {
  const body = shift ? `<g transform="translate(${shift} 0)">${MOTIF_SVG[kind]}</g>` : MOTIF_SVG[kind];
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${MOTIF_VIEWBOX[kind]}" preserveAspectRatio="${kind === 'drapo' ? 'xMidYMax meet' : 'xMidYMax slice'}">${body}</svg>`;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height, opacity }}>
      <SvgXml xml={xml} width="100%" height={height} />
    </View>
  );
}
export const Citadelle = (p: Omit<React.ComponentProps<typeof Motif>, 'kind'>) => <Motif kind="sitadel" shift={24} {...p} />;

// ─── Country media ───────────────────────────────────────────────────────────
export const flagEmoji = (iso: string) => iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

/** Real flag artwork (bundled, offline). Falls back to the emoji if a flag is missing. 4:3 like the source art. */
export function Flag({ iso, width = 240, card = true, style }: { iso: string; width?: number; card?: boolean; style?: StyleProp<ViewStyle> }) {
  const xml = FLAG_SVG[iso.toUpperCase()];
  const h = Math.round(width * 0.75);
  const art = xml ? <SvgXml xml={xml} width={width} height={h} /> : <T style={{ fontSize: h * 0.8, lineHeight: h }}>{flagEmoji(iso)}</T>;
  if (!card) return <View style={[{ width, height: h, borderRadius: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>{art}</View>;
  return (
    <View style={[{ borderRadius: 14, borderWidth: 2, borderColor: colors.lineStrong, borderBottomWidth: 5, backgroundColor: colors.card, padding: 6, shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, style]}>
      <View style={{ width, height: h, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>{art}</View>
    </View>
  );
}

export function ShapeView({ d, size = 240 }: { d: string; size?: number }) {
  return (
    <View style={{ width: size, height: size * 0.6, borderRadius: 16, backgroundColor: '#DCEBFF', borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width={size - 16} height={(size - 16) * 0.6} viewBox="0 0 200 120"><Path d={d} fill="#4D7CFE" stroke={colors.ink} strokeWidth={1.5} strokeLinejoin="round" /></Svg>
    </View>
  );
}

export const styles = StyleSheet.create({ grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, half: { width: '47.5%' } });
