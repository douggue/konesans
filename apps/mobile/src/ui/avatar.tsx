/**
 * Kid avatars — ported from the mockup (design/project/Avatar.dc.html): chunky ink outlines, 5 skin tones, 4 hair styles,
 * plus the items unlocked by rank / streak / trophies (core progress/ranks.ts): 3 hair styles, 5 extras, 3 hair colours,
 * 3 special shirts, 3 special backgrounds and 4 rings. Old saved avatars draw exactly as before.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Circle, Ellipse, G, Rect, Defs, ClipPath, LinearGradient, Stop } from 'react-native-svg';
import type { AvatarConfig } from '@konesans/core';
import { useBlink, Bob } from './motion';

const INK = '#14213D';
export const SKINS = ['#8D5524', '#5C3A1E', '#C68642', '#3B2314', '#E0AC69'];
/** 0–4 free; 5 blue, 6 purple, 7 pink unlock */
export const HAIR_COLORS = ['#14213D', '#3B2314', '#7A4212', '#D21034', '#F5B700', '#4D7CFE', '#9775FA', '#FF6FA8'];
/** 0–5 plain colours (free); 6 stripes, 7 Haitian flag, 8 gold unlock. Entries are the base colour. */
export const SHIRTS = ['#FF5A6E', '#4D7CFE', '#51CF66', '#FFD43B', '#9775FA', '#FF9F43', '#FFFFFF', '#00209F', '#FFD43B'];
/** 0–5 plain (free); 6 sunrise, 7 flag, 8 starry night unlock. Entries are the base colour. */
export const BGS = ['#E6ECFB', '#FFE8DC', '#D3F9D8', '#FFF4D1', '#EDE7FF', '#14213D', '#FFD8A8', '#00209F', '#1B2A55'];
export const HAIRS: AvatarConfig['hair'][] = ['afro', 'braids', 'short', 'puffs', 'bun', 'mohawk', 'locs'];
export const EXTRAS: AvatarConfig['extra'][] = ['none', 'glasses', 'cap', 'mask', 'uniform', 'flower', 'headphones', 'strawhat', 'shades', 'crown'];
/** 0 plain ink, 1 silver, 2 gold, 3 flag, 4 legend */
export const FRAMES = [0, 1, 2, 3, 4];

/** What existed before unlockables: random/bot avatars only use these, so a seed keeps its look. */
const BASE_HAIRS: AvatarConfig['hair'][] = ['afro', 'braids', 'short', 'puffs'];
const BASE_SHIRTS = 6, BASE_BGS = 6;

export const DEFAULT_AVATAR: AvatarConfig = { skin: 1, hair: 'afro', hairColor: 0, shirt: 1, extra: 'none', bg: 0 };

/** Deterministic avatar from any string (bots, players without one yet). */
export function avatarFromSeed(seed: string): AvatarConfig {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const r = (n: number) => { h = Math.imul(h ^ (h >>> 13), 1274126177); return Math.abs(h) % n; };
  return { skin: r(SKINS.length), hair: BASE_HAIRS[r(BASE_HAIRS.length)], hairColor: r(3), shirt: r(BASE_SHIRTS), extra: (['none', 'none', 'glasses', 'cap'] as const)[r(4)], bg: r(BASE_BGS - 1) };
}
export function randomAvatar(): AvatarConfig { return avatarFromSeed(String(Math.random())); }

const SHIRT_D = 'M30 118c0-18 13-28 30-28s30 10 30 28z';

/** The drawing alone (viewBox 0 0 120 120). */
export function AvatarArt({ a, size, blink }: { a: AvatarConfig; size: number; blink?: boolean }) {
  const skin = SKINS[a.skin % SKINS.length];
  const hc = HAIR_COLORS[a.hairColor % HAIR_COLORS.length];
  const shirtIx = a.shirt % SHIRTS.length;
  const shirt = a.extra === 'uniform' ? '#4D7CFE' : SHIRTS[shirtIx];
  const special = a.extra === 'uniform' ? 0 : shirtIx;
  const coversEyes = a.extra === 'mask' || a.extra === 'shades';
  const eyes = blink
    ? <G><Path d="M44 58h8M68 58h8" stroke={INK} strokeWidth={3} strokeLinecap="round" /></G>
    : <G><Circle cx="48" cy="58" r="4" fill={INK} /><Circle cx="72" cy="58" r="4" fill={INK} /><Circle cx="49.5" cy="56.5" r="1.3" fill="#FFFFFF" /><Circle cx="73.5" cy="56.5" r="1.3" fill="#FFFFFF" /></G>;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs><ClipPath id="kns-shirt"><Path d={SHIRT_D} /></ClipPath></Defs>
      {a.hair === 'braids' && <Path d="M32 46c-4 16-6 30-2 44M88 46c4 16 6 30 2 44M40 44c-3 18-4 34 0 48M80 44c3 18 4 34 0 48" fill="none" stroke={hc} strokeWidth={7} strokeLinecap="round" />}
      {a.hair === 'braids' && <Path d="M32 46c-4 16-6 30-2 44M88 46c4 16 6 30 2 44M40 44c-3 18-4 34 0 48M80 44c3 18 4 34 0 48" fill="none" stroke={INK} strokeWidth={1.5} strokeDasharray="3 5" />}
      {a.hair === 'locs' && <G>
        <Path d="M31 44c-5 14-5 30-3 46M89 44c5 14 5 30 3 46M38 40c-4 18-4 36-1 52M82 40c4 18 4 36 1 52" fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
        <Path d="M31 44c-5 14-5 30-3 46M89 44c5 14 5 30 3 46M38 40c-4 18-4 36-1 52M82 40c4 18 4 36 1 52" fill="none" stroke={hc} strokeWidth={7} strokeLinecap="round" />
        <Path d="M29 62h5M28 76h5M36 70h5M36 84h5M86 62h5M87 76h5M79 70h5M79 84h5" stroke="#FFD43B" strokeWidth={3} strokeLinecap="round" />
      </G>}
      <Path d={SHIRT_D} fill={shirt} stroke={INK} strokeWidth={2.5} />
      {special === 6 && <G clipPath="url(#kns-shirt)"><Path d="M20 100h80M20 108h80M20 116h80" stroke="#4D7CFE" strokeWidth={4} /></G>}
      {special === 7 && <G clipPath="url(#kns-shirt)"><Rect x="20" y="104" width="80" height="16" fill="#D21034" /><Rect x="52" y="100" width="16" height="10" rx="2" fill="#FFFFFF" /><Circle cx="60" cy="105" r="2.5" fill="#2F9E44" /></G>}
      {special === 8 && <G><Path d="M60 98l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="#FFFFFF" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" /><Path d="M38 104l4 6M82 104l-4 6" stroke="#F5B700" strokeWidth={3} strokeLinecap="round" /></G>}
      {(special === 6 || special === 7) && <Path d={SHIRT_D} fill="none" stroke={INK} strokeWidth={2.5} />}
      {a.extra === 'uniform' && <G><Path d="M48 92l12 10 12-10" fill="none" stroke="#FFFFFF" strokeWidth={3} /><Path d="M60 102v16" stroke={INK} strokeWidth={2} /></G>}
      {a.hair === 'puffs' && <G><Circle cx="30" cy="30" r="16" fill={hc} stroke={INK} strokeWidth={2.5} /><Circle cx="90" cy="30" r="16" fill={hc} stroke={INK} strokeWidth={2.5} /></G>}
      {a.hair === 'bun' && <Circle cx="60" cy="16" r="13" fill={hc} stroke={INK} strokeWidth={2.5} />}
      <Ellipse cx="60" cy="58" rx="30" ry="34" fill={skin} stroke={INK} strokeWidth={2.5} />
      {a.hair === 'afro' && <Path d="M28 50c-6-26 10-38 32-38s38 12 32 38c-4-14-16-18-32-18S32 36 28 50z" fill={hc} stroke={INK} strokeWidth={2.5} />}
      {(a.hair === 'braids' || a.hair === 'locs') && <Path d="M30 46c0-20 12-30 30-30s30 10 30 30c-4-10-14-14-30-14S34 36 30 46z" fill={hc} stroke={INK} strokeWidth={2.5} />}
      {(a.hair === 'short' || a.hair === 'bun') && <Path d="M30 46c2-18 14-26 30-26s28 8 30 26c-6-8-16-10-30-10s-24 2-30 10z" fill={hc} stroke={INK} strokeWidth={2.5} />}
      {a.hair === 'bun' && <Path d="M50 27q10-5 20 0" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />}
      {a.hair === 'puffs' && <Path d="M32 44c4-10 14-14 28-14s24 4 28 14" fill={hc} stroke={INK} strokeWidth={2.5} />}
      {a.hair === 'mohawk' && <G>
        <Path d="M34 44c3-10 12-16 26-16s23 6 26 16c-7-5-16-7-26-7s-19 2-26 7z" fill={hc} opacity={0.35} />
        <Path d="M50 36C48 20 52 8 60 3c8 5 12 17 10 33-6-3-14-3-20 0z" fill={hc} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      </G>}
      <Ellipse cx="40" cy="68" rx="5" ry="3" fill="#FF5A6E" opacity={0.25} />
      <Ellipse cx="80" cy="68" rx="5" ry="3" fill="#FF5A6E" opacity={0.25} />
      {!coversEyes && eyes}
      <Path d="M50 74q10 9 20 0" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      {a.extra === 'glasses' && <G><Circle cx="48" cy="58" r="10" fill="none" stroke={INK} strokeWidth={3} /><Circle cx="72" cy="58" r="10" fill="none" stroke={INK} strokeWidth={3} /><Path d="M58 58h4" stroke={INK} strokeWidth={3} /></G>}
      {a.extra === 'shades' && <G>
        <Path d="M36 52h22l-2 10a7 7 0 0 1-7 5h-4a7 7 0 0 1-7-5zM62 52h22l-2 10a7 7 0 0 1-7 5h-4a7 7 0 0 1-7-5z" fill={INK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M30 53h60" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <Path d="M41 56l5 5M67 56l5 5" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
      </G>}
      {a.extra === 'mask' && <G>
        <Path d="M30 56c6-12 18-16 30-16s24 4 30 16c-6 8-16 12-30 12S36 64 30 56z" fill="#FF5A6E" stroke={INK} strokeWidth={2.5} />
        <Circle cx="48" cy="58" r="6" fill="#FFFFFF" stroke={INK} strokeWidth={2} /><Circle cx="72" cy="58" r="6" fill="#FFFFFF" stroke={INK} strokeWidth={2} />
        {!blink && <G><Circle cx="48" cy="58" r="2.5" fill={INK} /><Circle cx="72" cy="58" r="2.5" fill={INK} /></G>}
        <Path d="M40 40l-6-14M60 36V20M80 40l6-14" stroke="#FFD43B" strokeWidth={5} strokeLinecap="round" />
        <Circle cx="34" cy="24" r="4" fill="#51CF66" stroke={INK} strokeWidth={1.5} /><Circle cx="60" cy="18" r="4" fill="#4D7CFE" stroke={INK} strokeWidth={1.5} /><Circle cx="86" cy="24" r="4" fill="#FF9F43" stroke={INK} strokeWidth={1.5} />
      </G>}
      {a.extra === 'cap' && <G><Path d="M28 36c4-16 16-22 32-22s28 6 32 22z" fill={INK} /><Path d="M24 36h72l-8 6H32z" fill={INK} /><Path d="M92 36l3 14" stroke="#D21034" strokeWidth={3} strokeLinecap="round" /><Circle cx="95" cy="52" r="4" fill="#D21034" /></G>}
      {a.extra === 'headphones' && <G>
        <Path d="M27 60C25 30 40 16 60 16s35 14 33 44" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
        <Path d="M27 60C25 30 40 16 60 16s35 14 33 44" fill="none" stroke="#FF5A6E" strokeWidth={4} strokeLinecap="round" />
        <Rect x="19" y="50" width="14" height="22" rx="6" fill="#FF5A6E" stroke={INK} strokeWidth={2.5} />
        <Rect x="87" y="50" width="14" height="22" rx="6" fill="#FF5A6E" stroke={INK} strokeWidth={2.5} />
      </G>}
      {a.extra === 'strawhat' && <G>
        <Ellipse cx="60" cy="34" rx="44" ry="9" fill="#E9C46A" stroke={INK} strokeWidth={2.5} />
        <Path d="M38 34c0-14 9-22 22-22s22 8 22 22c-6 3-14 4-22 4s-16-1-22-4z" fill="#F4D58D" stroke={INK} strokeWidth={2.5} />
        <Path d="M39 28c6 3 14 4 21 4s15-1 21-4" fill="none" stroke="#D21034" strokeWidth={5} />
        <Path d="M46 18l3 6M58 14v6M70 16l-2 6" stroke="#C99400" strokeWidth={1.5} strokeLinecap="round" />
      </G>}
      {a.extra === 'crown' && <G>
        <Path d="M38 30L40 8l11 11 9-15 9 15 11-11 2 22z" fill="#FFD43B" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <Circle cx="60" cy="22" r="3.5" fill="#D21034" stroke={INK} strokeWidth={1.5} /><Circle cx="47" cy="25" r="2.5" fill="#4D7CFE" /><Circle cx="73" cy="25" r="2.5" fill="#51CF66" />
      </G>}
      {a.extra === 'flower' && <G>
        {[0, 72, 144, 216, 288].map((r) => <Ellipse key={r} cx="86" cy="26" rx="6" ry="9" fill="#FF5A6E" stroke={INK} strokeWidth={1.8} transform={`rotate(${r} 86 34)`} />)}
        <Circle cx="86" cy="34" r="4" fill="#FFD43B" stroke={INK} strokeWidth={1.5} />
      </G>}
    </Svg>
  );
}

/** Background art for the special backgrounds (drawn under the avatar inside the circle). */
function BgArt({ bg, size }: { bg: number; size: number }) {
  const i = bg % BGS.length;
  if (i < 6) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }}>
      {i === 6 && <G>
        <Defs><LinearGradient id="kns-sunrise" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FF9F43" /><Stop offset="0.6" stopColor="#FFD8A8" /><Stop offset="1" stopColor="#FFF4D1" /></LinearGradient></Defs>
        <Rect width="100" height="100" fill="url(#kns-sunrise)" />
        <Circle cx="50" cy="70" r="26" fill="#FFD43B" opacity={0.7} />
        <Path d="M0 74q25-10 50 0t50 0V100H0z" fill="#51CF66" opacity={0.55} />
      </G>}
      {i === 7 && <G><Rect width="100" height="50" fill="#00209F" /><Rect y="50" width="100" height="50" fill="#D21034" /></G>}
      {i === 8 && <G>
        <Rect width="100" height="100" fill="#1B2A55" />
        {[[16, 20, 2.2], [78, 14, 1.6], [30, 42, 1.4], [86, 46, 2.4], [60, 24, 1.2], [12, 64, 1.6], [90, 74, 1.4]].map(([x, y, r], k) => <Circle key={k} cx={x} cy={y} r={r} fill="#FFF4D1" />)}
        <Path d="M70 10a9 9 0 1 0 9 13 7 7 0 1 1-9-13z" fill="#FFD43B" />
      </G>}
    </Svg>
  );
}

/** Rings drawn over the round badge (frame > 0). */
function FrameArt({ frame, size }: { frame: number; size: number }) {
  const sw = Math.max(3, size / 14);
  const r = size / 2 - sw / 2;
  const c = size / 2;
  const ink = <Circle cx={c} cy={c} r={size / 2 - 1} fill="none" stroke={INK} strokeWidth={Math.max(1.5, size / 60)} />;
  const arc = (from: number, to: number) => {
    const p = (a: number) => `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`;
    return `M ${p(from)} A ${r} ${r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${p(to)}`;
  };
  return (
    <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      {frame === 1 && <Circle cx={c} cy={c} r={r} fill="none" stroke="#C3CCDB" strokeWidth={sw} />}
      {frame === 2 && <G><Circle cx={c} cy={c} r={r} fill="none" stroke="#F5B700" strokeWidth={sw} /><Circle cx={c} cy={c} r={r} fill="none" stroke="#FFE58A" strokeWidth={sw / 3} strokeDasharray={`${sw * 0.8} ${sw * 1.6}`} /></G>}
      {frame === 3 && <G><Path d={arc(Math.PI, 2 * Math.PI)} fill="none" stroke="#00209F" strokeWidth={sw} /><Path d={arc(0, Math.PI)} fill="none" stroke="#D21034" strokeWidth={sw} /></G>}
      {frame === 4 && <G><Circle cx={c} cy={c} r={r} fill="none" stroke="#7048E8" strokeWidth={sw} /><Circle cx={c} cy={c} r={r - sw / 2 + 1} fill="none" stroke="#FFD43B" strokeWidth={Math.max(1.5, sw / 3)} />{[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = (k / 8) * Math.PI * 2 - Math.PI / 2; return <Circle key={k} cx={c + r * Math.cos(a)} cy={c + r * Math.sin(a)} r={sw / 4} fill="#FFD43B" />; })}</G>}
      {ink}
    </Svg>
  );
}

/** Round avatar badge. `live` adds the idle bob + blink. `ring={false}` hides the outline and any frame. */
type AvatarProps = { a: AvatarConfig; size?: number; live?: boolean; ring?: boolean; style?: StyleProp<ViewStyle> };
export function Avatar(p: AvatarProps) { return p.live ? <LiveAvatar {...p} /> : <AvatarBadge {...p} />; }
function LiveAvatar(p: AvatarProps) {
  const blink = useBlink();
  return <Bob amount={Math.max(2, (p.size ?? 48) / 40)}><AvatarBadge {...p} blink={blink} /></Bob>;
}
function AvatarBadge({ a, size = 48, ring = true, style, blink }: AvatarProps & { blink?: boolean }) {
  const frame = ring ? (a.frame ?? 0) % FRAMES.length : 0;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: BGS[a.bg % BGS.length], borderWidth: ring && !frame ? Math.max(2, size / 40) : 0, borderColor: INK, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
        <BgArt bg={a.bg} size={size} />
        <AvatarArt a={a} size={size * (frame ? 0.88 : 0.94)} blink={blink} />
      </View>
      {frame > 0 && <FrameArt frame={frame} size={size} />}
    </View>
  );
}
