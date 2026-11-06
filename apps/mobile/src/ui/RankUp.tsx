/**
 * Ranks UI: the rank badge (shield in the rank's colour), unlock previews, and the full-screen "new rank" moment.
 * `RankUpListener` is mounted by the main screens (home, profile, quests): when the kid's XP crosses into a new rank
 * and that screen is focused, the celebration shows once (the store remembers the highest rank celebrated).
 */
import React, { useEffect, useRef } from 'react';
import { View, Modal, Animated, Easing } from 'react-native';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import { router, useIsFocused } from 'expo-router';
import { RANKS, rankForXp, rankUnlocks, type RankDef, type UnlockDef, type AvatarConfig } from '@konesans/core';
import { T, Button, Icon } from './index';
import { Avatar } from './avatar';
import { Mascot, MascotArt } from './mascot';
import { Pop, Burst, Confetti, Hop, FadeIn, reduceMotion } from './motion';
import { colors } from '@/lib/theme';
import { useStore, useAvatar } from '@/lib/store';
import { useT, useL, type StrKey } from '@/lib/i18n';
import { sfx, tap } from '@/lib/audio';

const INK = '#14213D';

/** The symbol inside each rank's shield (48×48 space, drawn in the white disc centred at 24,22). */
function Glyph({ id, size }: { id: string; size: number }) {
  if (id === 'zwazo') return <MascotArt size={size * 1.15} mood="happy" />;
  const icon = ({ eksplo: 'vwayaj', sitadel: 'istwa', zetwal: 'pwen', met: 'kouwòn', lejand: 'jem' } as const)[id as 'eksplo'];
  if (icon) return <Icon name={icon} size={size} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {id === 'grenn' && <G>
        <Ellipse cx="24" cy="26" rx="10" ry="14" fill="#D98A3A" stroke={INK} strokeWidth={2.5} transform="rotate(-18 24 26)" />
        <Path d="M20 16c2 6 2 14 0 20" stroke="#7A4212" strokeWidth={2} fill="none" strokeLinecap="round" transform="rotate(-18 24 26)" />
        <Ellipse cx="28" cy="20" rx="2.5" ry="4" fill="#FFFFFF" opacity={0.6} transform="rotate(-18 24 26)" />
      </G>}
      {id === 'pous' && <G>
        <Path d="M24 44V24" stroke="#2F9E44" strokeWidth={4} strokeLinecap="round" />
        <Path d="M24 26c-11 1-17-6-16-15 10-1 16 5 16 15z" fill="#51CF66" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <Path d="M24 22c1-10 8-15 17-13 0 10-7 15-17 13z" fill="#8CE99A" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <Path d="M14 44h20" stroke="#7A4212" strokeWidth={4} strokeLinecap="round" />
      </G>}
      {id === 'malfini' && <G>
        <Path d="M24 14c-3 0-5 2-6 5-5-4-11-5-17-3 5 3 8 7 10 12l6-1 3 9h8l3-9 6 1c2-5 5-9 10-12-6-2-12-1-17 3-1-3-3-5-6-5z" fill="#B5651D" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Circle cx="22" cy="18" r="1.4" fill={INK} /><Path d="M26 18l4 2-4 1z" fill="#FFD43B" stroke={INK} strokeWidth={1} strokeLinejoin="round" />
      </G>}
      {id === 'mapou' && <G>
        <Path d="M21 44l1-16h4l1 16z" fill="#7A4212" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M24 30c-4 0-6 3-6 3M24 30c4 0 6 3 6 3" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Circle cx="16" cy="20" r="9" fill="#2F9E44" stroke={INK} strokeWidth={2.2} />
        <Circle cx="32" cy="20" r="9" fill="#2F9E44" stroke={INK} strokeWidth={2.2} />
        <Circle cx="24" cy="13" r="10" fill="#51CF66" stroke={INK} strokeWidth={2.2} />
      </G>}
    </Svg>
  );
}

/** Shield badge for a rank. `dim` = not reached yet. */
export function RankBadge({ rank, size = 48, dim }: { rank: RankDef; size?: number; dim?: boolean }) {
  const top = rank.id === 'lejand' || rank.id === 'met' || rank.id === 'zetwal';
  return (
    <View style={{ width: size, height: size, opacity: dim ? 0.45 : 1 }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Path d="M24 3l17 6v13c0 11-7 19-17 23C14 41 7 33 7 22V9z" fill={rank.color} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <Path d="M24 7l13.5 4.8V22c0 9-5.5 15.5-13.5 19" fill="none" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={2.5} strokeLinecap="round" />
        {top && <Path d="M24 6.5l14 5V22c0 9.5-6 16.5-14 20C16 38.5 10 31.5 10 22V11.5z" fill="none" stroke="#FFD43B" strokeWidth={1.6} strokeLinejoin="round" />}
        <Circle cx="24" cy="22" r="12.5" fill="#FFFFFF" stroke={INK} strokeWidth={2} />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: size * (22 / 48) - size * 0.21, height: size * 0.42, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: size }}>
        <Glyph id={rank.id} size={size * 0.38} />
      </View>
    </View>
  );
}

/** Kreyòl/French name of an unlockable avatar item. */
export function useUnlockLabel() {
  const t = useT();
  return (u: Pick<UnlockDef, 'kind' | 'value'>) => {
    const k = ({ hair: `pf_hair_${u.value}`, extra: `pf_ex_${u.value}`, hairColor: `pf_hc_${u.value}`, shirt: `pf_shirt_${u.value}`, bg: `pf_bg_${u.value}`, frame: `pf_frame_${u.value}` } as const)[u.kind];
    return t(k as StrKey);
  };
}

/** The kid's own avatar wearing the item. */
export const withItem = (a: AvatarConfig, u: Pick<UnlockDef, 'kind' | 'value'>): AvatarConfig =>
  u.kind === 'hair' ? { ...a, hair: u.value as AvatarConfig['hair'], extra: ['cap', 'strawhat', 'crown', 'headphones'].includes(a.extra) ? 'none' : a.extra }
  : u.kind === 'extra' ? { ...a, extra: u.value as AvatarConfig['extra'] }
  : u.kind === 'shirt' ? { ...a, [u.kind]: u.value as number, extra: a.extra === 'uniform' ? 'none' : a.extra }
  : { ...a, [u.kind]: u.value as number };

/** Small preview of an unlock: avatar wearing it + its name. */
export function UnlockChip({ u, size = 54, dim, light }: { u: UnlockDef; size?: number; dim?: boolean; light?: boolean }) {
  const avatar = useAvatar();
  const label = useUnlockLabel();
  return (
    <View style={{ width: size + 22, alignItems: 'center', gap: 4, opacity: dim ? 0.55 : 1 }}>
      <Avatar a={withItem(avatar, u)} size={size} />
      <T v="small" center numberOfLines={2} color={light ? '#FFFFFF' : colors.ink}>{label(u)}</T>
    </View>
  );
}

/** Full-screen "new rank" moment. */
export function RankUp({ open, to, onClose }: { open: boolean; from: number; to: number; onClose: () => void }) {
  const t = useT(); const l = useL();
  const rank = RANKS[Math.max(0, Math.min(RANKS.length - 1, to))];
  const unlocks = rankUnlocks(to);
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!open) return;
    sfx('level');
    const id = setTimeout(() => sfx('badge'), 650);
    if (!reduceMotion()) Animated.loop(Animated.timing(glow, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })).start();
    return () => { clearTimeout(id); glow.stopAnimation(); };
  }, [open]);
  if (!open) return null;
  const close = () => { tap(); onClose(); };
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: rank.edge, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 14 }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: rank.color, opacity: 0.55 }} />
        <Confetti count={26} />
        <FadeIn><View style={{ backgroundColor: colors.yellow, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 14, paddingVertical: 3 }}><T v="label" color={INK}>{t('pf_ru_label')}</T></View></FadeIn>
        <View style={{ width: 220, height: 200, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 14, borderColor: '#FFFFFF', borderStyle: 'dashed', opacity: 0.18, transform: [{ rotate: glow.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }} />
          <View pointerEvents="none" style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#FFFFFF', opacity: 0.16 }} />
          <Pop delay={150} rotate={-30} from={0.2}><RankBadge rank={rank} size={150} /></Pop>
          <Burst trigger={open ? 'up' : null} count={16} radius={130} shapes="stars" />
        </View>
        <Pop delay={380}><T v="display" color="#FFFFFF" center style={{ fontSize: 34, lineHeight: 40 }}>{t('pf_ru_title', { r: l(rank.name) })}</T></Pop>
        <FadeIn delay={480}><T v="bold" color="#FFFFFF" center style={{ opacity: 0.9 }}>{t('pf_rank_level', { n: rank.level })}</T></FadeIn>
        {unlocks.length > 0 && (
          <FadeIn delay={620} style={{ alignSelf: 'stretch' }}>
            <View style={{ backgroundColor: colors.card, borderRadius: 22, borderWidth: 3, borderColor: INK, borderBottomWidth: 7, padding: 14, paddingTop: 12, gap: 10 }}>
              <T v="h3">{t('pf_ru_sub')}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
                {unlocks.map((u, i) => <Pop key={u.id} delay={800 + i * 160} rotate={-12}><UnlockChip u={u} /></Pop>)}
              </View>
              <View pointerEvents="none" style={{ position: 'absolute', right: -14, top: -62 }}><Hop height={10}><Mascot size={84} mood="cheer" /></Hop></View>
            </View>
          </FadeIn>
        )}
        <FadeIn delay={900} style={{ alignSelf: 'stretch', gap: 10, marginTop: 4 }}>
          {unlocks.length > 0 && <Button title={t('pf_ru_try')} color={colors.green} icon="avata" onPress={() => { onClose(); router.push('/avatar'); }} />}
          <Button title={t('next')} variant="secondary" color={INK} onPress={close} />
        </FadeIn>
        {!unlocks.length && <View pointerEvents="none" style={{ position: 'absolute', left: 10, bottom: 120 }}><Hop height={10}><Mascot size={96} mood="proud" /></Hop></View>}
      </View>
    </Modal>
  );
}

/** Shows the rank-up moment once when the kid reaches a new rank (only while this screen is focused). */
export function RankUpListener() {
  const xp = useStore((s) => s.progress.xp);
  const seen = useStore((s) => s.rankSeen ?? -1);
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.onboarded);
  const focused = useIsFocused();
  const idx = rankForXp(xp).index;
  // first run (or progress from before ranks existed): remember the current rank quietly
  useEffect(() => { if (hydrated && seen < 0) useStore.getState().ackRank(idx); }, [hydrated, seen]);
  const show = hydrated && onboarded && focused && seen >= 0 && idx > seen;
  return <RankUp open={show} from={seen} to={idx} onClose={() => useStore.getState().ackRank(idx)} />;
}
