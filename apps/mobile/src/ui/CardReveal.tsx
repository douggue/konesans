/**
 * Kat Ewo visuals: card faces (grid / featured / tall reveal card) and the reveal sequence shown after a
 * finished defi — the pack shakes, bursts, the card flies in and flips (mockups Heroes.dc.html, Reward.dc.html).
 * No portraits of real people: the front is the hero's initials on a colour block with a light ray pattern.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, View } from 'react-native';
import Svg, { Path, Circle, Rect, G, Defs, ClipPath } from 'react-native-svg';
import { router } from 'expo-router';
import { cardById, type CardRarity, type HeroCard } from '@konesans/core';
import { colors, fonts } from '@/lib/theme';
import { useT, useL, type StrKey } from '@/lib/i18n';
import { useCards, type CardWin, type CardSource } from '@/lib/cards';
import { sfx, tap } from '@/lib/audio';
import { T, Button, Mascot, Motif, Burst, Pop, FadeIn, Bounce, Pill, reduceMotion, springy, type MascotMood } from '@/ui';

export const RARITY_TAG: Record<CardRarity, StrKey> = { komen: 'kt_tag_komen', ra: 'kt_tag_ra', lejand: 'kt_tag_lejand' };
const GOLD = '#FFD43B';

/** Darker shade of a card colour (edges, back of the pack). */
export function shade(hex: string, k = 0.68) {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * k).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}

// ─── Pattern + badges ────────────────────────────────────────────────────────
/** Sunburst rays behind the initials (the "premium" card pattern). Fills its parent. */
export function Rays({ color = '#FFFFFF', opacity = 0.13, count = 14, cy = 50 }: { color?: string; opacity?: number; count?: number; cy?: number }) {
  const d = Array.from({ length: count }, (_, i) => {
    const a0 = (i / count) * Math.PI * 2, a1 = a0 + Math.PI / count;
    const p = (a: number) => `${(50 + Math.cos(a) * 160).toFixed(1)} ${(cy + Math.sin(a) * 160).toFixed(1)}`;
    return `M50 ${cy}L${p(a0)}L${p(a1)}Z`;
  }).join('');
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><Path d={d} fill={color} opacity={opacity} /></Svg>
    </View>
  );
}

const STAR = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z';
/** ★ gold for Lejand, ◆ white for Ra, nothing for Kòmen. */
export function RarityBadge({ rarity, size = 20, tint }: { rarity: CardRarity; size?: number; tint?: string }) {
  if (rarity === 'komen') return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10.5} fill={rarity === 'lejand' ? GOLD : '#FFFFFF'} stroke={colors.ink} strokeWidth={2} />
      {rarity === 'lejand'
        ? <Path d={STAR} fill={colors.ink} transform="translate(4.2 4.4) scale(.65)" />
        : <Path d="M12 6.5l5 5.5-5 5.5-5-5.5z" fill={tint ?? colors.blue} stroke={colors.ink} strokeWidth={1.4} strokeLinejoin="round" />}
    </Svg>
  );
}

/** A white light band that sweeps across its parent every few seconds (mockup hShine). */
export function Shine({ width = 34, height = 300, period = 2800, delay = 1000, travel = 260 }: { width?: number; height?: number; period?: number; delay?: number; travel?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion()) return;
    const a = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: period, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })]));
    a.start(); return () => a.stop();
  }, []);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -40, left: 0, width, height, backgroundColor: 'rgba(255,255,255,0.32)', transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-width * 2, travel] }) }, { rotate: '20deg' }] }} />;
}

// ─── Small grid card ─────────────────────────────────────────────────────────
const TILT = [-2, 1, -1, 2, -2, 1, 2, -1, 1];
export function MiniCard({ card, owned, selected, fresh, index, onPress, label }: { card: HeroCard; owned: boolean; selected: boolean; fresh?: boolean; index: number; onPress: () => void; label: string }) {
  const t = useT();
  const lift = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion()) lift.setValue(selected ? 1 : 0);
    else Animated.timing(lift, { toValue: selected ? 1 : 0, duration: 260, easing: springy, useNativeDriver: true }).start();
  }, [selected]);
  const tilt = TILT[index % TILT.length];
  return (
    <Animated.View style={{ flex: 1, transform: [{ rotate: lift.interpolate({ inputRange: [0, 1], outputRange: [`${tilt}deg`, '0deg'] }) }, { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }}>
      <Pressable role="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress}
        style={({ pressed }) => [{ flexGrow: 1, backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', alignItems: 'center', paddingBottom: 8, gap: 6, borderWidth: selected ? 3 : 2, borderBottomWidth: selected ? 6 : 5, borderColor: selected ? colors.ink : colors.line }, pressed && { transform: [{ scale: 0.96 }] }]}>
        <View style={{ alignSelf: 'stretch', height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: owned ? card.color : '#DCE1EE', overflow: 'hidden' }}>
          {owned ? (
            <>
              <Rays />
              {card.rarity === 'lejand' && <View pointerEvents="none" style={{ position: 'absolute', left: 4, right: 4, top: 4, bottom: 4, borderRadius: 10, borderWidth: 1.5, borderColor: GOLD }} />}
              <T style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: '#FFFFFF' }}>{card.mono}</T>
              <View style={{ position: 'absolute', top: 5, right: 5 }}><RarityBadge rarity={card.rarity} size={17} tint={card.color} /></View>
            </>
          ) : <T style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: '#8A93A8' }}>?</T>}
        </View>
        <T center numberOfLines={2} style={{ fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 14, paddingHorizontal: 4 }} color={owned ? colors.ink : colors.muted}>{owned ? card.short : '???'}</T>
        {fresh && owned && <View accessibilityLabel={t('kt_new')} style={{ position: 'absolute', top: 5, left: 5, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.red, borderWidth: 2, borderColor: '#FFFFFF' }} />}
      </Pressable>
    </Animated.View>
  );
}

// ─── Big featured front (collection screen) ──────────────────────────────────
export function FlipHint({ text }: { text: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion()) return;
    const a = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    a.start(); return () => a.stop();
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-14deg'] }) }] }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><Path d="M21 3v5h-5" /></Svg>
      </Animated.View>
      <T style={{ fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 18 }} color="#FFFFFF">{text}</T>
    </View>
  );
}

export function TagPill({ text, small }: { text: string; small?: boolean }) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: GOLD, borderWidth: 2, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: small ? 8 : 10, paddingVertical: small ? 0 : 1 }}>
      <T style={{ fontFamily: fonts.bodyHeavy, fontSize: small ? 11 : 12, lineHeight: small ? 16 : 17, letterSpacing: 0.5 }} color={colors.ink}>{text}</T>
    </View>
  );
}

/** Front of the featured card: initials panel (with the national-arms motif) + name, years, role. */
export function HeroFront({ card, hint }: { card: HeroCard; hint: string }) {
  const t = useT(); const l = useL();
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 14, padding: 14, backgroundColor: card.color, borderRadius: 24, borderWidth: 3, borderBottomWidth: 7, borderColor: colors.ink, overflow: 'hidden' }}>
      <Rays opacity={0.08} count={18} cy={30} />
      <View style={{ width: 118, alignSelf: 'stretch', borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 2, borderColor: card.rarity === 'lejand' ? GOLD : 'rgba(255,255,255,0.5)' }}>
        <Motif kind="drapo" opacity={0.22} height={64} />
        <T style={{ fontFamily: fonts.display, fontSize: 48, lineHeight: 54, color: '#FFFFFF', marginBottom: 18 }}>{card.mono}</T>
        <View style={{ position: 'absolute', top: 8, right: 8 }}><RarityBadge rarity={card.rarity} size={22} tint={card.color} /></View>
        <Shine />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <TagPill text={t(RARITY_TAG[card.rarity])} />
        <T style={card.name.length > 22 ? { fontFamily: fonts.display, fontSize: 20, lineHeight: 23 } : { fontFamily: fonts.display, fontSize: 23, lineHeight: 26 }} color="#FFFFFF" numberOfLines={3}>{card.name}</T>
        <T style={{ fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 17, opacity: 0.85 }} color="#FFFFFF">{l(card.years)}</T>
        <T style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 19 }} color="#FFFFFF" numberOfLines={3}>{l(card.role)}</T>
        <View style={{ marginTop: 'auto' }}><FlipHint text={hint} /></View>
      </View>
    </View>
  );
}

// ─── Tall card (reveal) ──────────────────────────────────────────────────────
export function TallFront({ card, w = 210 }: { card: HeroCard; w?: number }) {
  const l = useL();
  const h = w * 1.36;
  return (
    <View style={{ width: w, height: h, borderRadius: 22, borderWidth: 3, borderBottomWidth: 7, borderColor: colors.ink, backgroundColor: colors.card, overflow: 'hidden' }}>
      <View style={{ height: h * 0.6, backgroundColor: card.color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Rays opacity={0.14} count={16} />
        <Motif kind="drapo" opacity={0.2} height={h * 0.24} />
        {card.rarity === 'lejand' && <View pointerEvents="none" style={{ position: 'absolute', left: 7, right: 7, top: 7, bottom: 7, borderRadius: 14, borderWidth: 2.5, borderColor: GOLD }} />}
        <T style={{ fontFamily: fonts.display, fontSize: w * 0.3, lineHeight: w * 0.34, color: '#FFFFFF', marginBottom: h * 0.06 }}>{card.mono}</T>
        <View style={{ position: 'absolute', top: 12, right: 12 }}><RarityBadge rarity={card.rarity} size={26} tint={card.color} /></View>
        <Shine width={30} height={h} period={2200} delay={600} travel={w + 40} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <T center numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: fonts.display, fontSize: 19, lineHeight: 22 }}>{card.name}</T>
        <T center style={{ fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 16 }} color={colors.muted}>{l(card.years)}</T>
      </View>
    </View>
  );
}

/** The face-down side: navy with gold rays and a big star. */
export function TallBack({ w = 210 }: { w?: number }) {
  const h = w * 1.36;
  return (
    <View style={{ width: w, height: h, borderRadius: 22, borderWidth: 3, borderBottomWidth: 7, borderColor: colors.ink, backgroundColor: '#1B2A52', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Rays color="#4D7CFE" opacity={0.22} count={18} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 9, right: 9, top: 9, bottom: 9, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,212,59,0.55)' }} />
      <View>{/* a View so it paints above the absolutely positioned rays on web */}
      <Svg width={w * 0.46} height={w * 0.46} viewBox="0 0 48 48">
        <Circle cx={24} cy={24} r={21} fill={colors.blue} stroke={GOLD} strokeWidth={3} />
        <Path d="M24 9l4.4 9 9.9 1.4-7.2 7 1.7 9.8L24 31.6l-8.8 4.6 1.7-9.8-7.2-7 9.9-1.4z" fill={GOLD} stroke={colors.ink} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
      </View>
    </View>
  );
}

/** Gold card pack (before it bursts open). */
function Pack({ w = 170 }: { w?: number }) {
  const h = w * 1.3;
  return (
    <Svg width={w} height={h} viewBox="0 0 170 221">
      <Path d="M14 18 L156 18 L156 205 Q156 213 148 213 L22 213 Q14 213 14 205 Z" fill="#E0A100" stroke={colors.ink} strokeWidth={4} strokeLinejoin="round" />
      <Path d="M14 14 L156 14 L156 200 Q156 208 148 208 L22 208 Q14 208 14 200 Z" fill={GOLD} stroke={colors.ink} strokeWidth={4} strokeLinejoin="round" />
      <Defs><ClipPath id="kt-pack"><Rect x={14} y={14} width={142} height={194} rx={8} /></ClipPath></Defs>
      <G opacity={0.35} clipPath="url(#kt-pack)">{[0, 1, 2, 3, 4, 5, 6].map((i) => <Path key={i} d={`M${-20 + i * 34} 208 L${40 + i * 34} 14 L${52 + i * 34} 14 L${-8 + i * 34} 208 Z`} fill="#FFFFFF" />)}</G>
      <Rect x={14} y={14} width={142} height={194} rx={8} fill="none" stroke={colors.ink} strokeWidth={4} />
      <Path d="M10 30 L18 22 L26 30 L34 22 L42 30 L50 22 L58 30 L66 22 L74 30 L82 22 L90 30 L98 22 L106 30 L114 22 L122 30 L130 22 L138 30 L146 22 L154 30 L160 24" fill="none" stroke={colors.ink} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={85} cy={112} r={42} fill="#FFF4D1" stroke={colors.ink} strokeWidth={4} />
      <Circle cx={85} cy={112} r={31} fill="none" stroke="#C99400" strokeWidth={3} strokeDasharray="5 5" />
      <Path d="M85 82l8.2 16.6 18.3 2.7-13.3 12.9 3.2 18.2L85 123.8l-16.4 8.6 3.2-18.2-13.3-12.9 18.3-2.7z" fill={colors.red} stroke={colors.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <Path d="M24 176 Q85 192 146 176" fill="none" stroke="#C99400" strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Reveal sequence ─────────────────────────────────────────────────────────
type Phase = 'hidden' | 'pack' | 'opening' | 'shown';
/**
 * The card reveal for a milestone: the daily chest (`kind="chest"`), a rank-up (`"rank"`) or the weekly 7/7 reward
 * (`"legend"`: an unowned Lejand card if any is left). Gives the card as soon as it mounts (idempotent per `drawKey`,
 * so a re-render never gives two — callers may also give it first), then after `delay` opens: pack shakes (tap or
 * wait to open) → burst → card flies in and flips. `note`: a line under the title saying why ("Kado pou nouvo ran ou!").
 */
export function CardReveal({ drawKey, delay = 2000, kind = 'chest', note, onClose }: { drawKey?: string; delay?: number; kind?: CardSource; note?: StrKey; onClose?: () => void }) {
  const t = useT(); const l = useL();
  const [key] = useState(() => drawKey ?? `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const [win] = useState<CardWin>(() => useCards.getState().earn(key, kind));
  const card = cardById(win.id);
  const [phase, setPhase] = useState<Phase>('hidden');
  const [mood, setMood] = useState<MascotMood>('wow');
  const shake = useRef(new Animated.Value(0)).current;
  const packOut = useRef(new Animated.Value(0)).current;
  const fly = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => {
    later(() => {
      setPhase('pack');
      Animated.timing(backdrop, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      if (!reduceMotion()) Animated.loop(Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 180, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 90, useNativeDriver: true }),
        Animated.delay(520),
      ])).start();
      later(open, 3200); // opens by itself if the kid doesn't tap
    }, delay);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const opened = useRef(false);
  function open() {
    if (opened.current) return;
    opened.current = true;
    tap('success');
    sfx('badge');
    shake.stopAnimation();
    setPhase('opening');
    const rm = reduceMotion();
    Animated.timing(packOut, { toValue: 1, duration: rm ? 0 : 280, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    Animated.sequence([
      Animated.delay(rm ? 0 : 160),
      Animated.timing(fly, { toValue: 1, duration: rm ? 0 : 620, easing: springy, useNativeDriver: true }),
      Animated.delay(rm ? 0 : 150),
      Animated.timing(flip, { toValue: 1, duration: rm ? 0 : 760, easing: Easing.bezier(0.3, 1.35, 0.45, 1), useNativeDriver: true }),
    ]).start(() => {
      setPhase('shown');
      setMood(win.isNew ? (card?.rarity === 'lejand' ? 'love' : 'cheer') : 'proud');
      if (!win.isNew) later(() => sfx('coin'), 250);
    });
  }
  function close(go?: boolean) {
    tap();
    Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setPhase('hidden');
      onClose?.();
      if (go) router.push({ pathname: '/cards', params: { sel: win.id } } as never);
    });
  }

  if (!card || phase === 'hidden') return null;
  const rot = shake.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] });
  const tag = t('kt_new_card', { x: t(RARITY_TAG[card.rarity]) });
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => close()}>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,33,61,0.96)', opacity: backdrop }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <Pop><Mascot size={96} mood={mood} /></Pop>
        <T v="h1" center color="#FFFFFF">{phase === 'shown' ? (win.isNew ? t('kt_bravo', { name: card.short }) : t('kt_duplicate', { name: card.short, n: win.coins })) : t('kt_won_title')}</T>
        {note && phase !== 'shown' ? <T v="bold" center color="#FFF4D1">{t(note)}</T> : null}
        <View style={{ width: 230, height: 300, alignItems: 'center', justifyContent: 'center' }}>
          {phase === 'pack' || phase === 'opening' ? (
            <Animated.View style={{ position: 'absolute', opacity: packOut.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: packOut.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }] }}>
              <Pop from={0.3}>
                <Pressable role="button" accessibilityLabel={t('kt_open_pack_a11y')} onPress={open} disabled={phase !== 'pack'}>
                  <Animated.View style={{ transform: [{ rotate: rot }] }}><Pack /></Animated.View>
                </Pressable>
              </Pop>
            </Animated.View>
          ) : null}
          {phase !== 'pack' && (
            <Animated.View style={{ opacity: fly.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }), transform: [{ translateY: fly.interpolate({ inputRange: [0, 1], outputRange: [380, 0] }) }, { rotate: fly.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '0deg'] }) }, { scale: fly.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>
              <View style={{ width: 210, height: 210 * 1.36 }}>
                <Animated.View style={{ position: 'absolute', backfaceVisibility: 'hidden', opacity: flip.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [1, 1, 0, 0] }), transform: [{ perspective: 1000 }, { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
                  <TallBack />
                </Animated.View>
                <Animated.View style={{ position: 'absolute', backfaceVisibility: 'hidden', opacity: flip.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [0, 0, 1, 1] }), transform: [{ perspective: 1000 }, { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) }] }}>
                  <TallFront card={card} />
                </Animated.View>
              </View>
            </Animated.View>
          )}
          {phase === 'opening' && (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#FFF4D1', opacity: packOut.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.75, 0] }), transform: [{ scale: packOut.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.7] }) }] }} />
          )}
          <Burst trigger={phase === 'opening' ? 'open' : null} count={18} radius={160} />
        </View>
        {phase === 'pack' && <FadeIn delay={400}><T v="h3" center color="#FFF4D1">{t('kt_open_pack')}</T></FadeIn>}
        {phase === 'shown' && (
          <FadeIn from={20} style={{ alignItems: 'center', gap: 8, alignSelf: 'stretch' }}>
            {win.isNew
              ? <><TagPill text={tag} /><T v="bold" center color="#FFFFFF">{l(card.role)}</T></>
              : <Bounce trigger={win.coins}><Pill text={t('kt_coins', { n: win.coins })} icon="kob" color="#5C4600" bg={colors.yellowSoft} /></Bounce>}
            <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
              <Button title={t('kt_see_collection')} color={colors.green} onPress={() => close(true)} />
              <Button variant="secondary" title={t('next')} color={colors.ink} onPress={() => close()} />
            </View>
          </FadeIn>
        )}
      </View>
    </Modal>
  );
}

