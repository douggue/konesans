/**
 * Ranks: named steps on the level ladder (Ti Grenn → … → Lejand), and the avatar items each one unlocks.
 * Pure functions; the app keeps the set of items already unlocked so nothing ever locks again
 * (e.g. when a streak breaks).
 */
import type { AvatarConfig } from '../types.js';
import { levelFromXp, xpForLevel } from './xp.js';
import { shopItemFor } from './shop.js';

export interface RankDef {
  id: string;
  /** first level of this rank */
  level: number;
  name: { ht: string; fr: string };
  /** badge colour, darker edge, soft tint */
  color: string; edge: string; soft: string;
}

export const RANKS: RankDef[] = [
  { id: 'grenn', level: 1, name: { ht: 'Ti Grenn', fr: 'Petite Graine' }, color: '#B5651D', edge: '#7A4212', soft: '#FFF0E0' },
  { id: 'pous', level: 3, name: { ht: 'Ti Pous', fr: 'Jeune Pousse' }, color: '#51CF66', edge: '#2F9E44', soft: '#E3F4EA' },
  { id: 'zwazo', level: 5, name: { ht: 'Ti Zwazo', fr: 'Petit Oiseau' }, color: '#4D7CFE', edge: '#1F47B5', soft: '#E6ECFB' },
  { id: 'eksplo', level: 8, name: { ht: 'Eksploratè', fr: 'Explorateur' }, color: '#0E7C86', edge: '#0A5A61', soft: '#DDF3F4' },
  { id: 'malfini', level: 11, name: { ht: 'Malfini', fr: 'Malfini' }, color: '#FF9F43', edge: '#C76A12', soft: '#FFF0E0' },
  { id: 'mapou', level: 15, name: { ht: 'Mapou', fr: 'Mapou' }, color: '#2F9E44', edge: '#1D6B2D', soft: '#E3F4EA' },
  { id: 'sitadel', level: 20, name: { ht: 'Sitadèl', fr: 'Citadelle' }, color: '#D21034', edge: '#8F0A22', soft: '#FDE7EC' },
  { id: 'zetwal', level: 25, name: { ht: 'Zetwal', fr: 'Étoile' }, color: '#F5B700', edge: '#A67C00', soft: '#FFF4D1' },
  { id: 'met', level: 32, name: { ht: 'Mèt Konesans', fr: 'Maître du savoir' }, color: '#7048E8', edge: '#3B1E9C', soft: '#EDE7FF' },
  { id: 'lejand', level: 40, name: { ht: 'Lejand', fr: 'Légende' }, color: '#14213D', edge: '#000000', soft: '#FFF4D1' },
];

export interface RankInfo {
  index: number;
  rank: RankDef;
  next: RankDef | null;
  level: number;
  /** 0→1 progress from this rank's first XP to the next rank's first XP (1 at the top rank) */
  progress: number;
  /** XP still needed for the next rank (0 at the top) */
  xpToNext: number;
}

export const rankIndexForLevel = (level: number) => {
  let i = 0;
  while (i + 1 < RANKS.length && RANKS[i + 1].level <= level) i++;
  return i;
};

export function rankForXp(xp: number): RankInfo {
  const { level } = levelFromXp(Math.max(0, xp));
  const index = rankIndexForLevel(level);
  const rank = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  if (!next) return { index, rank, next, level, progress: 1, xpToNext: 0 };
  const from = xpForLevel(rank.level), to = xpForLevel(next.level);
  return { index, rank, next, level, progress: Math.max(0, Math.min(1, (xp - from) / (to - from))), xpToNext: Math.max(0, to - xp) };
}

// ─── Unlockable avatar items ────────────────────────────────────────────────

export type UnlockKind = 'hair' | 'extra' | 'hairColor' | 'shirt' | 'bg' | 'frame';
export type UnlockReq = { rank: number } | { streak: number } | { badges: number };
export interface UnlockDef { id: string; kind: UnlockKind; value: string | number; req: UnlockReq }

/** Free from the start (everything the first avatar builder had). Anything not listed in UNLOCKS is free too. */
const u = (kind: UnlockKind, value: string | number, req: UnlockReq): UnlockDef => ({ id: `${kind}:${value}`, kind, value, req });

export const UNLOCKS: UnlockDef[] = [
  u('hairColor', 5, { rank: 1 }), u('shirt', 6, { rank: 1 }),
  u('hair', 'bun', { rank: 2 }), u('bg', 6, { rank: 2 }),
  u('extra', 'headphones', { rank: 3 }), u('frame', 1, { rank: 3 }),
  u('hair', 'mohawk', { rank: 4 }), u('hairColor', 6, { rank: 4 }), u('shirt', 7, { rank: 4 }),
  u('extra', 'strawhat', { rank: 5 }), u('bg', 7, { rank: 5 }),
  u('hair', 'locs', { rank: 6 }), u('frame', 2, { rank: 6 }),
  u('extra', 'shades', { rank: 7 }), u('bg', 8, { rank: 7 }),
  u('shirt', 8, { rank: 8 }),
  u('extra', 'crown', { rank: 9 }), u('frame', 4, { rank: 9 }),
  u('extra', 'flower', { streak: 7 }), u('frame', 3, { streak: 30 }),
  u('hairColor', 7, { badges: 3 }),
];

export const unlockId = (kind: UnlockKind, value: string | number) => `${kind}:${value}`;
export const unlockFor = (kind: UnlockKind, value: string | number): UnlockDef | undefined => UNLOCKS.find((x) => x.kind === kind && x.value === value);

export interface UnlockCtx { xp: number; streak: number; badges: number }

export function reqMet(req: UnlockReq, c: UnlockCtx): boolean {
  if ('rank' in req) return rankForXp(c.xp).index >= req.rank;
  if ('streak' in req) return c.streak >= req.streak;
  return c.badges >= req.badges;
}

/** Ids of every gated item whose condition is met right now. */
export const unlocksEarned = (c: UnlockCtx): string[] => UNLOCKS.filter((x) => reqMet(x.req, c)).map((x) => x.id);

/** Items a rank unlocks (for the rank list and the rank-up moment). */
export const rankUnlocks = (rankIndex: number): UnlockDef[] => UNLOCKS.filter((x) => 'rank' in x.req && x.req.rank === rankIndex);

/**
 * Is this avatar value free, unlocked or bought? `owned` = ids the app has recorded as unlocked plus the shop items
 * bought (progress/shop.ts): a shop item is open only once bought.
 */
export function isItemOpen(kind: UnlockKind, value: string | number, owned: readonly string[], c?: UnlockCtx): boolean {
  const sold = shopItemFor(kind, value);
  if (sold) return owned.includes(sold.id);
  const def = unlockFor(kind, value);
  if (!def) return true;
  return owned.includes(def.id) || (!!c && reqMet(def.req, c));
}

/** Replace any locked part of an avatar with a free default (e.g. a value restored from an old backup). */
export function lockSafeAvatar(a: AvatarConfig, owned: readonly string[], c?: UnlockCtx): AvatarConfig {
  const open = (k: UnlockKind, v: string | number) => isItemOpen(k, v, owned, c);
  return {
    ...a,
    hair: open('hair', a.hair) ? a.hair : 'afro',
    extra: open('extra', a.extra) ? a.extra : 'none',
    hairColor: open('hairColor', a.hairColor) ? a.hairColor : 0,
    shirt: open('shirt', a.shirt) ? a.shirt : 1,
    bg: open('bg', a.bg) ? a.bg : 0,
    frame: a.frame === undefined || open('frame', a.frame) ? a.frame : 0,
  };
}
