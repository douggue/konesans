/**
 * Pricing rule: free in Haiti, paid in the diaspora. Each paid subscription sponsors kids in Haiti.
 * Region is decided server-side from (in order): MonCash/NatCash account, Haitian phone number (+509),
 * store country (Play/App Store), then IP. The client never decides its own price.
 */
export type Region = 'HT' | 'DIASPORA';

export interface Plan { id: string; label: string; usd: number; months: number; kids: number; sponsors: number }

export const PLANS: Plan[] = [
  { id: 'solo_m', label: '1 timoun · chak mwa', usd: 4.99, months: 1, kids: 1, sponsors: 5 },
  { id: 'fanmi_m', label: 'Fanmi · 3 timoun · chak mwa', usd: 9.99, months: 1, kids: 3, sponsors: 10 },
  { id: 'solo_y', label: '1 an · 1 timoun', usd: 39, months: 12, kids: 1, sponsors: 5 },
];

export interface Entitlement { full: boolean; reason: 'haiti_free' | 'subscription' | 'gift_code' | 'sponsored' | 'none'; until?: string }

export function entitlementFor(region: Region, sub?: { planId: string; until: string } | null, giftUntil?: string | null, now = Date.now()): Entitlement {
  if (region === 'HT') return { full: true, reason: 'haiti_free' };
  if (sub && Date.parse(sub.until) > now) return { full: true, reason: 'subscription', until: sub.until };
  if (giftUntil && Date.parse(giftUntil) > now) return { full: true, reason: 'gift_code', until: giftUntil };
  return { full: false, reason: 'none' };
}

/** Free tier outside Haiti: daily challenge, first unit of each course, 3 duels/day. */
export const FREE_TIER = { dailyChallenge: true, courseUnits: 1, duelsPerDay: 3, generatedModules: true };

/** Detect region from signals the server has. Any Haiti signal wins. */
export function detectRegion(s: { phoneCountry?: string; storeCountry?: string; ipCountry?: string; hasMonCash?: boolean }): Region {
  if (s.hasMonCash || s.phoneCountry === 'HT' || s.storeCountry === 'HT' || s.ipCountry === 'HT') return 'HT';
  return 'DIASPORA';
}

/** Gift codes: KNS-XXXX-XX, 90 days, single use. */
export function makeGiftCode(rand: () => number): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n: number) => Array.from({ length: n }, () => A[Math.floor(rand() * A.length)]).join('');
  return `KNS-${pick(4)}-${pick(2)}`;
}
export const isGiftCode = (s: string) => /^KNS-[A-Z2-9]{4}-[A-Z2-9]{2}$/.test(s);
export const GIFT_DAYS = 90;
