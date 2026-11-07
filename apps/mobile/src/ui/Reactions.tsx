/**
 * Duel reaction stickers — our own drawings (app icon style: navy outlines, flat palette, white die-cut rim; no emoji),
 * each with its own little sound (design/audio/render_sfx.py → sfx('re_<id>')).
 * - `ReactionTray`: the row of sticker buttons under the question, with a 3 s cooldown so nobody can spam.
 * - `ReactionBubble`: the big animated bubble that pops out under a player's avatar with the FULL label, wiggles, fades.
 * Ids are the server's preset list (`PRESET_REACTIONS` in @konesans/core); unknown ids are simply not shown.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { PRESET_REACTIONS, type ReactionId } from '@konesans/core';
import { T } from './index';
import { reduceMotion, Burst } from './motion';
import { colors } from '@/lib/theme';
import { useT, type StrKey } from '@/lib/i18n';
import { sfx, tap } from '@/lib/audio';

const N = '#14213D';
const O = `stroke="${N}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;

// ART-START (48×48, drawn inside 6–42 so the white rim fits)
const ART: Record<ReactionId, string> = {
  // party popper + confetti
  bravo: `<path d="M7.5 41 L17 18.5 L30 31.5 Z" fill="#FFD43B"/>
<path d="M11.8 30.2 L18.4 36.8 M14.5 23.8 L24.6 33.9" stroke="#FF5A6E" stroke-width="3.2" stroke-linecap="round"/>
<path d="M7.5 41 L17 18.5 L30 31.5 Z" fill="none" ${O}/>
<ellipse cx="23.5" cy="25" rx="9.2" ry="3.6" transform="rotate(45 23.5 25)" fill="#FF9F43" ${O}/>
<path d="M27 17 q2.5-6 8-6.5" fill="none" stroke="#4D7CFE" stroke-width="2.6" stroke-linecap="round"/>
<path d="M31 21.5 q5-2.5 9 1" fill="none" stroke="#51CF66" stroke-width="2.6" stroke-linecap="round"/>
<rect x="20.5" y="8" width="5" height="5" rx="1" transform="rotate(20 23 10.5)" fill="#FF5A6E" ${O.replace('2.5', '1.8')}/>
<circle cx="39" cy="30" r="2.6" fill="#B197FC" ${O.replace('2.5', '1.8')}/>
<path d="M38 5.5 l1.4 3.2 3.2 1.4-3.2 1.4-1.4 3.2-1.4-3.2-3.2-1.4 3.2-1.4z" fill="#FFD43B" ${O.replace('2.5', '1.6')}/>`,
  // thumbs up
  byen_jwe: `<rect x="7" y="21" width="8" height="19" rx="2.5" fill="#4D7CFE" ${O}/>
<path d="M15 22.5 h3.5 l4.2-9.6 c1-2.3 3.6-3 5.2-1.5 1.3 1.1 1.5 2.9 .9 4.4 L26.8 21 h9 c2.3 0 4 2.1 3.5 4.3 l-2.6 11.2 c-.4 1.9-2.1 3.3-4 3.3 H15 z" fill="#C68642" ${O}/>
<path d="M38.6 27.6 h-6.4 M37.4 33 h-5.6" fill="none" stroke="${N}" stroke-width="2.2" stroke-linecap="round"/>
<path d="M19.5 26 q3-1 5 1" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".7"/>
<path d="M39 6.5 l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3z" fill="#FFD43B" ${O.replace('2.5', '1.6')}/>`,
  // surprised face
  wow: `<circle cx="24" cy="25.5" r="16.5" fill="#FFD43B" ${O}/>
<path d="M13.5 13.5 q3.5-3 7.5-1.5 M27 12 q4-1.5 7.5 1.5" fill="none" stroke="${N}" stroke-width="2.5" stroke-linecap="round"/>
<ellipse cx="18" cy="22" rx="4" ry="4.8" fill="#FFFFFF" ${O.replace('2.5', '2')}/>
<ellipse cx="30" cy="22" rx="4" ry="4.8" fill="#FFFFFF" ${O.replace('2.5', '2')}/>
<circle cx="18.6" cy="23" r="2" fill="${N}"/><circle cx="30.6" cy="23" r="2" fill="${N}"/>
<ellipse cx="24" cy="33.5" rx="3.6" ry="4.4" fill="${N}"/>
<ellipse cx="24" cy="35.6" rx="2.2" ry="1.6" fill="#FF5A6E"/>
<path d="M13 31 q-1.5 .3-2.5 0 M35 31 q1.5 .3 2.5 0" stroke="#FF5A6E" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
<path d="M39 8 l2.5-3 M42 13 l3-1 M35.5 6 l.5-3.5" stroke="${N}" stroke-width="2.2" stroke-linecap="round"/>`,
  // cute flame
  dife: `<path d="M24 5.5 c3.2 7.4 12.5 11.4 12.5 22.6 c0 7.8-5.6 13.4-12.5 13.4 s-12.5-5.6-12.5-13.4 c0-6.2 3.6-9.4 5.7-13 c.8 3.3 2.3 5.2 4.2 5.8 C21 16.2 21.4 11 24 5.5z" fill="#FF9F43" ${O}/>
<path d="M24 21 c2.2 4.2 6.8 6.3 6.8 11.2 c0 4-3 7.2-6.8 7.2 s-6.8-3.2-6.8-7.2 c0-3.3 2.2-4.9 3.3-7 c.6 1.5 1.5 2.4 2.4 2.6 C22.9 26 23 23.4 24 21z" fill="#FFD43B"/>
<circle cx="21.4" cy="31.6" r="1.5" fill="${N}"/><circle cx="26.6" cy="31.6" r="1.5" fill="${N}"/>
<path d="M22.2 35 q1.8 1.6 3.6 0" fill="none" stroke="${N}" stroke-width="1.8" stroke-linecap="round"/>
<path d="M15.5 25 q-.5-3 1.5-5.5" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>`,
  // big laugh
  ri: `<circle cx="24" cy="24.5" r="16.5" fill="#FFD43B" ${O}/>
<path d="M14 21 q3.6-4.4 7.2 0 M26.8 21 q3.6-4.4 7.2 0" fill="none" stroke="${N}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M13.8 26.5 h20.4 c0 7-4.6 11.5-10.2 11.5 s-10.2-4.5-10.2-11.5z" fill="${N}" ${O.replace('2.5', '2')}/>
<path d="M15.2 27.4 h17.6 v2.2 c-5.8 .8-11.8 .8-17.6 0z" fill="#FFFFFF"/>
<path d="M18.6 35 c1.6-2.4 9.2-2.4 10.8 0 c-1.6 1.6-3.4 2.4-5.4 2.4 s-3.8-.8-5.4-2.4z" fill="#FF5A6E"/>
<ellipse cx="11.6" cy="27.5" rx="2.2" ry="1.4" fill="#FF5A6E" opacity=".7"/><ellipse cx="36.4" cy="27.5" rx="2.2" ry="1.4" fill="#FF5A6E" opacity=".7"/>
<path d="M14 13.5 q2-3 5.5-3.8" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>`,
  // heart
  ke: `<path d="M24 40.5 C12.5 32.8 7 25.8 7 18.8 C7 13.2 11.1 9 16.2 9 c3.4 0 6.1 1.8 7.8 4.6 C25.7 10.8 28.4 9 31.8 9 C36.9 9 41 13.2 41 18.8 C41 25.8 35.5 32.8 24 40.5z" fill="#FF5A6E" ${O}/>
<path d="M12.6 17.5 q.6-3.6 4.4-4.2" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
<path d="M39.5 4.5 l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z" fill="#FFD43B" ${O.replace('2.5', '1.6')}/>
<path d="M7.5 38 c-2.6-1.8-3.8-3.4-3.8-5 c0-1.3 1-2.3 2.2-2.3 c.7 0 1.3.4 1.6 1 c.3-.6.9-1 1.6-1 c1.2 0 2.2 1 2.2 2.3 c0 1.6-1.2 3.2-3.8 5z" fill="#FDE7EC" ${O.replace('2.5', '1.6')}/>`,
  // four-leaf clover
  bon_chans: `<path d="M24 23 q2.5 9-2.5 17.5" fill="none" stroke="${N}" stroke-width="6" stroke-linecap="round"/>
<path d="M24 23 q2.5 9-2.5 17.5" fill="none" stroke="#2F9E44" stroke-width="2.6" stroke-linecap="round"/>
${[45, 135, 225, 315].map((r) => `<path d="M0 0 C-2.6-3.4-9.4-5.4-9.4-10.4 c0-3 2.4-5.2 5-5.2 c2 0 3.6 1.2 4.4 3 c.8-1.8 2.4-3 4.4-3 c2.6 0 5 2.2 5 5.2 C9.4-5.4 2.6-3.4 0 0z" transform="translate(24 22) rotate(${r})" fill="#51CF66" ${O}/>`).join('')}
<circle cx="24" cy="22" r="2.4" fill="#2F9E44" ${O.replace('2.5', '1.8')}/>
<path d="M14.5 12.5 q1.5-2.6 4-3" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>
<path d="M39.5 31.5 l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3z" fill="#FFD43B" ${O.replace('2.5', '1.6')}/>`,
  // "again!": round replay button
  anko: `<circle cx="24" cy="24" r="17" fill="#4D7CFE" ${O}/>
<path d="M31.2 17.6 a10 10 0 1 0 2.4 9.4" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
<path d="M34.2 11.4 v7.6 h-7.6 z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
<path d="M14.5 16 q1.5-2.8 4.5-3.8" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>
<path d="M39.5 37 l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3z" fill="#FFD43B" ${O.replace('2.5', '1.6')}/>`,
  // "I'm ready!": lightning bolt
  mwen_pare: `<path d="M27.5 5.5 L12 26.5 h10 l-3.5 16 L36 20.5 h-10.5 z" fill="#FFD43B" ${O}/>
<path d="M24.5 11.5 l-6.5 9" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>
<path d="M39 8 l2.5-2.5 M41 14 l3 0 M8 36 l-2.5 2.5" stroke="${N}" stroke-width="2.2" stroke-linecap="round"/>`,
};
// ART-END

/** White die-cut rim: the same shapes, all white, drawn wider underneath. */
function rim(inner: string) {
  const white = inner
    .replace(/fill="#[0-9A-Fa-f]{3,6}"/g, 'fill="#FFFFFF"')
    .replace(/stroke="#[0-9A-Fa-f]{3,6}"/g, 'stroke="#FFFFFF"')
    .replace(/stroke-width="([\d.]+)"/g, (_m, w) => `stroke-width="${(+w + 5).toFixed(1)}"`)
    .replace(/ opacity="[\d.]+"/g, '');
  return `<g stroke="#FFFFFF" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round">${white}</g>`;
}
export const STICKER_XML: Record<ReactionId, string> = Object.fromEntries(
  (Object.keys(ART) as ReactionId[]).map((k) => [k, `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${rim(ART[k])}${ART[k]}</svg>`]),
) as Record<ReactionId, string>;

/** Bubble / tile colours per sticker. */
export const REACTION_COLORS: Record<ReactionId, { edge: string; soft: string }> = {
  bravo: { edge: colors.purple, soft: colors.purpleSoft },
  byen_jwe: { edge: colors.greenLight, soft: colors.greenSoft },
  wow: { edge: colors.yellowDark, soft: colors.yellowSoft },
  dife: { edge: colors.orange, soft: colors.orangeSoft },
  ri: { edge: colors.blueLight, soft: '#E7F5FF' },
  ke: { edge: colors.redLight, soft: colors.redSoft },
  bon_chans: { edge: colors.green, soft: '#E6F6EA' },
  anko: { edge: colors.blue, soft: colors.blueSoft },
  mwen_pare: { edge: colors.yellowDark, soft: colors.yellowSoft },
};

/** The stickers offered in the tray, in order (mwen_pare stays valid for older apps but isn't offered). */
export const TRAY_REACTIONS: ReactionId[] = ['bravo', 'byen_jwe', 'wow', 'dife', 'ri', 'ke', 'bon_chans', 'anko'];
export const REACT_COOLDOWN = 3000;

export const isReaction = (id: unknown): id is ReactionId => typeof id === 'string' && (PRESET_REACTIONS as readonly string[]).includes(id);
export const reactionLabelKey = (id: ReactionId) => `re_${id}` as StrKey;
/** Play a sticker's own sound. */
export const reactionSfx = (id: ReactionId) => sfx(`re_${id}`);

export function Sticker({ id, size = 48 }: { id: ReactionId; size?: number }) {
  return <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SvgXml xml={STICKER_XML[id]} width={size} height={size} /></View>;
}

// ─── Tray ────────────────────────────────────────────────────────────────────
/** One row of sticker buttons. A sent sticker pops; then the whole tray rests for `REACT_COOLDOWN` ms (a bar fills up). */
export function ReactionTray({ onSend }: { onSend: (id: ReactionId) => void }) {
  const t = useT();
  const [w, setW] = useState(0);
  const [cooling, setCooling] = useState(false);
  const [sent, setSent] = useState<ReactionId | null>(null);
  const bar = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const PAD = 5, GAP = 3;
  const cell = w ? Math.min(52, (w - PAD * 2 - GAP * (TRAY_REACTIONS.length - 1)) / TRAY_REACTIONS.length) : 36;
  const send = (id: ReactionId) => {
    if (cooling) return;
    tap();
    onSend(id);
    setCooling(true);
    setSent(id);
    bar.setValue(0);
    Animated.timing(bar, { toValue: 1, duration: REACT_COOLDOWN, easing: Easing.linear, useNativeDriver: true }).start();
    timer.current = setTimeout(() => setCooling(false), REACT_COOLDOWN);
  };
  return (
    <View style={{ gap: 6, marginHorizontal: -12 }}>
      <T v="small" color={colors.muted} style={{ marginLeft: 14 }}>{t('reactions')}</T>
      <View testID="react-tray" onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        style={{ flexDirection: 'row', gap: GAP, padding: PAD, paddingBottom: PAD + 3, backgroundColor: colors.card, borderRadius: 20, borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, overflow: 'hidden' }}>
        {TRAY_REACTIONS.map((id) => <TrayButton key={id} id={id} cell={cell} dim={cooling} lit={cooling && sent === id} label={t(reactionLabelKey(id))} onPress={() => send(id)} />)}
        {/* cooldown bar along the bottom edge */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, overflow: 'hidden' }}>
          {w > 0 && <Animated.View style={{ width: w, height: 3, backgroundColor: colors.blueLight, opacity: cooling ? 1 : 0, transform: [{ translateX: bar.interpolate({ inputRange: [0, 1], outputRange: [-w, 0] }) }] }} />}
        </View>
      </View>
    </View>
  );
}

function TrayButton({ id, cell, dim, lit, label, onPress }: { id: ReactionId; cell: number; dim: boolean; /** the one just sent stays bright */ lit: boolean; label: string; onPress: () => void }) {
  const s = useRef(new Animated.Value(0)).current; // 0 rest → 1 pop
  const press = useRef(new Animated.Value(1)).current;
  const pop = () => {
    if (reduceMotion()) return;
    s.setValue(0);
    Animated.timing(s, { toValue: 1, duration: 620, easing: Easing.linear, useNativeDriver: true }).start();
  };
  const { soft } = REACTION_COLORS[id];
  const size = Math.max(26, Math.min(40, cell - 3));
  return (
    <Pressable testID={`react-${id}`} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: dim }}
      hitSlop={{ top: 6, bottom: 6 }}
      onPressIn={() => { if (!dim && !reduceMotion()) Animated.spring(press, { toValue: 0.86, speed: 40, bounciness: 0, useNativeDriver: true }).start(); }}
      onPressOut={() => Animated.spring(press, { toValue: 1, speed: 30, bounciness: 12, useNativeDriver: true }).start()}
      onPress={() => { if (dim) return; pop(); onPress(); }}
      style={{ flex: 1, height: Math.max(44, size + 8), borderRadius: 14, backgroundColor: soft, alignItems: 'center', justifyContent: 'center', opacity: dim && !lit ? 0.4 : 1 }}>
      <Animated.View style={{ transform: [
        { scale: press },
        { scale: s.interpolate({ inputRange: [0, 0.18, 0.4, 0.62, 1], outputRange: [1, 1.45, 0.92, 1.06, 1] }) },
        { rotate: s.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: ['0deg', '-16deg', '12deg', '-6deg', '3deg', '0deg'] }) },
      ] }}>
        <Sticker id={id} size={size} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Bubble ──────────────────────────────────────────────────────────────────
export const BUBBLE_MS = 2300;
/**
 * Big reaction bubble under a player's avatar: flies up and pops in, the sticker wiggles, then it all fades.
 * `side` anchors it (and its little pointer) to the left (you) or right (the opponent) avatar; `who` names the sender.
 * Mount it with a new `key` per reaction; it calls `onDone` when finished. Sized to its text — never truncated.
 */
export function ReactionBubble({ id, side, who, anchor = 37, onDone }: { id: ReactionId; side: 'me' | 'op'; who: string; /** px from the card edge to the avatar centre */ anchor?: number; onDone?: () => void }) {
  const t = useT();
  const v = useRef(new Animated.Value(0)).current;
  const [bw, setBw] = useState(0);
  const reduce = reduceMotion();
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: BUBBLE_MS, easing: Easing.linear, useNativeDriver: true });
    a.start(({ finished }) => { if (finished) onDone?.(); });
    return () => a.stop();
  }, []);
  const { edge, soft } = REACTION_COLORS[id];
  const left = side === 'me';
  const opacity = v.interpolate({ inputRange: [0, 0.05, 0.84, 1], outputRange: [0, 1, 1, 0] });
  const scale = reduce ? 1 : v.interpolate({ inputRange: [0, 0.07, 0.13, 0.18, 0.23, 0.84, 1], outputRange: [0.3, 1.12, 0.95, 1.03, 1, 1, 0.88] });
  const ty = reduce ? 0 : v.interpolate({ inputRange: [0, 0.1, 0.84, 1], outputRange: [26, 0, 0, -10] });
  const wiggle = reduce ? '0deg' : v.interpolate({ inputRange: [0, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 1], outputRange: ['0deg', '0deg', '-14deg', '12deg', '-8deg', '5deg', '0deg', '0deg'] });
  const hop = reduce ? 0 : v.interpolate({ inputRange: [0, 0.12, 0.2, 0.3, 0.55, 0.62, 0.7, 1], outputRange: [0, 0, -8, 0, 0, -4, 0, 0] });
  return (
    <Animated.View testID={`bubble-${side}`} pointerEvents="none" onLayout={(e: LayoutChangeEvent) => setBw(e.nativeEvent.layout.width)}
      style={{ maxWidth: '64%', alignSelf: left ? 'flex-start' : 'flex-end', opacity, transform: [{ translateY: ty }, { scale }],
        // grow out of the pointer (the avatar), not the middle
        transformOrigin: `${left ? anchor : Math.max(0, bw - anchor)}px 0px` }}>
      <View style={{ backgroundColor: soft, borderColor: edge, borderWidth: 3, borderBottomWidth: 5, borderRadius: 22,
        shadowColor: '#14213D', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8, alignItems: 'center', minWidth: 96 }}>
        <View>
          <Burst trigger={reduce ? null : id} count={9} radius={46} shapes="stars" />
          <Animated.View style={{ transform: [{ translateY: hop }, { rotate: wiggle }] }}><Sticker id={id} size={58} /></Animated.View>
        </View>
        <T v="h3" center color={colors.ink} style={{ marginTop: 2 }}>{t(reactionLabelKey(id))}</T>
        <T v="small" center color={colors.muted} style={{ fontSize: 11, lineHeight: 14 }}>{who}</T>
      </View>
      {/* pointer up to the avatar (drawn over the bubble's top border so they join) */}
      <View style={{ position: 'absolute', top: -8, [left ? 'left' : 'right']: anchor - 8, width: 16, height: 16, borderTopLeftRadius: 3, backgroundColor: soft, borderColor: edge, borderTopWidth: 3, borderLeftWidth: 3, transform: [{ rotate: '45deg' }] }} />
    </Animated.View>
  );
}
