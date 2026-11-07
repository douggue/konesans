/** Konesans Admin UI kit. */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput, Modal, Animated, Platform, ActivityIndicator, Switch, RefreshControl,
  type ViewStyle, type TextStyle, type StyleProp, type TextInputProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { router, usePathname } from 'expo-router';
import { colors, fonts, raised, STATUS, type Status } from './theme';
import { ICONS, type IconName } from './icons';
import { useSession } from './session';

const NATIVE = Platform.OS !== 'web';
export const haptic = (kind: 'tap' | 'ok' | 'warn' = 'tap') => {
  if (!NATIVE) return;
  try {
    if (kind === 'tap') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else Haptics.notificationAsync(kind === 'ok' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  } catch { /* ignore */ }
};

// ─── Text ────────────────────────────────────────────────────────────────────
type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bold' | 'small' | 'label' | 'mono';
const SIZES: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
  h1: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  h2: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24 },
  h3: { fontFamily: fonts.bodyHeavy, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.bodyRegular, fontSize: 15, lineHeight: 21 },
  bold: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 17 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase' },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 12, lineHeight: 16 },
};
export function T({ v = 'body', color = colors.ink, style, children, center, ...rest }: { v?: Variant; color?: string; center?: boolean; style?: StyleProp<TextStyle>; children: React.ReactNode } & Omit<React.ComponentProps<typeof Text>, 'style'>) {
  // Android adds the font's own padding (large for Baloo 2), which pushes text off-centre in buttons and chips.
  return <Text {...rest} style={[SIZES[v], { color, includeFontPadding: false, textAlignVertical: 'center' }, center && { textAlign: 'center' }, style]}>{children}</Text>;
}

export function Row({ children, gap = 10, style, center = true, wrap }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; center?: boolean; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: center ? 'center' : 'flex-start', gap }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Icon({ name, size = 26, style }: { name: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const xml = (ICONS as Record<string, string>)[name] ?? ICONS.kesyon;
  return <View style={[{ width: size, height: size }, style]}><SvgXml xml={xml} width={size} height={size} /></View>;
}
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

const OUTER_KEYS = new Set(['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'position', 'top', 'left', 'right', 'bottom', 'zIndex', 'minWidth', 'maxWidth']);

// ─── Press motion ────────────────────────────────────────────────────────────
/** Pressable with a spring press-scale and a light haptic. */
export function Press({ onPress, onLongPress, style, children, disabled, scaleTo = 0.96, label, hapticKind = 'tap' }: {
  onPress?: () => void; onLongPress?: () => void; style?: StyleProp<ViewStyle>; children: React.ReactNode; disabled?: boolean; scaleTo?: number; label?: string; hapticKind?: 'tap' | 'ok' | 'warn' | 'none';
}) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: NATIVE, speed: 40, bounciness: v === 1 ? 8 : 0 }).start();
  // Layout props (flex, position, margins, self-alignment) belong on the outer pressable so it takes the space.
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle & Record<string, unknown>;
  const outer: Record<string, unknown> = {}, inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) (OUTER_KEYS.has(k) || k.startsWith('margin') ? outer : inner)[k] = v;
  if (outer.flex !== undefined || outer.flexGrow !== undefined) inner.flexGrow = 1;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} disabled={disabled} style={outer as ViewStyle}
      onPressIn={() => to(scaleTo)} onPressOut={() => to(1)}
      onPress={() => { if (hapticKind !== 'none') haptic(hapticKind); onPress?.(); }} onLongPress={onLongPress}
    >
      <Animated.View style={[inner as ViewStyle, { transform: [{ scale: s }] }, disabled && { opacity: 0.5 }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────
export function Screen({ children, scroll = true, pad = 16, bottom, header, onRefresh, refreshing, tabs }: {
  children: React.ReactNode; scroll?: boolean; pad?: number; bottom?: React.ReactNode; header?: React.ReactNode; onRefresh?: () => void; refreshing?: boolean; tabs?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ padding: pad, paddingBottom: (tabs || bottom ? 24 : 24 + insets.bottom), gap: 12 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.blue]} tintColor={colors.blue} /> : undefined}
        >{children}</ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {bottom ? <View style={{ paddingBottom: tabs ? 0 : insets.bottom, backgroundColor: colors.card }}>{bottom}</View> : null}
      {tabs ? <BottomTabs /> : null}
    </SafeAreaView>
  );
}

export function Header({ title, sub, back, right }: { title: string; sub?: string; back?: boolean; right?: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.card, borderBottomWidth: 2, borderBottomColor: colors.line, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {back ? (
        <Press label="Retounen" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ width: 42, height: 42, borderRadius: 14, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="retounen" size={24} />
        </Press>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="h1" numberOfLines={1}>{title}</T>
        {sub ? <T v="small" color={colors.muted} numberOfLines={1}>{sub}</T> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, edge, onPress, onLongPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; edge?: string; onPress?: () => void; onLongPress?: () => void }) {
  const base = [raised(edge), { padding: 14, gap: 8 }, style];
  if (onPress) return <Press onPress={onPress} onLongPress={onLongPress} style={base} scaleTo={0.98}>{children}</Press>;
  return <View style={base}>{children}</View>;
}

// ─── Buttons ─────────────────────────────────────────────────────────────────
type BtnKind = 'primary' | 'good' | 'bad' | 'ghost' | 'plain' | 'danger';
const BTN: Record<BtnKind, { bg: string; edge: string; fg: string }> = {
  primary: { bg: colors.blue, edge: colors.blueDark, fg: '#FFFFFF' },
  good: { bg: colors.green, edge: colors.greenDark, fg: '#FFFFFF' },
  danger: { bg: colors.red, edge: colors.redInk, fg: '#FFFFFF' },
  bad: { bg: colors.redSoft, edge: colors.red, fg: colors.redInk },
  plain: { bg: colors.card, edge: colors.line, fg: colors.ink },
  ghost: { bg: 'transparent', edge: 'transparent', fg: colors.muted },
};
export function Button({ title, onPress, kind = 'primary', icon, disabled, busy, big, style }: { title: string; onPress: () => void; kind?: BtnKind; icon?: string; disabled?: boolean; busy?: boolean; big?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = BTN[kind];
  return (
    <Press onPress={onPress} disabled={disabled || busy} label={title} style={[{
      backgroundColor: c.bg, borderColor: c.edge, borderWidth: kind === 'ghost' ? 0 : 2, borderBottomWidth: kind === 'ghost' ? 0 : 4, borderRadius: 14,
      paddingHorizontal: big ? 20 : 14, minHeight: big ? 56 : 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
    }, style]}>
      {busy ? <ActivityIndicator color={c.fg} /> : icon ? <Icon name={icon} size={big ? 26 : 22} /> : null}
      <T v={big ? 'h3' : 'bold'} color={c.fg}>{title}</T>
    </Press>
  );
}

export function Fab({ onPress, label }: { onPress: () => void; label: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Press onPress={onPress} label={label} style={{ position: 'absolute', right: 16 + insets.right, bottom: 16, width: 60, height: 60, borderRadius: 20, backgroundColor: colors.blue, borderWidth: 2, borderColor: colors.blueDark, borderBottomWidth: 5, alignItems: 'center', justifyContent: 'center' }}>
      <T v="display" color="#FFFFFF" style={{ lineHeight: 34, marginTop: -2 }}>+</T>
    </Press>
  );
}

// ─── Chips & controls ────────────────────────────────────────────────────────
export function Chip({ text, fg = colors.blue, bg = colors.blueSoft, style }: { text: string; fg?: string; bg?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, alignSelf: 'flex-start' }, style]}><T v="small" color={fg}>{text}</T></View>;
}
export function StatusChip({ status }: { status: Status }) {
  const s = STATUS[status] ?? STATUS.review;
  return <Chip text={s.label} fg={s.fg} bg={s.bg} />;
}

export function Toggle({ on, onPress, text, color = colors.blue }: { on: boolean; onPress: () => void; text: string; color?: string }) {
  return (
    <Press onPress={onPress} scaleTo={0.94} style={{ borderWidth: 2, borderColor: on ? color : colors.line, backgroundColor: on ? color : colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <T v="bold" color={on ? '#FFFFFF' : colors.ink} style={{ fontSize: 13 }}>{text}</T>
    </Press>
  );
}

export function Segmented<K extends string>({ value, options, onChange }: { value: K; options: { key: K; label: string; count?: number }[]; onChange: (k: K) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.line, borderRadius: 14, padding: 3, gap: 2 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Press key={o.key} onPress={() => onChange(o.key)} scaleTo={0.95} style={{ flex: 1, borderRadius: 10, paddingVertical: 6, alignItems: 'center', backgroundColor: on ? colors.card : 'transparent' }}>
            <T v="small" color={on ? colors.ink : colors.muted} numberOfLines={1}>{o.label}</T>
            {o.count != null ? <T v="small" color={on ? colors.blue : colors.muted} style={{ fontSize: 11 }}>{o.count}</T> : null}
          </Press>
        );
      })}
    </View>
  );
}

export function Field({ label, style, big, ...props }: { label: string; big?: boolean } & TextInputProps) {
  return (
    <View style={{ gap: 4 }}>
      <T v="label" color={colors.muted}>{label}</T>
      <TextInput
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        {...props}
        style={[{ borderWidth: 2, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: big ? fonts.displayBold : fonts.bodyRegular, fontSize: big ? 17 : 15, minHeight: 44 }, props.multiline && { textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

export function SwitchRow({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row style={{ paddingVertical: 6 }}>
      <View style={{ flex: 1 }}>
        <T v="bold">{label}</T>
        {sub ? <T v="small" color={colors.muted}>{sub}</T> : null}
      </View>
      <Switch value={value} onValueChange={(v) => { haptic(); onChange(v); }} trackColor={{ true: colors.green, false: colors.lineStrong }} thumbColor="#FFFFFF" />
    </Row>
  );
}

export function ProgressBar({ value, color = colors.green, height = 8 }: { value: number; color?: string; height?: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(w, { toValue: Math.max(0, Math.min(1, value)), duration: 600, useNativeDriver: false }).start(); }, [value, w]);
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.line, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height, backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export function Loading({ text = 'N ap chaje…' }: { text?: string }) {
  return <View style={{ padding: 40, alignItems: 'center', gap: 10 }}><ActivityIndicator color={colors.blue} size="large" /><T color={colors.muted}>{text}</T></View>;
}
export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return <View style={{ padding: 32, alignItems: 'center', gap: 8 }}><T v="h2" center>{title}</T>{text ? <T center color={colors.muted}>{text}</T> : null}{action}</View>;
}
export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <View style={{ backgroundColor: colors.redSoft, borderRadius: 14, padding: 12, gap: 8 }}>
      <T color={colors.redInk}>{text}</T>
      {onRetry ? <Button title="Eseye ankò" kind="bad" onPress={onRetry} style={{ alignSelf: 'flex-start' }} /> : null}
    </View>
  );
}
export function Warn({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <View style={{ backgroundColor: colors.redSoft, borderRadius: 12, padding: 10, gap: 2 }}>{items.map((t) => <T key={t} v="small" color={colors.redInk}>⚠ {t}</T>)}</View>;
}

// ─── Sheet (slide-up confirm) ────────────────────────────────────────────────
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(400)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!open) return;
    y.setValue(400); fade.setValue(0);
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: NATIVE, speed: 16, bounciness: 6 }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: NATIVE }),
    ]).start();
  }, [open, y, fade]);
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(20,33,61,0.45)', opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Fèmen" />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, transform: [{ translateY: y }], backgroundColor: colors.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 20 + insets.bottom, gap: 12 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
        <T v="h1" center>{title}</T>
        {children}
      </Animated.View>
    </Modal>
  );
}

// ─── Toast & offline banner ──────────────────────────────────────────────────
export function ToastHost() {
  const toast = useSession((s) => s.toast);
  const hide = useSession((s) => s.hideToast);
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(120)).current;
  useEffect(() => {
    if (!toast) return;
    y.setValue(120);
    Animated.spring(y, { toValue: 0, useNativeDriver: NATIVE, speed: 18, bounciness: 8 }).start();
    const t = setTimeout(() => Animated.timing(y, { toValue: 160, duration: 200, useNativeDriver: NATIVE }).start(() => hide()), toast.action ? 5000 : 2400);
    return () => clearTimeout(t);
  }, [toast, y, hide]);
  if (!toast) return null;
  const bg = toast.kind === 'err' ? colors.red : toast.kind === 'info' ? colors.navy : colors.navy;
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: 86 + insets.bottom, transform: [{ translateY: y }], alignItems: 'center' }}>
      <View style={{ backgroundColor: bg, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: 520 }}>
        <T v="bold" color="#FFFFFF" style={{ flexShrink: 1 }}>{toast.kind === 'ok' ? '✓ ' : ''}{toast.text}</T>
        {toast.action ? (
          <Press onPress={() => { toast.action!.run(); hide(); }} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
            <T v="h3" color="#FFD43B">{toast.action.label}</T>
          </Press>
        ) : null}
      </View>
    </Animated.View>
  );
}

export function OfflineBanner() {
  const offline = useSession((s) => s.offline);
  if (!offline) return null;
  return <View style={{ backgroundColor: colors.red, paddingVertical: 6, paddingHorizontal: 16 }}><T v="small" color="#FFFFFF" center>Pa gen koneksyon ak sèvè a · chanjman yo pa anrejistre</T></View>;
}

// ─── Bottom tabs ─────────────────────────────────────────────────────────────
const TABS: { href: string; icon: string; label: string }[] = [
  { href: '/', icon: 'lakay', label: 'Tablo' },
  { href: '/questions', icon: 'kesyon', label: 'Kesyon' },
  { href: '/categories', icon: 'kat_bank', label: 'Kategori' },
  { href: '/settings', icon: 'paramet', label: 'Paramèt' },
  { href: '/more', icon: 'plis', label: 'Plis' },
];
export function BottomTabs() {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 2, borderTopColor: colors.line, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 8), paddingHorizontal: 6 }}>
      {TABS.map((tab) => {
        const on = tab.href === '/' ? path === '/' : path === tab.href || path.startsWith(tab.href + '/');
        return (
          <Press key={tab.href} label={tab.label} scaleTo={0.9} onPress={() => { if (!on) router.replace(tab.href as never); }} style={{ flex: 1, alignItems: 'center', gap: 2, minHeight: 50, justifyContent: 'center' }}>
            <View style={{ backgroundColor: on ? colors.blueSoft : 'transparent', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2, opacity: on ? 1 : 0.55 }}><Icon name={tab.icon} size={26} /></View>
            <T v="small" color={on ? colors.blue : colors.muted}>{tab.label}</T>
          </Press>
        );
      })}
    </View>
  );
}
