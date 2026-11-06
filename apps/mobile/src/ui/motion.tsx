/**
 * Motion kit — everything animates with React Native's Animated on the native driver (transform + opacity only),
 * so it stays at 60 fps without extra native modules. Respects the system "reduce motion" setting.
 * Timings mirror the mockup's keyframes (design/project/*.dc.html): springy pops (cubic-bezier .34,1.56,.64,1),
 * 3 s idle bobs, 4 s blinks, 0.55 s shakes.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, View, type LayoutChangeEvent, type StyleProp, type ViewStyle, type PressableProps } from 'react-native';

// ─── reduce motion ───────────────────────────────────────────────────────────
let reduce = false;
const listeners = new Set<(v: boolean) => void>();
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduce = !!v; listeners.forEach((f) => f(reduce)); }).catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => { reduce = !!v; listeners.forEach((f) => f(reduce)); });
export const reduceMotion = () => reduce;
export function useReduceMotion() {
  const [v, setV] = useState(reduce);
  useEffect(() => { listeners.add(setV); return () => { listeners.delete(setV); }; }, []);
  return v;
}

const ND = true; // useNativeDriver (web falls back to JS automatically)
export const springy = Easing.bezier(0.34, 1.56, 0.64, 1);
export const smooth = Easing.bezier(0.22, 0.9, 0.3, 1);

// ─── Press feedback: spring scale + optional "edge" sink, debounced so a double tap can't navigate twice ──
export function PressScale({ onPress, style, children, scaleTo = 0.95, disabled, debounceMs = 450, ...rest }: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle> | ((s: { pressed: boolean }) => StyleProp<ViewStyle>); children?: React.ReactNode; scaleTo?: number; debounceMs?: number }) {
  const s = useRef(new Animated.Value(1)).current;
  const last = useRef(0);
  const [pressed, setPressed] = useState(false);
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: ND, speed: 40, bounciness: v === 1 ? 10 : 0 }).start();
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  return (
    <Animated.View style={[{ transform: [{ scale: s }] }, flattenOuter(resolved)]}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={(e) => { setPressed(true); if (!reduce) to(scaleTo); rest.onPressIn?.(e); }}
        onPressOut={(e) => { setPressed(false); to(1); rest.onPressOut?.(e); }}
        onPress={(e) => { const n = Date.now(); if (n - last.current < debounceMs) return; last.current = n; onPress?.(e); }}
        style={[growsInParent(resolved) && { flexGrow: 1 }, innerStyle(resolved)]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
// Outer (animated) view takes layout-in-parent props; inner pressable takes the visual box.
const OUTER = new Set(['width', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'position', 'top', 'left', 'right', 'bottom', 'zIndex', 'minWidth', 'maxWidth']);
function flat(st: StyleProp<ViewStyle>): Record<string, unknown> {
  if (!st) return {};
  if (Array.isArray(st)) return Object.assign({}, ...st.map((x) => flat(x as StyleProp<ViewStyle>)));
  return typeof st === 'object' ? { ...(st as object) } : {};
}
function flattenOuter(st: StyleProp<ViewStyle>): ViewStyle {
  const f = flat(st); const o: Record<string, unknown> = {};
  for (const k of Object.keys(f)) if (OUTER.has(k)) o[k] = f[k];
  return o as ViewStyle;
}
/** Only stretch the pressable to fill its animated wrapper when the wrapper itself flexes (e.g. equal-width tiles).
 *  An unconditional flexGrow made content-sized buttons grow to huge heights on Android. */
function growsInParent(st: StyleProp<ViewStyle>): boolean { const f = flat(st); return 'flex' in f || 'flexGrow' in f || 'flexBasis' in f; }
function innerStyle(st: StyleProp<ViewStyle>): ViewStyle {
  const f = flat(st); const o: Record<string, unknown> = {};
  for (const k of Object.keys(f)) if (!OUTER.has(k)) o[k] = f[k];
  if ('width' in f && !('minWidth' in o)) o.width = '100%';
  return o as ViewStyle;
}

// ─── Entrances ───────────────────────────────────────────────────────────────
/** Fade + rise in on mount. `delay` lets lists stagger (index * 60). */
export function FadeIn({ children, delay = 0, from = 14, x = 0, duration = 380, style }: { children: React.ReactNode; delay?: number; from?: number; x?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => { if (reduce) return; Animated.timing(v, { toValue: 1, duration, delay, easing: smooth, useNativeDriver: ND }).start(); }, []);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }, { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [x, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Springy scale-in (mockup kPop / rPop). */
export function Pop({ children, delay = 0, style, from = 0.4, rotate = 0 }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle>; from?: number; rotate?: number }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => { if (reduce) return; Animated.timing(v, { toValue: 1, duration: 520, delay, easing: springy, useNativeDriver: ND }).start(); }, []);
  return (
    <Animated.View style={[style, { opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${rotate}deg`, '0deg'] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Drop from above with a squash on landing (mockup kDrop). */
export function Drop({ children, delay = 0, style, height = 220 }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle>; height?: number }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => { if (reduce) return; Animated.timing(v, { toValue: 1, duration: 900, delay, easing: Easing.bezier(0.22, 0.9, 0.3, 1), useNativeDriver: ND }).start(); }, []);
  return (
    <Animated.View style={[style, {
      opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
      transform: [
        { translateY: v.interpolate({ inputRange: [0, 0.55, 0.8, 1], outputRange: [-height, 0, -10, 0] }) },
        { scaleX: v.interpolate({ inputRange: [0, 0.55, 0.7, 1], outputRange: [0.8, 1.06, 0.97, 1] }) },
        { scaleY: v.interpolate({ inputRange: [0, 0.55, 0.7, 1], outputRange: [0.8, 0.9, 1.04, 1] }) },
      ],
    }]}>{children}</Animated.View>
  );
}

// ─── Loops ───────────────────────────────────────────────────────────────────
function useLoop(duration: number, delay = 0, enabled = true) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled || reduce) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    const id = setTimeout(() => a.start(), delay);
    return () => { clearTimeout(id); a.stop(); };
  }, [enabled]);
  return v;
}
/** Gentle idle float (mockup aBob / mBob). */
export function Bob({ children, amount = 6, duration = 3000, delay = 0, style, enabled = true }: { children: React.ReactNode; amount?: number; duration?: number; delay?: number; style?: StyleProp<ViewStyle>; enabled?: boolean }) {
  const v = useLoop(duration, delay, enabled);
  return <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amount] }) }] }]}>{children}</Animated.View>;
}
/** Breathing scale (streak flame, "searching" pulse). */
export function Pulse({ children, amount = 0.12, duration = 1200, style }: { children: React.ReactNode; amount?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const v = useLoop(duration);
  return <Animated.View style={[style, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + amount] }) }] }]}>{children}</Animated.View>;
}
/** Hop up and down (mockup mHop) — for the mascot when cheering. */
export function Hop({ children, height = 14, duration = 1000, style, enabled = true }: { children: React.ReactNode; height?: number; duration?: number; style?: StyleProp<ViewStyle>; enabled?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled || reduce) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: duration * 0.45, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: duration * 0.45, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
      Animated.delay(duration * 0.1),
    ]));
    a.start(); return () => a.stop();
  }, [enabled]);
  return <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -height] }) }] }]}>{children}</Animated.View>;
}

/** Blink: returns true for ~130 ms every ~4 s (mockup mBlink). */
export function useBlink(period = 4000) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (reduce) return;
    let t2: ReturnType<typeof setTimeout>;
    const id = setInterval(() => { setClosed(true); t2 = setTimeout(() => setClosed(false), 130); }, period + Math.random() * 800);
    return () => { clearInterval(id); clearTimeout(t2); };
  }, []);
  return closed;
}

// ─── One-shot reactions ──────────────────────────────────────────────────────
/** Shake on `trigger` change (wrong answer). */
export function Shake({ trigger, children, style, amount = 8 }: { trigger: unknown; children: React.ReactNode; style?: StyleProp<ViewStyle>; amount?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!trigger || reduce) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.linear, useNativeDriver: ND }).start();
  }, [trigger]);
  const tx = v.interpolate({ inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1], outputRange: [0, -amount, amount, -amount * 0.75, amount * 0.75, -amount * 0.35, amount * 0.2, 0] });
  return <Animated.View style={[style, { transform: [{ translateX: tx }] }]}>{children}</Animated.View>;
}
/** Bounce on `trigger` change (right answer, new score). */
export function Bounce({ trigger, children, style, amount = 0.08 }: { trigger: unknown; children: React.ReactNode; style?: StyleProp<ViewStyle>; amount?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!trigger || reduce) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 480, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
  }, [trigger]);
  return <Animated.View style={[style, { transform: [{ scale: v.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [1, 1 + amount, 1 - amount / 3, 1] }) }] }]}>{children}</Animated.View>;
}

/** Burst of stars/confetti from the centre of its parent (right answer, results). */
const BURST_COLORS = ['#FFD43B', '#51CF66', '#4D7CFE', '#FF5A6E', '#FF9F43', '#B197FC'];
export function Burst({ trigger, count = 12, radius = 90, shapes = 'mix' }: { trigger: unknown; count?: number; radius?: number; shapes?: 'stars' | 'mix' }) {
  const [key, setKey] = useState(0);
  useEffect(() => { if (trigger && !reduce) setKey((k) => k + 1); }, [trigger]);
  if (!key) return null;
  return <BurstOnce key={key} count={count} radius={radius} shapes={shapes} />;
}
function BurstOnce({ count, radius, shapes }: { count: number; radius: number; shapes: 'stars' | 'mix' }) {
  const v = useRef(new Animated.Value(0)).current;
  const parts = useRef(Array.from({ length: count }, (_, i) => ({
    a: (i / count) * Math.PI * 2 + Math.random() * 0.5, r: radius * (0.6 + Math.random() * 0.5), c: BURST_COLORS[i % BURST_COLORS.length],
    star: shapes === 'stars' || i % 3 === 0, rot: Math.random() * 360, s: 0.7 + Math.random() * 0.6,
  }))).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(); }, []);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      {parts.map((p, i) => (
        <Animated.Text key={i} style={{
          position: 'absolute', fontSize: p.star ? 20 * p.s : 12 * p.s, color: p.c,
          opacity: v.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.a) * p.r] }) },
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.a) * p.r + 18] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
            { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.1, 0.8] }) },
          ],
        }}>{p.star ? '★' : '●'}</Animated.Text>
      ))}
    </View>
  );
}

/** Falling confetti over a result screen (mockup rFall / eFall). */
export function Confetti({ count = 18 }: { count?: number }) {
  const [w, setW] = useState(0);
  if (reduce) return null;
  return (
    <View pointerEvents="none" onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
      {w > 0 && Array.from({ length: count }, (_, i) => <ConfettiPiece key={i} x={(i / count) * w + Math.random() * 20} delay={i * 90} color={BURST_COLORS[i % BURST_COLORS.length]} />)}
    </View>
  );
}
function ConfettiPiece({ x, delay, color }: { x: number; delay: number; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2200 + Math.random() * 700, easing: Easing.linear, useNativeDriver: ND }));
    const id = setTimeout(() => a.start(), delay);
    const stop = setTimeout(() => a.stop(), 6000);
    return () => { clearTimeout(id); clearTimeout(stop); a.stop(); };
  }, []);
  return <Animated.View style={{ position: 'absolute', left: x, top: -20, width: 8, height: 14, borderRadius: 2, backgroundColor: color, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 900] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) }] }} />;
}

// ─── Numbers ─────────────────────────────────────────────────────────────────
const lastShown: Record<string, number> = {};
/** Count from the last value shown under `key` (0 the first time) up to `value`. */
export function useCountUp(value: number, key?: string, duration = 700) {
  const prev = useRef(key ? lastShown[key] ?? 0 : 0);
  const [n, setN] = useState(reduce ? value : prev.current);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (key) lastShown[key] = value;
    if (reduce || from === value) { setN(value); return; }
    const t0 = Date.now(); let raf: number;
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      setN(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return n;
}

// ─── Animated progress bar (translateX on the native driver; no width animation) ─
export function AnimatedBar({ value, color, height, track, linear, style }: { value: number; color: string; height: number; track: string; linear?: boolean; style?: StyleProp<ViewStyle> }) {
  const clamped = Math.max(0, Math.min(1, value || 0));
  const [w, setW] = useState(0);
  const v = useRef(new Animated.Value(clamped)).current;
  useEffect(() => {
    if (reduce) { v.setValue(clamped); return; }
    if (linear) Animated.timing(v, { toValue: clamped, duration: 220, easing: Easing.linear, useNativeDriver: ND }).start();
    else Animated.spring(v, { toValue: clamped, useNativeDriver: ND, speed: 10, bounciness: 4 }).start();
  }, [clamped]);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }, style]}>
      {w > 0 ? (
        <Animated.View style={{ width: w, height, borderRadius: height / 2, backgroundColor: color, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-w, 0] }) }] }} />
      ) : (
        <View style={{ width: `${clamped * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
      )}
    </View>
  );
}

/** Slide content in from the right whenever `id` changes (lesson exercises, quiz questions). */
export function SlideSwap({ id, children, style }: { id: string | number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduce) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 340, easing: smooth, useNativeDriver: ND }).start();
  }, [id]);
  return <Animated.View style={[style, { opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.8, 1] }), transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }]}>{children}</Animated.View>;
}
