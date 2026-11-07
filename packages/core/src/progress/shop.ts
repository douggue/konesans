/**
 * Boutik — avatar items bought with coins (kòb). These are extra items on top of the ones ranks / streaks /
 * trophies unlock (progress/ranks.ts). Ids use the same "kind:value" form as unlocks, and the app keeps the ids
 * bought in its own list (saved in the cloud as a union, so an item bought is never lost).
 *
 * Prices follow the earning rate: a normal day of play (a few activities + the daily chest) gives about
 * 100–150 coins, so a first item takes about a day and the whole shop a few weeks.
 */
import type { UnlockKind } from './ranks.js';

export interface ShopItem { id: string; kind: UnlockKind; value: string | number; price: number }

const s = (kind: UnlockKind, value: string | number, price: number): ShopItem => ({ id: `${kind}:${value}`, kind, value, price });

export const SHOP_ITEMS: ShopItem[] = [
  // hair colours (avatar.tsx HAIR_COLORS 8, 9)
  s('hairColor', 8, 60), s('hairColor', 9, 60),
  // shirts (SHIRTS 9 madras, 10 kanaval, 11 football)
  s('shirt', 9, 120), s('shirt', 10, 150), s('shirt', 11, 120),
  // accessories
  s('extra', 'bowtie', 100), s('extra', 'catears', 150), s('extra', 'headwrap', 180),
  // backgrounds (BGS 9 beach, 10 mountains, 11 carnival)
  s('bg', 9, 180), s('bg', 10, 180), s('bg', 11, 220),
  // rings (FRAMES 5 rainbow, 6 hibiscus)
  s('frame', 5, 300), s('frame', 6, 350),
];

export const shopItemFor = (kind: UnlockKind, value: string | number): ShopItem | undefined => SHOP_ITEMS.find((x) => x.kind === kind && x.value === value);
export const shopItemById = (id: string): ShopItem | undefined => SHOP_ITEMS.find((x) => x.id === id);

/**
 * Buy an item: returns the new coin count and owned list, or why it can't be bought.
 * Pure: the app applies the result to its store.
 */
export function buyShopItem(coins: number, bought: readonly string[], id: string):
  | { ok: true; coins: number; bought: string[]; item: ShopItem }
  | { ok: false; reason: 'unknown' | 'owned' | 'coins' } {
  const item = shopItemById(id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (bought.includes(id)) return { ok: false, reason: 'owned' };
  if (coins < item.price) return { ok: false, reason: 'coins' };
  return { ok: true, coins: coins - item.price, bought: [...bought, id], item };
}
