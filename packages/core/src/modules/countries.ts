import { hasShape } from '../content/shapes.js';
import { type GenModule, pick, q, ht, shuffleArr } from './base.js';

import { WORLD, REGIONS, type WorldCountry, type WorldRegion as Region, type Tier } from '../content/world.js';
import { shuffle, rng } from '../quiz/engine.js';
import type { AgeBand, Question } from '../types.js';

/** All 197 countries live in content/world.ts (Kreyòl names, capitals, regions, tiers). */
export type Country = WorldCountry;
export type Continent = Region;
export const COUNTRIES: Country[] = WORLD;

const byContinent = (c: Continent) => COUNTRIES.filter((x) => x.continent === c);
const AGE_POOL = { '6-8': ['Karayib', 'Amerik di Nò'] as Continent[], '9-11': ['Karayib', 'Amerik di Nò', 'Amerik di Sid', 'Ewòp'] as Continent[], '12-14': ['Karayib', 'Amerik di Nò', 'Amerik di Sid', 'Ewòp', 'Afrik', 'Azi', 'Oseyani'] as Continent[] };

const AGE_TIER: Record<keyof typeof AGE_POOL, Tier> = { '6-8': 1, '9-11': 2, '12-14': 3 };
function pickCountry(age: keyof typeof AGE_POOL, rand: () => number, filter: (c: Country) => boolean = () => true) {
  const pool = COUNTRIES.filter((c) => AGE_POOL[age].includes(c.continent) && c.tier <= AGE_TIER[age] && filter(c));
  return pick(rand, pool.length ? pool : COUNTRIES.filter(filter));
}
/** Distractors from the same continent when possible (harder), else anywhere. */
function distractors(c: Country, n: number, rand: () => number, key: keyof Country) {
  const same = byContinent(c.continent).filter((x) => x.iso !== c.iso && x[key] !== c[key]);
  const others = COUNTRIES.filter((x) => x.iso !== c.iso && x[key] !== c[key]);
  const src = same.length >= n ? same : others;
  const out = new Set<string>();
  for (const x of shuffleArr(src, rand)) { if (out.size >= n) break; out.add(String(x[key])); }
  return [...out];
}

export const capitals: GenModule = {
  id: 'kapital', name: { ht: 'Kapital yo', fr: 'Capitales' }, category: 'peyi', ages: ['6-8', '9-11', '12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand);
    if (rand() < 0.5) return q(this, age, rand, ht(`Ki kapital ${c.name}?`), [c.capital, ...distractors(c, 3, rand, 'capital')], c.capital, `${c.capital} se kapital ${c.name}.`, { kind: 'flag', ref: c.iso });
    return q(this, age, rand, ht(`${c.capital} se kapital ki peyi?`), [c.name, ...distractors(c, 3, rand, 'name')], c.name);
  },
};

export const flags: GenModule = {
  id: 'drapo', name: { ht: 'Drapo yo', fr: 'Drapeaux' }, category: 'peyi', ages: ['6-8', '9-11', '12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand);
    return q(this, age, rand, ht('Ki peyi drapo sa a ye?'), [c.name, ...distractors(c, 3, rand, 'name')], c.name, undefined, { kind: 'flag', ref: c.iso });
  },
};

export const shapes: GenModule = {
  id: 'fom', name: { ht: 'Fòm peyi', fr: 'Formes des pays' }, category: 'peyi', ages: ['6-8', '9-11', '12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand, (x) => hasShape(x.iso)); // only countries we have an outline for
    return q(this, age, rand, ht('Ki peyi sa a?'), [c.name, ...distractors(c, 3, rand, 'name')], c.name, undefined, { kind: 'shape', ref: c.iso });
  },
};

export const continents: GenModule = {
  id: 'kontinan', name: { ht: 'Peyi ak kontinan', fr: 'Pays et continents' }, category: 'jewografi', ages: ['9-11', '12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand);
    const all: Continent[] = ['Amerik di Nò', 'Karayib', 'Amerik di Sid', 'Ewòp', 'Afrik', 'Azi', 'Oseyani'];
    return q(this, age, rand, ht(`Nan ki kontinan ${c.name} ye?`), [c.continent, ...shuffleArr(all.filter((x) => x !== c.continent), rand).slice(0, 3)], c.continent);
  },
};

export const currencies: GenModule = {
  id: 'lajan-peyi', name: { ht: 'Lajan peyi yo', fr: 'Monnaies' }, category: 'jewografi', ages: ['12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand);
    return q(this, age, rand, ht(`Ki lajan yo itilize nan ${c.name}?`), [c.currency, ...distractors(c, 3, rand, 'currency')], c.currency);
  },
};

export const languages: GenModule = {
  id: 'lang-peyi', name: { ht: 'Lang peyi yo', fr: 'Langues' }, category: 'jewografi', ages: ['9-11', '12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand);
    const lang = c.langs[0];
    const others = [...new Set(COUNTRIES.flatMap((x) => x.langs))].filter((l) => !c.langs.includes(l));
    return q(this, age, rand, ht(`Ki lang yo pale nan ${c.name}?`), [lang, ...shuffleArr(others, rand).slice(0, 3)], lang);
  },
};

/** Pi gwo peyi? — two shapes side by side; the app draws both from the shapes pack. */
export const bigger: GenModule = {
  id: 'pi-gwo', name: { ht: 'Ki peyi ki pi gwo?', fr: 'Quel pays est le plus grand ?' }, category: 'jewografi', ages: ['9-11', '12-14'],
  generate(age, rand) {
    const a = pickCountry(age, rand); let b = pickCountry(age, rand);
    let guard = 0;
    while ((b.iso === a.iso || Math.max(a.areaKm2, b.areaKm2) / Math.min(a.areaKm2, b.areaKm2) < 1.3) && guard++ < 20) b = pickCountry(age, rand);
    if (b.iso === a.iso) return this.generate(age, rand);
    const big = a.areaKm2 > b.areaKm2 ? a : b;
    return q(this, age, rand, ht(`Ki peyi ki pi gwo: ${a.name} oswa ${b.name}?`), [a.name, b.name], big.name, `${big.name}: ${big.areaKm2.toLocaleString('fr-FR')} km².`, { kind: 'shape', ref: `${a.iso},${b.iso}` });
  },
};

export const COUNTRY_MODULES: GenModule[] = [capitals, flags, shapes, continents, currencies, languages, bigger];

// ─── Peyi quiz with options (mode × level × region) ──────────────────────────

export type CountryMode = 'drapo' | 'kapital' | 'fom';
export type CountryLevel = 1 | 2 | 3;
export interface CountryQuizOptions { mode: CountryMode; level: CountryLevel; region: Region | 'mond' }

export const flagEmoji = (iso: string) => iso.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));

/** Countries available for a mode/level/region. Level = max tier (1 famous … 3 everything). */
export function countryPool(o: CountryQuizOptions): Country[] {
  const inRegion = (c: Country) => o.region === 'mond' || c.continent === o.region;
  const usable = (c: Country) => o.mode !== 'fom' || hasShape(c.iso);
  let tier: number = o.level;
  let pool = COUNTRIES.filter((c) => inRegion(c) && usable(c) && c.tier <= tier);
  while (pool.length < 4 && tier < 3) { tier++; pool = COUNTRIES.filter((c) => inRegion(c) && usable(c) && c.tier <= tier); } // small regions open the next tier
  return pool;
}

function pickDistractors(c: Country, pool: Country[], o: CountryQuizOptions, key: keyof Country, rand: () => number, n = 3): string[] {
  // level 1: easy — other famous countries, often from other continents; level 2–3: same continent first
  const notSame = (x: Country) => x.iso !== c.iso && x[key] !== c[key];
  const world = COUNTRIES.filter((x) => notSame(x) && x.tier <= Math.max(o.level, 1));
  const same = pool.filter((x) => notSame(x) && x.continent === c.continent);
  const src = o.level === 1 ? shuffle(world.filter((x) => x.tier === 1), rand) : [...shuffle(same, rand), ...shuffle(world, rand)];
  const out: string[] = [];
  for (const x of src) { const v = String(x[key]); if (!out.includes(v)) out.push(v); if (out.length === n) break; }
  return out;
}

/**
 * Build a Peyi set for the chosen mode, level and region. Deterministic per (seed, avoid).
 * - Each country appears at most once per game (no "same flag twice").
 * - Small pools borrow harder countries from the same region before the set gets shorter.
 * - `avoid` = countries asked recently: they come last, so a replay brings new ones first.
 */
export function generateCountryQuiz(o: CountryQuizOptions, age: AgeBand, count: number, seed: number, avoid: readonly string[] = []): Question[] {
  const rand = rng(seed);
  let pool = countryPool(o);
  for (let tier = o.level + 1; pool.length < count && tier <= 3; tier++) {
    const more = countryPool({ ...o, level: tier as CountryQuizOptions['level'] }).filter((c) => !pool.some((p) => p.iso === c.iso));
    pool = [...pool, ...more];
  }
  const mod = o.mode === 'drapo' ? flags : o.mode === 'kapital' ? capitals : shapes;
  const recent = new Set(avoid);
  // fresh countries first (shuffled), then the recently asked ones (also shuffled)
  const order = [...shuffle(pool.filter((c) => !recent.has(c.iso)), rand), ...shuffle(pool.filter((c) => recent.has(c.iso)), rand)];
  const picks = order.slice(0, Math.min(count, order.length));
  const reverseOk = o.level >= 2;
  const out: Question[] = [];
  for (const c of picks) {
    let qq: Question;
    if (o.mode === 'drapo') {
      if (reverseOk && rand() < 0.4) {
        // reverse: name → pick the flag (options are flags)
        const ds = pickDistractors(c, pool, o, 'iso', rand);
        qq = q(mod, age, rand, ht(`Ki drapo ${c.name}?`), [flagEmoji(c.iso), ...ds.map(flagEmoji)], flagEmoji(c.iso));
      } else {
        qq = q(mod, age, rand, ht('Ki peyi drapo sa a ye?'), [c.name, ...pickDistractors(c, pool, o, 'name', rand)], c.name, undefined, { kind: 'flag', ref: c.iso });
      }
    } else if (o.mode === 'kapital') {
      if (reverseOk && rand() < 0.5) qq = q(mod, age, rand, ht(`${c.capital} se kapital ki peyi?`), [c.name, ...pickDistractors(c, pool, o, 'name', rand)], c.name);
      else qq = q(mod, age, rand, ht(`Ki kapital ${c.name}?`), [c.capital, ...pickDistractors(c, pool, o, 'capital', rand)], c.capital, `${c.capital} se kapital ${c.name}.`, o.level === 1 ? { kind: 'flag', ref: c.iso } : undefined);
    } else {
      qq = q(mod, age, rand, ht('Ki peyi sa a?'), [c.name, ...pickDistractors(c, pool, o, 'name', rand)], c.name, undefined, { kind: 'shape', ref: c.iso });
    }
    out.push({ ...qq, id: `peyi:${o.mode}:${c.iso}:${seed.toString(36)}` });
  }
  return out;
}

/** The country a Peyi question is about (for "recently asked"). */
export const peyiIso = (questionId: string) => questionId.startsWith('peyi:') ? questionId.split(':')[2] : null;

export const REGION_LABEL: Record<Region | 'mond', { ht: string; fr: string; emoji: string }> = {
  mond: { ht: 'Tout mond lan', fr: 'Le monde entier', emoji: '🌍' },
  'Karayib': { ht: 'Karayib', fr: 'Caraïbes', emoji: '🏝️' },
  'Amerik di Nò': { ht: 'Amerik di Nò', fr: 'Amérique du Nord', emoji: '🌎' },
  'Amerik di Sid': { ht: 'Amerik di Sid', fr: 'Amérique du Sud', emoji: '🦜' },
  'Ewòp': { ht: 'Ewòp', fr: 'Europe', emoji: '🏰' },
  'Afrik': { ht: 'Afrik', fr: 'Afrique', emoji: '🦁' },
  'Azi': { ht: 'Azi', fr: 'Asie', emoji: '🐼' },
  'Oseyani': { ht: 'Oseyani', fr: 'Océanie', emoji: '🦘' },
};
export { REGIONS };
