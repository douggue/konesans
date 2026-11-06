import { describe, it, expect } from 'vitest';
import { HERO_CARDS, drawCard, grantLegendCard, cardProgress, cardById, CARD_WEIGHTS, DUPLICATE_COINS, type HeroCard } from '../src/modules/cards.js';
import { rng } from '../src/quiz/engine.js';

const ids = (f: (c: HeroCard) => boolean = () => true) => HERO_CARDS.filter(f).map((c) => c.id);

describe('Kat Ewo content', () => {
  it('has 18–24 heroes with unique ids, initials and colours', () => {
    expect(HERO_CARDS.length).toBeGreaterThanOrEqual(18);
    expect(HERO_CARDS.length).toBeLessThanOrEqual(24);
    for (const key of ['id', 'mono', 'name'] as const) expect(new Set(HERO_CARDS.map((c) => c[key])).size).toBe(HERO_CARDS.length);
  });
  it('every card is complete in Kreyòl and French', () => {
    for (const c of HERO_CARDS) {
      expect(c.mono).toMatch(/^[A-Z]{2,3}$/);
      expect(c.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(c.short.length).toBeLessThanOrEqual(18);
      expect(c.facts).toHaveLength(3);
      for (const t of [c.years, c.role, c.why, ...c.facts]) {
        expect(t.ht.trim().length, `${c.id} ht`).toBeGreaterThan(2);
        expect(t.fr?.trim().length ?? 0, `${c.id} fr`).toBeGreaterThan(2);
        expect(t.ht.length, `${c.id} too long`).toBeLessThanOrEqual(130);
      }
    }
  });
  it('mixes men and women, eras and all three rarities', () => {
    expect(ids((c) => c.woman).length).toBeGreaterThanOrEqual(5);
    expect(ids((c) => c.era === 'rev').length).toBeGreaterThanOrEqual(6);
    expect(ids((c) => c.era === 'apre').length).toBeGreaterThanOrEqual(6);
    const legends = ids((c) => c.rarity === 'lejand').length;
    expect(legends).toBeGreaterThanOrEqual(3);
    expect(legends).toBeLessThanOrEqual(6);
    expect(ids((c) => c.rarity === 'ra').length).toBeGreaterThan(0);
    expect(ids((c) => c.rarity === 'komen').length).toBeGreaterThan(0);
  });
  it('white text stays readable on every card colour', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const c of HERO_CARDS) expect(1.05 / (lum(c.color) + 0.05), c.id).toBeGreaterThanOrEqual(3); // large bold text
  });
});

describe('drawCard', () => {
  it('always gives a card the kid does not have while any is left', () => {
    const rand = rng(7);
    let owned: string[] = [];
    for (let i = 0; i < HERO_CARDS.length; i++) {
      const d = drawCard(owned, rand);
      expect(d.isNew).toBe(true);
      expect(d.coins).toBe(0);
      expect(owned).not.toContain(d.card.id);
      owned = [...owned, d.card.id];
    }
    expect(cardProgress(owned)).toEqual({ owned: HERO_CARDS.length, total: HERO_CARDS.length });
  });
  it('turns a duplicate into coins once the collection is complete', () => {
    const d = drawCard(ids(), rng(3));
    expect(d.isNew).toBe(false);
    expect(d.coins).toBe(DUPLICATE_COINS[d.card.rarity]);
    expect(d.coins).toBeGreaterThan(0);
  });
  it('follows the rarity weights', () => {
    const rand = rng(42);
    const n = 6000;
    const count = { komen: 0, ra: 0, lejand: 0 };
    for (let i = 0; i < n; i++) count[drawCard([], rand).card.rarity]++;
    const total = CARD_WEIGHTS.komen + CARD_WEIGHTS.ra + CARD_WEIGHTS.lejand;
    for (const r of ['komen', 'ra', 'lejand'] as const) expect(Math.abs(count[r] / n - CARD_WEIGHTS[r] / total)).toBeLessThan(0.03);
  });
  it('renormalises over the rarities still missing', () => {
    const left = HERO_CARDS.find((c) => c.rarity === 'lejand')!;
    const owned = ids((c) => c.id !== left.id);
    for (let s = 1; s < 30; s++) expect(drawCard(owned, rng(s)).card.id).toBe(left.id);
  });
  it('is deterministic for a seeded random source and honours custom weights', () => {
    expect(drawCard(['dessalines'], rng(9)).card.id).toBe(drawCard(['dessalines'], rng(9)).card.id);
    for (let s = 1; s < 30; s++) expect(drawCard([], rng(s), { weights: { komen: 0, ra: 0, lejand: 1 } }).card.rarity).toBe('lejand');
  });
  it('ignores unknown owned ids', () => {
    expect(cardProgress(['nope', 'dessalines']).owned).toBe(1);
    expect(drawCard(['nope'], rng(1)).isNew).toBe(true);
  });
});

describe('grantLegendCard', () => {
  it('gives an unowned Lejand card while any is left', () => {
    const legends = ids((c) => c.rarity === 'lejand');
    let owned = ids((c) => c.rarity !== 'lejand');
    for (let i = 0; i < legends.length; i++) {
      const d = grantLegendCard(owned, rng(i + 1));
      expect(d.card.rarity).toBe('lejand');
      expect(d.isNew).toBe(true);
      expect(owned).not.toContain(d.card.id);
      owned = [...owned, d.card.id];
    }
  });
  it('falls back to a normal draw when every Lejand is owned', () => {
    const owned = ids((c) => c.rarity === 'lejand');
    const d = grantLegendCard(owned, rng(5));
    expect(d.isNew).toBe(true);
    expect(d.card.rarity).not.toBe('lejand');
    const full = grantLegendCard(ids(), rng(5));
    expect(full.isNew).toBe(false);
    expect(full.coins).toBeGreaterThan(0);
  });
  it('cardById finds cards', () => {
    expect(cardById('toussaint')?.name).toBe('Toussaint Louverture');
    expect(cardById('x')).toBeUndefined();
  });
});
