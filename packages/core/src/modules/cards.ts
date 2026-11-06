/**
 * Kat Ewo — which card a kid wins.
 *  - drawCard: after a finished defi (duel or category quiz). Always a card the kid does not have yet while any
 *    is left (rarity picked by weight among the rarities still missing); once the set is complete, a duplicate
 *    that turns into coins.
 *  - grantLegendCard: weekly-mission reward. Always an unowned Lejand card if one is left, otherwise a normal draw.
 * Pure functions: pass the owned ids and a random source (core `rng(seed)` or Math.random).
 */
import { HERO_CARDS, type CardRarity, type HeroCard } from '../content/cards.js';

export * from '../content/cards.js';

/** Chance of each rarity on a normal draw (renormalised over the rarities that can still be drawn). */
export const CARD_WEIGHTS: Record<CardRarity, number> = { komen: 62, ra: 30, lejand: 8 };
/** Coins a duplicate turns into. */
export const DUPLICATE_COINS: Record<CardRarity, number> = { komen: 10, ra: 20, lejand: 40 };
export const RARITY_ORDER: CardRarity[] = ['komen', 'ra', 'lejand'];

export interface CardDraw {
  card: HeroCard;
  /** true when the kid did not own it before */
  isNew: boolean;
  /** coins for a duplicate (0 for a new card) */
  coins: number;
}

export interface DrawOptions {
  weights?: Partial<Record<CardRarity, number>>;
  /** the card set to draw from (defaults to HERO_CARDS) */
  cards?: HeroCard[];
}

export const cardById = (id: string, cards: HeroCard[] = HERO_CARDS): HeroCard | undefined => cards.find((c) => c.id === id);

/** Owned / total for the header pill ("7 / 20"). Unknown ids (e.g. a removed card) are not counted. */
export function cardProgress(owned: readonly string[], cards: HeroCard[] = HERO_CARDS) {
  const set = new Set(owned);
  return { owned: cards.filter((c) => set.has(c.id)).length, total: cards.length };
}

function pickRarity(available: CardRarity[], weights: Record<CardRarity, number>, rand: () => number): CardRarity {
  const total = available.reduce((s, r) => s + Math.max(0, weights[r]), 0);
  if (total <= 0) return available[Math.floor(rand() * available.length) % available.length];
  let x = rand() * total;
  for (const r of available) {
    x -= Math.max(0, weights[r]);
    if (x < 0) return r;
  }
  return available[available.length - 1];
}
const pickOne = <T>(list: T[], rand: () => number): T => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];

/** The card won after a finished defi. */
export function drawCard(owned: readonly string[], rand: () => number, opts: DrawOptions = {}): CardDraw {
  const cards = opts.cards ?? HERO_CARDS;
  if (!cards.length) throw new Error('drawCard: empty card set');
  const weights = { ...CARD_WEIGHTS, ...opts.weights };
  const have = new Set(owned);
  const unowned = cards.filter((c) => !have.has(c.id));
  const pool = unowned.length ? unowned : cards;
  const rarities = RARITY_ORDER.filter((r) => pool.some((c) => c.rarity === r));
  const rarity = pickRarity(rarities, weights, rand);
  const card = pickOne(pool.filter((c) => c.rarity === rarity), rand);
  return unowned.length ? { card, isNew: true, coins: 0 } : { card, isNew: false, coins: DUPLICATE_COINS[card.rarity] };
}

/** Weekly-mission reward: an unowned Lejand card if any is left, otherwise the same as drawCard. */
export function grantLegendCard(owned: readonly string[], rand: () => number, opts: DrawOptions = {}): CardDraw {
  const cards = opts.cards ?? HERO_CARDS;
  const have = new Set(owned);
  const legends = cards.filter((c) => c.rarity === 'lejand' && !have.has(c.id));
  if (legends.length) return { card: pickOne(legends, rand), isNew: true, coins: 0 };
  return drawCard(owned, rand, opts);
}
