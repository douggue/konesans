import { hasShape } from '../content/shapes.js';
import { type GenModule, pick, q, tx, shuffleArr } from './base.js';
import { LANG_FR } from '../content/world-fr.js';
import type { LocalizedText } from '../types.js';

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
/** A country's name / capital / currency in both languages (options and prompts). */
type Field = 'name' | 'capital' | 'currency';
const FR_FIELD = { name: 'nameFr', capital: 'capitalFr', currency: 'currencyFr' } as const;
export const both = (c: Country, f: Field): LocalizedText => ({ ht: c[f], fr: c[FR_FIELD[f]] });
const regionText = (r: Continent): LocalizedText => ({ ht: REGION_LABEL[r].ht, fr: REGION_LABEL[r].fr });
const langText = (l: string): LocalizedText => ({ ht: l, fr: LANG_FR[l] ?? l });

// ─── things that would make a second option also right ────────────────────────
/**
 * Flags a child cannot tell apart (same colours, same layout, or only a small emblem differs).
 * Two countries of the same group are never options of the same flag question.
 */
export const LOOKALIKE_FLAGS: string[][] = [
  ['TD', 'RO', 'AD', 'MD'], ['ID', 'MC', 'PL'], ['NL', 'LU'], ['ML', 'GN', 'SN', 'CM'], ['IE', 'CI', 'IT'], ['AU', 'NZ'],
  ['CO', 'EC', 'VE'], ['HN', 'NI', 'SV'], ['IN', 'NE'], ['SI', 'SK', 'RU'], ['NO', 'IS'], ['QA', 'BH'], ['JO', 'PS', 'SD'],
  ['KW', 'AE'], ['BE', 'DE'], ['GH', 'BO'], ['HT', 'LI'], ['CU', 'PR'], ['FR', 'NL'],
];
export const flagsLookAlike = (a: string, b: string) => a !== b && LOOKALIKE_FLAGS.some((g) => g.includes(a) && g.includes(b));

/**
 * Other languages that are official or spoken by most people in a country (the table keeps only the main one).
 * They are never offered as the "wrong" answer of "Ki lang yo pale nan …?".
 */
export const LANG_ALSO: Record<string, string[]> = {
  HT: ['Franse'], CA: ['Franse'], US: ['Panyòl'], BE: ['Olandè', 'Alman'], CH: ['Franse', 'Italyen'], LU: ['Franse', 'Alman'],
  AD: ['Franse', 'Panyòl'], MC: ['Italyen'], MT: ['Angle'], CY: ['Tik'], FI: ['Syedwa'], IE: ['Angle'],
  BY: ['Ris'], UA: ['Ris'], MD: ['Ris'], KZ: ['Ris'], KG: ['Ris'], TJ: ['Ris'], UZ: ['Ris'], TM: ['Ris'], AM: ['Ris'], GE: ['Ris'], AZ: ['Ris'],
  XK: ['Sèb'], BA: ['Sèb', 'Kwoat'], ME: ['Sèb'], MK: ['Albanè'], RS: ['Bosnyak'],
  IN: ['Angle'], PK: ['Angle'], PH: ['Angle'], SG: ['Chinwa', 'Malè', 'Endi'], MY: ['Angle'], BN: ['Angle'], LK: ['Angle'], BD: ['Angle'],
  IL: ['Arab'], PS: ['Ebre'], AF: ['Pèsan'], TL: ['Pòtigè'], HK: ['Angle'],
  MA: ['Franse'], DZ: ['Franse'], TN: ['Franse'], LB: ['Franse'], MR: ['Franse'], DJ: ['Arab'], TD: ['Arab'], KM: ['Arab', 'Franse'],
  CM: ['Angle'], RW: ['Franse', 'Angle', 'Swahili'], BI: ['Franse', 'Angle'], SC: ['Angle', 'Franse'], MU: ['Angle', 'Franse'], MG: ['Franse'],
  KE: ['Angle'], TZ: ['Angle'], UG: ['Swahili'], ZA: ['Angle'], NA: ['Alman'], SN: ['Franse'], ER: ['Arab', 'Angle'], SO: ['Arab'],
  SD: ['Angle'], SS: ['Arab'], LS: ['Angle'], SZ: ['Angle'], GQ: ['Franse', 'Pòtigè'], ET: ['Angle'],
  BZ: ['Panyòl'], PR: ['Angle'], FJ: ['Endi'], PG: ['Angle'], VU: ['Angle', 'Franse'], WS: ['Angle'], TO: ['Angle'], MH: ['Angle'],
  PW: ['Angle'], NR: ['Angle'], TV: ['Angle'], NZ: [], AU: [],
};
export const languagesOf = (c: Country): string[] => [...c.langs, ...(LANG_ALSO[c.iso] ?? [])];

/** Money also legal in a country (beside the one in the table). */
const CURRENCY_ALSO: Record<string, string[]> = { PA: ['Dola ameriken'], ZW: ['Dola ameriken'], KH: ['Dola ameriken'], SV: [], EC: [], ME: ['Ewo'], XK: ['Ewo'], LI: [], MC: [] };
/**
 * Two currency names that a child could both call right: the same word with or without a country
 * ("Dola" / "Dola ameriken", "Fran" / "Fran CFA", "Liv" / "Liv ejipsyen"), or money also legal there.
 */
export function currencyClash(c: Country, other: string): boolean {
  if (other === c.currency || (CURRENCY_ALSO[c.iso] ?? []).includes(other)) return true;
  return other.split(' ')[0].toLowerCase() === c.currency.split(' ')[0].toLowerCase();
}

/**
 * Regions that overlap: the Caribbean islands are part of North America (and some sit on South America's shelf),
 * so "Karayib" and "Amerik di Nò / di Sid" are never options of the same region question.
 */
const REGION_CLASH: Partial<Record<Continent, Continent[]>> = {
  'Karayib': ['Amerik di Nò', 'Amerik di Sid'], 'Amerik di Nò': ['Karayib'], 'Amerik di Sid': ['Karayib'],
};
export const regionsClash = (a: Continent, b: Continent) => a === b || !!REGION_CLASH[a]?.includes(b);

/** Could `x` also be a right answer when the question is about `c` (for this field)? */
function clashes(c: Country, x: Country, key: Field | 'iso', flag = false): boolean {
  if (x.iso === c.iso || (key !== 'iso' && x[key] === c[key])) return true;
  if (key === 'currency' && currencyClash(c, x.currency)) return true;
  if (flag && flagsLookAlike(c.iso, x.iso)) return true;
  return false;
}

/** Distractors from the same continent when possible (harder), else anywhere. */
function distractors(c: Country, n: number, rand: () => number, key: Field, flag = false): LocalizedText[] {
  const same = byContinent(c.continent).filter((x) => !clashes(c, x, key, flag));
  const others = COUNTRIES.filter((x) => !clashes(c, x, key, flag));
  const src = same.length >= n ? same : others;
  const out: LocalizedText[] = [];
  const picked: Country[] = [];
  for (const x of shuffleArr(src, rand)) {
    if (out.length >= n) break;
    if (out.some((o) => o.ht === x[key])) continue;
    if (flag && picked.some((p) => flagsLookAlike(p.iso, x.iso))) continue; // no two near-identical flags among the options at all
    picked.push(x); out.push(both(x, key));
  }
  return out;
}

export const capitals: GenModule = {
  id: 'kapital', name: { ht: 'Kapital yo', fr: 'Capitales' }, category: 'peyi', ages: ['6-8', '9-11', '12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand);
    if (rand() < 0.5) return q(this, age, rand, tx(`Ki kapital ${c.name}?`, `${c.nameFr} : quelle est sa capitale ?`), [both(c, 'capital'), ...distractors(c, 3, rand, 'capital')], both(c, 'capital'), tx(`${c.capital} se kapital ${c.name}.`, `${c.nameFr} : la capitale est ${c.capitalFr}.`), { kind: 'flag', ref: c.iso });
    return q(this, age, rand, tx(`${c.capital} se kapital ki peyi?`, `${c.capitalFr} est la capitale de quel pays ?`), [both(c, 'name'), ...distractors(c, 3, rand, 'name')], both(c, 'name'));
  },
};

export const flags: GenModule = {
  id: 'drapo', name: { ht: 'Drapo yo', fr: 'Drapeaux' }, category: 'peyi', ages: ['6-8', '9-11', '12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand);
    return q(this, age, rand, tx('Ki peyi drapo sa a ye?', 'À quel pays est ce drapeau ?'), [both(c, 'name'), ...distractors(c, 3, rand, 'name', true)], both(c, 'name'), undefined, { kind: 'flag', ref: c.iso });
  },
};

export const shapes: GenModule = {
  id: 'fom', name: { ht: 'Fòm peyi', fr: 'Formes des pays' }, category: 'peyi', ages: ['6-8', '9-11', '12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand, (x) => hasShape(x.iso)); // only countries we have an outline for
    return q(this, age, rand, tx('Ki peyi sa a?', 'Quel est ce pays ?'), [both(c, 'name'), ...distractors(c, 3, rand, 'name')], both(c, 'name'), undefined, { kind: 'shape', ref: c.iso });
  },
};

export const continents: GenModule = {
  id: 'kontinan', name: { ht: 'Peyi ak kontinan', fr: 'Pays et continents' }, category: 'jewografi', ages: ['9-11', '12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand);
    const all: Continent[] = ['Amerik di Nò', 'Karayib', 'Amerik di Sid', 'Ewòp', 'Afrik', 'Azi', 'Oseyani'];
    // "region", not "continent": the Caribbean is a region of North America. Overlapping regions are never offered together.
    const wrong = shuffleArr(all.filter((x) => !regionsClash(c.continent, x)), rand).slice(0, 3);
    return q(this, age, rand, tx(`Nan ki rejyon nan mond lan ${c.name} ye?`, `Dans quelle région du monde se trouve ${c.nameFr} ?`), [c.continent, ...wrong].map(regionText), regionText(c.continent));
  },
};

export const currencies: GenModule = {
  id: 'lajan-peyi', name: { ht: 'Lajan peyi yo', fr: 'Monnaies' }, category: 'jewografi', ages: ['12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand);
    return q(this, age, rand, tx(`Ki lajan yo itilize nan ${c.name}?`, `${c.nameFr} : quelle est sa monnaie ?`), [both(c, 'currency'), ...distractors(c, 3, rand, 'currency')], both(c, 'currency'));
  },
};

export const languages: GenModule = {
  id: 'lang-peyi', name: { ht: 'Lang peyi yo', fr: 'Langues' }, category: 'jewografi', ages: ['9-11', '12-14'],
  generate(age, rand) {
    const c = pickCountry(age, rand);
    const lang = c.langs[0];
    const spoken = languagesOf(c); // a second official language is never offered as a wrong answer
    const others = [...new Set(COUNTRIES.flatMap((x) => x.langs))].filter((l) => !spoken.includes(l) && !(l.startsWith('Kreyòl') && lang.startsWith('Kreyòl')));
    return q(this, age, rand, tx(`Ki lang yo pale nan ${c.name}?`, `${c.nameFr} : quelle langue y parle-t-on ?`), [lang, ...shuffleArr(others, rand).slice(0, 3)].map(langText), langText(lang));
  },
};

/** Pi gwo peyi? — two shapes side by side; the app draws both from the shapes pack. */
export const bigger: GenModule = {
  id: 'pi-gwo', name: { ht: 'Ki peyi ki pi gwo?', fr: 'Quel pays est le plus grand ?' }, category: 'jewografi', ages: ['9-11', '12-14'],
  generate(age, rand) {
    // both outlines are drawn, so pick countries that have one (micro-states have none)
    let a = pickCountry(age, rand), guard = 0;
    while (!hasShape(a.iso) && guard++ < 20) a = pickCountry(age, rand);
    let b = pickCountry(age, rand); guard = 0;
    while ((b.iso === a.iso || !hasShape(b.iso) || Math.max(a.areaKm2, b.areaKm2) / Math.min(a.areaKm2, b.areaKm2) < 1.3) && guard++ < 40) b = pickCountry(age, rand);
    if (b.iso === a.iso) return this.generate(age, rand);
    const big = a.areaKm2 > b.areaKm2 ? a : b;
    const km2 = String(big.areaKm2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return q(this, age, rand, tx(`Ki peyi ki pi gwo: ${a.name} oswa ${b.name}?`, `Quel pays est le plus grand : ${a.nameFr} ou ${b.nameFr} ?`), [both(a, 'name'), both(b, 'name')], both(big, 'name'), tx(`${big.name}: ${km2} km².`, `${big.nameFr} : ${km2} km².`), hasShape(a.iso) && hasShape(b.iso) ? { kind: 'shape', ref: `${a.iso},${b.iso}` } : undefined);
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

function pickDistractors(c: Country, pool: Country[], o: CountryQuizOptions, key: 'iso' | Field, rand: () => number, n = 3): Country[] {
  // level 1: easy — other famous countries, often from other continents; level 2–3: same continent first
  const flag = o.mode === 'drapo';
  const notSame = (x: Country) => !clashes(c, x, key, flag);
  const world = COUNTRIES.filter((x) => notSame(x) && x.tier <= Math.max(o.level, 1));
  const same = pool.filter((x) => notSame(x) && x.continent === c.continent);
  const src = o.level === 1 ? shuffle(world.filter((x) => x.tier === 1), rand) : [...shuffle(same, rand), ...shuffle(world, rand)];
  const out: Country[] = [];
  for (const x of src) { if (!out.some((o) => o[key] === x[key] || (flag && flagsLookAlike(o.iso, x.iso)))) out.push(x); if (out.length === n) break; }
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
        qq = q(mod, age, rand, tx(`Ki drapo ${c.name}?`, `${c.nameFr} : quel est son drapeau ?`), [flagEmoji(c.iso), ...ds.map((x) => flagEmoji(x.iso))], flagEmoji(c.iso));
      } else {
        qq = q(mod, age, rand, tx('Ki peyi drapo sa a ye?', 'À quel pays est ce drapeau ?'), [both(c, 'name'), ...pickDistractors(c, pool, o, 'name', rand).map((x) => both(x, 'name'))], both(c, 'name'), undefined, { kind: 'flag', ref: c.iso });
      }
    } else if (o.mode === 'kapital') {
      if (reverseOk && rand() < 0.5) qq = q(mod, age, rand, tx(`${c.capital} se kapital ki peyi?`, `${c.capitalFr} est la capitale de quel pays ?`), [both(c, 'name'), ...pickDistractors(c, pool, o, 'name', rand).map((x) => both(x, 'name'))], both(c, 'name'));
      else qq = q(mod, age, rand, tx(`Ki kapital ${c.name}?`, `${c.nameFr} : quelle est sa capitale ?`), [both(c, 'capital'), ...pickDistractors(c, pool, o, 'capital', rand).map((x) => both(x, 'capital'))], both(c, 'capital'), tx(`${c.capital} se kapital ${c.name}.`, `${c.nameFr} : la capitale est ${c.capitalFr}.`), o.level === 1 ? { kind: 'flag', ref: c.iso } : undefined);
    } else {
      qq = q(mod, age, rand, tx('Ki peyi sa a?', 'Quel est ce pays ?'), [both(c, 'name'), ...pickDistractors(c, pool, o, 'name', rand).map((x) => both(x, 'name'))], both(c, 'name'), undefined, { kind: 'shape', ref: c.iso });
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
