/** Kid avatars — ported from the mockup (design/project/Avatar.dc.html): chunky ink outlines, 5 skin tones, 4 hair styles. */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import type { AvatarConfig } from '@konesans/core';
import { useBlink, Bob } from './motion';

const INK = '#14213D';
export const SKINS = ['#8D5524', '#5C3A1E', '#C68642', '#3B2314', '#E0AC69'];
export const HAIR_COLORS = ['#14213D', '#3B2314', '#7A4212', '#D21034', '#F5B700'];
export const SHIRTS = ['#FF5A6E', '#4D7CFE', '#51CF66', '#FFD43B', '#9775FA', '#FF9F43'];
export const BGS = ['#E6ECFB', '#FFE8DC', '#D3F9D8', '#FFF4D1', '#EDE7FF', '#14213D'];
export const HAIRS: AvatarConfig['hair'][] = ['afro', 'braids', 'short', 'puffs'];
export const EXTRAS: AvatarConfig['extra'][] = ['none', 'glasses', 'cap', 'mask', 'uniform'];

export const DEFAULT_AVATAR: AvatarConfig = { skin: 1, hair: 'afro', hairColor: 0, shirt: 1, extra: 'none', bg: 0 };

/** Deterministic avatar from any string (bots, players without one yet). */
export function avatarFromSeed(seed: string): AvatarConfig {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const r = (n: number) => { h = Math.imul(h ^ (h >>> 13), 1274126177); return Math.abs(h) % n; };
  return { skin: r(SKINS.length), hair: HAIRS[r(HAIRS.length)], hairColor: r(3), shirt: r(SHIRTS.length), extra: (['none', 'none', 'glasses', 'cap'] as const)[r(4)], bg: r(BGS.length - 1) };
}
export function randomAvatar(): AvatarConfig { return avatarFromSeed(String(Math.random())); }

/** The drawing alone (viewBox 0 0 120 120). */
export function AvatarArt({ a, size, blink }: { a: AvatarConfig; size: number; blink?: boolean }) {
  const skin = SKINS[a.skin % SKINS.length];
  const hc = HAIR_COLORS[a.hairColor % HAIR_COLORS.length];
  const shirt = a.extra === 'uniform' ? '#4D7CFE' : SHIRTS[a.shirt % SHIRTS.length];
  const eyes = blink
    ? <G><Path d="M44 58h8M68 58h8" stroke={INK} strokeWidth={3} strokeLinecap="round" /></G>
    : <G><Circle cx="48" cy="58" r="4" fill={INK} /><Circle cx="72" cy="58" r="4" fill={INK} /><Circle cx="49.5" cy="56.5" r="1.3" fill="#FFFFFF" /><Circle cx="73.5" cy="56.5" r="1.3" fill="#FFFFFF" /></G>;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {a.hair === 'braids' && <Path d="M32 46c-4 16-6 30-2 44M88 46c4 16 6 30 2 44M40 44c-3 18-4 34 0 48M80 44c3 18 4 34 0 48" fill="none" stroke={hc} strokeWidth={7} strokeLinecap="round" />}
      {a.hair === 'braids' && <Path d="M32 46c-4 16-6 30-2 44M88 46c4 16 6 30 2 44M40 44c-3 18-4 34 0 48M80 44c3 18 4 34 0 48" fill="none" stroke={INK} strokeWidth={1.5} strokeDasharray="3 5" />}
      <Path d="M30 118c0-18 13-28 30-28s30 10 30 28z" fill={shirt} stroke={INK} strokeWidth={2.5} />
      {a.extra === 'uniform' && <G><Path d="M48 92l12 10 12-10" fill="none" stroke="#FFFFFF" strokeWidth={3} /><Path d="M60 102v16" stroke={INK} strokeWidth={2} /></G>}
      {a.hair === 'puffs' && <G><Circle cx="30" cy="30" r="16" fill={hc} stroke={INK} strokeWidth={2.5} /><Circle cx="90" cy="30" r="16" fill={hc} stroke={INK} strokeWidth={2.5} /></G>}
      <Ellipse cx="60" cy="58" rx="30" ry="34" fill={skin} stroke={INK} strokeWidth={2.5} />
      {a.hair === 'afro' && <Path d="M28 50c-6-26 10-38 32-38s38 12 32 38c-4-14-16-18-32-18S32 36 28 50z" fill={hc} stroke={INK} strokeWidth={2.5} />}
      {a.hair === 'braids' && <Path d="M30 46c0-20 12-30 30-30s30 10 30 30c-4-10-14-14-30-14S34 36 30 46z" fill={hc} stroke={INK} strokeWidth={2.5} />}
      {a.hair === 'short' && <Path d="M30 46c2-18 14-26 30-26s28 8 30 26c-6-8-16-10-30-10s-24 2-30 10z" fill={hc} stroke={INK} strokeWidth={2.5} />}
      {a.hair === 'puffs' && <Path d="M32 44c4-10 14-14 28-14s24 4 28 14" fill={hc} stroke={INK} strokeWidth={2.5} />}
      <Ellipse cx="40" cy="68" rx="5" ry="3" fill="#FF5A6E" opacity={0.25} />
      <Ellipse cx="80" cy="68" rx="5" ry="3" fill="#FF5A6E" opacity={0.25} />
      {a.extra !== 'mask' && eyes}
      <Path d="M50 74q10 9 20 0" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      {a.extra === 'glasses' && <G><Circle cx="48" cy="58" r="10" fill="none" stroke={INK} strokeWidth={3} /><Circle cx="72" cy="58" r="10" fill="none" stroke={INK} strokeWidth={3} /><Path d="M58 58h4" stroke={INK} strokeWidth={3} /></G>}
      {a.extra === 'mask' && <G>
        <Path d="M30 56c6-12 18-16 30-16s24 4 30 16c-6 8-16 12-30 12S36 64 30 56z" fill="#FF5A6E" stroke={INK} strokeWidth={2.5} />
        <Circle cx="48" cy="58" r="6" fill="#FFFFFF" stroke={INK} strokeWidth={2} /><Circle cx="72" cy="58" r="6" fill="#FFFFFF" stroke={INK} strokeWidth={2} />
        {!blink && <G><Circle cx="48" cy="58" r="2.5" fill={INK} /><Circle cx="72" cy="58" r="2.5" fill={INK} /></G>}
        <Path d="M40 40l-6-14M60 36V20M80 40l6-14" stroke="#FFD43B" strokeWidth={5} strokeLinecap="round" />
        <Circle cx="34" cy="24" r="4" fill="#51CF66" stroke={INK} strokeWidth={1.5} /><Circle cx="60" cy="18" r="4" fill="#4D7CFE" stroke={INK} strokeWidth={1.5} /><Circle cx="86" cy="24" r="4" fill="#FF9F43" stroke={INK} strokeWidth={1.5} />
      </G>}
      {a.extra === 'cap' && <G><Path d="M28 36c4-16 16-22 32-22s28 6 32 22z" fill={INK} /><Path d="M24 36h72l-8 6H32z" fill={INK} /><Path d="M92 36l3 14" stroke="#D21034" strokeWidth={3} strokeLinecap="round" /><Circle cx="95" cy="52" r="4" fill="#D21034" /></G>}
    </Svg>
  );
}

/** Round avatar badge. `live` adds the idle bob + blink. */
type AvatarProps = { a: AvatarConfig; size?: number; live?: boolean; ring?: boolean; style?: StyleProp<ViewStyle> };
export function Avatar(p: AvatarProps) { return p.live ? <LiveAvatar {...p} /> : <AvatarBadge {...p} />; }
function LiveAvatar(p: AvatarProps) {
  const blink = useBlink();
  return <Bob amount={Math.max(2, (p.size ?? 48) / 40)}><AvatarBadge {...p} blink={blink} /></Bob>;
}
function AvatarBadge({ a, size = 48, ring = true, style, blink }: AvatarProps & { blink?: boolean }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: BGS[a.bg % BGS.length], borderWidth: ring ? Math.max(2, size / 40) : 0, borderColor: INK, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }, style]}>
      <AvatarArt a={a} size={size * 0.94} blink={blink} />
    </View>
  );
}
