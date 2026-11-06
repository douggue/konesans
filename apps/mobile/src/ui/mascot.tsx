/**
 * Ti Zwazo, the Konesans mascot.
 * - `MascotArt`: static picture (one SvgXml), any mood, optional blink.
 * - `Mascot`: the live one. The art is split into layers (wings, body, head, scarf, effects) stacked as SvgXml views,
 *   each moved on the native driver: breathing squash/stretch from the feet, head tilts, wing flutters, and a
 *   motion that suits the mood (cheer hops, wave waves, laugh shakes, sleepy Zzz float, nervous trembles…).
 * - `MascotRig`: the layered bird driven by values you pass in (the launch intro uses it).
 * The markup lives in ./mascot-art.ts so the design renders in design/mascot/ use exactly the same art.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { MASCOT_MOODS, PIVOT, VB_H, VB_W, layerXml, mascotLayers, mascotXml, type MascotMood } from './mascot-art';
import { reduceMotion, useBlink, useReduceMotion } from './motion';

export { MASCOT_MOODS };
export type { MascotMood };

const ND = true;
const BLINKS: Partial<Record<MascotMood, boolean>> = { happy: true, think: true, sad: true, wave: true, wow: true, proud: true, nervous: true, shy: true, angry: true };

export function MascotArt({ size = 120, mood = 'happy', blink }: { size?: number; mood?: MascotMood; blink?: boolean }) {
  const xml = useMemo(() => mascotXml(mood, !!blink), [mood, blink]);
  return <SvgXml xml={xml} width={size} height={size} />;
}

/** Ti Zwazo. `live` = breathing, blinking and the mood's own motion; `live={false}` = still picture. */
export function Mascot({ size = 120, mood = 'happy', live = true }: { size?: number; mood?: MascotMood; live?: boolean }) {
  const reduce = useReduceMotion();
  if (!live || reduce) return <MascotArt size={size} mood={mood} />;
  return <LiveMascot size={size} mood={mood} />;
}

// ─── rig ─────────────────────────────────────────────────────────────────────
type Num = Animated.Value | Animated.AnimatedInterpolation<number>;
export type RigValues = {
  /** 0→1 breath: chest grows a little, stretches up from the feet */
  breathe?: Num;
  /** squash (<1) / stretch (>1) from the feet, multiplies the breath */
  squash?: Num;
  /** whole bird lift in viewBox units (negative = up); the ground shadow shrinks as he rises */
  lift?: Num;
  /** whole-bird lean / sway in degrees, around the feet */
  sway?: Num;
  /** horizontal jitter in viewBox units */
  shakeX?: Num;
  /** head tilt in degrees (around the neck) and head bob in viewBox units */
  tilt?: Num;
  headY?: Num;
  /** extra wing angle in degrees, same sense for both wings: positive swings a hanging wing outward/up;
   *  for a raised wing (cheer, wave) positive carries on over the head, so wave/flap those with negative values */
  wingL?: Num;
  wingR?: Num;
  /** effects layer (sparkles, Zzz, hearts…): 0→1 loop phase */
  fx?: Num;
};

type Interp = Parameters<Animated.Value['interpolate']>[0];
/** interpolate any animated number (Value, interpolation or multiplication) */
const ip = (x: Num, c: Interp) => (x as Animated.Value).interpolate(c);
const ZERO = new Animated.Value(0);
const ONE = new Animated.Value(1);

/** Rotate a full-size layer around a point given in viewBox units. */
function around(size: number, x: number, y: number, rot: Num, sign = 1) {
  const k = size / VB_H;
  const ox = (size - VB_W * k) / 2;
  const dx = ox + x * k - size / 2;
  const dy = y * k - size / 2;
  const deg = (sign === 1 ? rot : Animated.multiply(rot, -1)) as Animated.AnimatedInterpolation<number>;
  return [{ translateX: dx }, { translateY: dy }, { rotate: ip(deg, { inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) }, { translateX: -dx }, { translateY: -dy }];
}

export function MascotRig({ size, mood, blink = false, v = {}, style }: { size: number; mood: MascotMood; blink?: boolean; v?: RigValues; style?: StyleProp<ViewStyle> }) {
  const L = useMemo(() => mascotLayers(mood, false), [mood]);
  const head = useMemo(() => layerXml(mascotLayers(mood, blink).head), [mood, blink]);
  const xml = useMemo(() => ({
    shadow: layerXml(L.shadow), body: layerXml(L.body), scarf: layerXml(L.scarf), fx: L.fx ? layerXml(L.fx) : '',
    wingL: layerXml(L.wingL.svg), wingR: layerXml(L.wingR.svg),
  }), [L]);
  const k = size / VB_H;
  const ox = (size - VB_W * k) / 2;
  const feetDy = PIVOT.feet[1] * k - size / 2;
  const feetDx = ox + PIVOT.feet[0] * k - size / 2;
  const breathe = v.breathe ?? ZERO;
  const squash = v.squash ?? ONE;
  const sy = Animated.multiply(squash, ip(breathe, { inputRange: [0, 1], outputRange: [1, 1.028] }));
  const sx = Animated.multiply(ip(squash, { inputRange: [0, 1, 2], outputRange: [2, 1, 0] }), ip(breathe, { inputRange: [0, 1], outputRange: [1, 0.99] }));
  const lift = v.lift ?? ZERO;
  const abs = StyleSheet.absoluteFill;
  const layer = (x: string) => <SvgXml xml={x} width={size} height={size} />;
  const wing = (side: 'L' | 'R') => {
    const w = side === 'L' ? L.wingL : L.wingR;
    const [px, py] = side === 'L' ? PIVOT.wingL : PIVOT.wingR;
    const rot = (side === 'L' ? v.wingL : v.wingR) ?? ZERO;
    return <Animated.View key={side} pointerEvents="none" style={[abs, { transform: around(size, px, py, rot, side === 'L' ? 1 : -1) }]}>{layer(side === 'L' ? xml.wingL : xml.wingR)}</Animated.View>;
  };
  const wings = (z: 'back' | 'mid' | 'over') => [L.wingL.z === z ? wing('L') : null, L.wingR.z === z ? wing('R') : null];
  const fx = v.fx ?? ZERO;
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Animated.View style={[abs, { opacity: ip(lift, { inputRange: [-40, 0], outputRange: [0.35, 1], extrapolate: 'clamp' }), transform: [{ translateX: feetDx }, { translateY: feetDy }, { scale: ip(lift, { inputRange: [-40, 0], outputRange: [0.6, 1], extrapolate: 'clamp' }) }, { translateX: -feetDx }, { translateY: -feetDy }] }]}>{layer(xml.shadow)}</Animated.View>
      <Animated.View style={[abs, { transform: [
        { translateX: Animated.multiply(v.shakeX ?? ZERO, k) }, { translateY: Animated.multiply(lift, k) },
        ...around(size, PIVOT.feet[0], PIVOT.feet[1], v.sway ?? ZERO),
        { translateX: feetDx }, { translateY: feetDy }, { scaleX: sx }, { scaleY: sy }, { translateX: -feetDx }, { translateY: -feetDy },
      ] }]}>
        {wings('back')}
        <View style={abs}>{layer(xml.body)}</View>
        {wings('mid')}
        <Animated.View style={[abs, { transform: [{ translateY: Animated.multiply(v.headY ?? ZERO, k) }, ...around(size, PIVOT.neck[0], PIVOT.neck[1], v.tilt ?? ZERO)] }]}>{layer(head)}</Animated.View>
        <View style={abs}>{layer(xml.scarf)}</View>
        {wings('over')}
        {xml.fx ? (
          <Animated.View style={[abs, mood === 'sleepy'
            ? { opacity: ip(fx, { inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: ip(fx, { inputRange: [0, 1], outputRange: [8 * k, -10 * k] }) }, { translateX: ip(fx, { inputRange: [0, 1], outputRange: [-4 * k, 4 * k] }) }] }
            : mood === 'nervous' || mood === 'sad'
              ? { opacity: ip(fx, { inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: ip(fx, { inputRange: [0, 1], outputRange: [-3 * k, 9 * k] }) }] }
              : { opacity: ip(fx, { inputRange: [0, 0.5, 1], outputRange: [0.75, 1, 0.75] }), transform: [{ scale: ip(fx, { inputRange: [0, 0.5, 1], outputRange: [0.97, 1.03, 0.97] }) }] }]}>{layer(xml.fx)}</Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

// ─── idle motion ─────────────────────────────────────────────────────────────
const sine = Easing.inOut(Easing.sin);
const t = (v: Animated.Value, toValue: number, duration: number, easing = sine) => Animated.timing(v, { toValue, duration, easing, useNativeDriver: ND });
const loop = (a: Animated.CompositeAnimation) => Animated.loop(a);

/** The live mascot's values: a breathing loop plus the mood's own motion. Light: one native loop or two, plus a timer for occasional moves. */
function useIdle(mood: MascotMood) {
  const v = useRef({
    breathe: new Animated.Value(0), squash: new Animated.Value(1), lift: new Animated.Value(0), sway: new Animated.Value(0), shakeX: new Animated.Value(0),
    tilt: new Animated.Value(0), headY: new Animated.Value(0), wingL: new Animated.Value(0), wingR: new Animated.Value(0), fx: new Animated.Value(0),
  }).current;
  useEffect(() => {
    if (reduceMotion()) return;
    Object.values(v).forEach((x) => x.stopAnimation());
    v.breathe.setValue(0); v.squash.setValue(1); v.lift.setValue(0); v.sway.setValue(0); v.shakeX.setValue(0);
    v.tilt.setValue(0); v.headY.setValue(0); v.wingL.setValue(0); v.wingR.setValue(0); v.fx.setValue(0);
    const running: Animated.CompositeAnimation[] = [];
    const run = (a: Animated.CompositeAnimation) => { running.push(a); a.start(); };
    const timers: ReturnType<typeof setTimeout>[] = [];
    let alive = true;
    /** every `min..max` ms, play one of the occasional moves */
    const every = (min: number, max: number, make: () => Animated.CompositeAnimation) => {
      const go = () => { if (alive) timers.push(setTimeout(() => { if (alive) make().start(() => go()); }, min + Math.random() * (max - min))); };
      go();
    };
    const slow = mood === 'sad' || mood === 'sleepy';
    const breath = slow ? 2200 : mood === 'proud' ? 1700 : 1400;
    if (mood !== 'cheer' && mood !== 'laugh') run(loop(Animated.sequence([t(v.breathe, mood === 'proud' ? 1.6 : 1, breath), t(v.breathe, 0, breath)])));
    const flap = (w: Animated.Value, a = 16) => Animated.sequence([t(w, a, 90, Easing.out(Easing.quad)), t(w, 0, 110), t(w, a * 0.8, 90, Easing.out(Easing.quad)), t(w, 0, 140)]);
    const tiltTo = (deg: number, hold = 900) => Animated.sequence([t(v.tilt, deg, 380), Animated.delay(hold), t(v.tilt, 0, 420)]);
    const fxLoop = (ms: number) => run(loop(Animated.sequence([t(v.fx, 1, ms, Easing.linear), t(v.fx, 0, 0)])));
    const fxPulse = (ms: number) => run(loop(Animated.sequence([t(v.fx, 1, ms / 2), t(v.fx, 0, ms / 2)])));

    switch (mood) {
      case 'happy':
        every(3500, 6500, () => (Math.random() < 0.55 ? tiltTo(Math.random() < 0.5 ? -6 : 6) : flap(Math.random() < 0.5 ? v.wingL : v.wingR)));
        break;
      case 'think':
        run(loop(Animated.sequence([t(v.tilt, 6, 1600), t(v.tilt, 3, 1600)])));
        break;
      case 'sad':
        run(loop(Animated.sequence([t(v.headY, 1.5, 2200), t(v.headY, 0, 2200)])));
        fxLoop(2600);
        break;
      case 'cheer':
        run(loop(Animated.sequence([
          t(v.squash, 0.88, 120, Easing.out(Easing.quad)),
          Animated.parallel([t(v.lift, -16, 300, Easing.out(Easing.quad)), t(v.squash, 1.08, 160), t(v.wingL, -24, 150), t(v.wingR, -24, 150)]), // raised wings: negative = outward
          Animated.parallel([t(v.lift, 0, 280, Easing.in(Easing.quad)), t(v.squash, 1, 200), t(v.wingL, 6, 200), t(v.wingR, 6, 200)]),
          Animated.parallel([t(v.squash, 0.9, 80, Easing.out(Easing.quad)), t(v.wingL, 0, 80), t(v.wingR, 0, 80)]),
          t(v.squash, 1, 160),
          Animated.delay(140),
        ])));
        fxPulse(900);
        break;
      case 'wave':
        run(loop(Animated.sequence([t(v.wingR, -26, 220), t(v.wingR, 6, 260), t(v.wingR, -26, 260), t(v.wingR, 6, 260), t(v.wingR, 0, 220), Animated.delay(900)]))); // raised wing: negative = outward
        run(loop(Animated.sequence([t(v.tilt, -4, 1100), t(v.tilt, 2, 1100)])));
        break;
      case 'wow':
        every(1800, 3200, () => Animated.sequence([
          Animated.parallel([t(v.lift, -12, 180, Easing.out(Easing.quad)), t(v.squash, 1.1, 120), flap(v.wingL, 14), flap(v.wingR, 14)]),
          Animated.parallel([t(v.lift, 0, 200, Easing.in(Easing.quad)), t(v.squash, 0.92, 200)]),
          t(v.squash, 1, 220, Easing.out(Easing.back(2))),
        ]));
        fxPulse(700);
        break;
      case 'laugh':
        run(loop(Animated.sequence([
          ...[0, 1, 2, 3, 4, 5].map((i) => Animated.parallel([t(v.sway, i % 2 ? -3 : 3, 110), t(v.squash, i % 2 ? 0.96 : 1.03, 110), t(v.headY, i % 2 ? 1.5 : -1, 110)])),
          Animated.parallel([t(v.sway, 0, 160), t(v.squash, 1, 160), t(v.headY, 0, 160)]),
          Animated.delay(500),
        ])));
        fxPulse(660);
        break;
      case 'proud':
        every(3500, 5500, () => tiltTo(-5, 1200));
        fxPulse(1600);
        break;
      case 'love':
        run(loop(Animated.sequence([t(v.sway, -3, 1300), t(v.sway, 3, 1300)])));
        run(loop(Animated.sequence([t(v.fx, 1, 180), t(v.fx, 0.3, 180), t(v.fx, 1, 180), t(v.fx, 0, 520)])));
        break;
      case 'sleepy':
        run(loop(Animated.sequence([t(v.tilt, 5, 2200), t(v.tilt, 0, 2200)])));
        fxLoop(2600);
        break;
      case 'cool':
        run(loop(Animated.sequence([t(v.headY, 1.8, 260, Easing.out(Easing.quad)), t(v.headY, 0, 340), Animated.delay(120)])));
        break;
      case 'nervous':
        every(1200, 2200, () => Animated.sequence([...[0, 1, 2, 3, 4, 5, 6].map((i) => t(v.shakeX, i % 2 ? -1.2 : 1.2, 45, Easing.linear)), t(v.shakeX, 0, 45)]));
        fxLoop(1800);
        break;
      case 'shy':
        run(loop(Animated.sequence([t(v.sway, -2.5, 1500), t(v.sway, 2.5, 1500)])));
        every(3000, 5000, () => tiltTo(-4, 700));
        break;
      case 'angry':
        every(1600, 2600, () => Animated.sequence([
          Animated.parallel([t(v.lift, -6, 120, Easing.out(Easing.quad)), t(v.wingL, 10, 120), t(v.wingR, 10, 120)]),
          Animated.parallel([t(v.lift, 0, 110, Easing.in(Easing.quad)), t(v.squash, 0.9, 110)]),
          Animated.parallel([t(v.squash, 1, 160), t(v.wingL, 0, 160), t(v.wingR, 0, 160)]),
          ...[0, 1, 2, 3].map((i) => t(v.shakeX, i % 2 ? -1.5 : 1.5, 50, Easing.linear)), t(v.shakeX, 0, 50),
        ]));
        fxPulse(800);
        break;
    }
    return () => { alive = false; timers.forEach(clearTimeout); running.forEach((a) => a.stop()); Object.values(v).forEach((x) => x.stopAnimation()); };
  }, [mood]);
  return v;
}

function LiveMascot({ size, mood }: { size: number; mood: MascotMood }) {
  const blink = useBlink(mood === 'sleepy' ? 999999 : 3800);
  const v = useIdle(mood);
  return <MascotRig size={size} mood={mood} blink={blink && !!BLINKS[mood]} v={v} />;
}
