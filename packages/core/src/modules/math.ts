import type { AgeBand } from '../types.js';
import { type GenModule, type Rand, int, pick, numericOptions, q, ht } from './base.js';

/** Tab miltiplikasyon — times tables with reverse ("? × 7 = 56") for older kids. */
export const timesTables: GenModule = {
  id: 'tab', name: { ht: 'Tab miltiplikasyon', fr: 'Tables de multiplication' }, category: 'matematik', ages: ['9-11', '12-14'],
  generate(age, rand) {
    const a = int(rand, 2, age === '9-11' ? 9 : 12), b = int(rand, 2, 12);
    if (age === '12-14' && rand() < 0.4) {
      return q(this, age, rand, ht(`? × ${b} = ${a * b}`), numericOptions(rand, a, 4, 3, 1).map(String), String(a), `${a} × ${b} = ${a * b}`);
    }
    return q(this, age, rand, ht(`Konbyen ${a} × ${b} fè?`), numericOptions(rand, a * b, 4, 8, 0).map(String), String(a * b));
  },
};

/** Fraksyon — compare, add (same denominator), read a picture. */
export const fractions: GenModule = {
  id: 'frak', name: { ht: 'Fraksyon', fr: 'Fractions' }, category: 'matematik', ages: ['9-11', '12-14'],
  generate(age, rand) {
    const kind = pick(rand, age === '9-11' ? ['pic', 'cmp', 'add'] : ['cmp', 'add', 'eq']);
    if (kind === 'pic') {
      const d = pick(rand, [2, 3, 4, 6, 8]), n = int(rand, 1, d - 1);
      const opts = [`${n}/${d}`, `${d - n}/${d}`, `${n}/${d + 2}`, `${Math.min(d, n + 1)}/${d}`];
      return q(this, age, rand, ht('Ki fraksyon ki kolore?'), opts, `${n}/${d}`, `${n} moso sou ${d} kolore: ${n}/${d}.`, { kind: 'image', ref: `fraction:${n}/${d}` });
    }
    if (kind === 'cmp') {
      const d1 = pick(rand, [2, 3, 4, 5, 6, 8]), d2 = pick(rand, [2, 3, 4, 5, 6, 8]);
      const n1 = int(rand, 1, d1 - 1), n2 = int(rand, 1, d2 - 1);
      if (n1 / d1 === n2 / d2) return this.generate(age, rand);
      const a = `${n1}/${d1}`, b = `${n2}/${d2}`, big = n1 / d1 > n2 / d2 ? a : b;
      return q(this, age, rand, ht(`Ki fraksyon ki pi gwo: ${a} oswa ${b}?`), [a, b], big, `${big} pi gwo paske li pi pre 1.`);
    }
    if (kind === 'add') {
      const d = pick(rand, [3, 4, 5, 6, 8, 10]), n1 = int(rand, 1, d - 2), n2 = int(rand, 1, d - 1 - n1);
      const ans = `${n1 + n2}/${d}`;
      return q(this, age, rand, ht(`Konbyen ${n1}/${d} + ${n2}/${d} fè?`), [ans, `${n1 + n2}/${d * 2}`, `${n1 * n2}/${d}`, `${n1 + n2 + 1}/${d}`], ans, 'Lè denominatè yo menm, ou ajoute nimeratè yo sèlman.');
    }
    const n = int(rand, 1, 4), d = int(rand, n + 1, 6), k = pick(rand, [2, 3, 4]);
    const ans = `${n * k}/${d * k}`;
    return q(this, age, rand, ht(`Ki fraksyon ki egal ak ${n}/${d}?`), [ans, `${n + k}/${d + k}`, `${n * k}/${d}`, `${n}/${d * k}`], ans, `Miltipliye anwo ak anba pa ${k}.`);
  },
};

const NOTES_HTG = [10, 25, 50, 100, 250, 500, 1000];
const COINS_HTG = [1, 5];

/** Konte lajan — count gourdes, make change at the market. */
export const money: GenModule = {
  id: 'lajan', name: { ht: 'Konte lajan', fr: "Compter l'argent" }, category: 'matematik', ages: ['6-8', '9-11', '12-14'],
  generate(age, rand) {
    if (age === '6-8' || rand() < 0.5) {
      const n = age === '6-8' ? int(rand, 2, 3) : int(rand, 3, 5);
      const pool = age === '6-8' ? [...COINS_HTG, 10, 25, 50] : [...NOTES_HTG];
      const items = Array.from({ length: n }, () => pick(rand, pool));
      const total = items.reduce((a, b) => a + b, 0);
      return q(this, age, rand, ht(`Konbyen goud sa fè? ${items.map((v) => v + ' G').join(' + ')}`), numericOptions(rand, total, 4, 25, 1).map((v) => `${v} G`), `${total} G`, undefined, { kind: 'image', ref: `money:${items.join(',')}` });
    }
    const price = int(rand, 2, age === '9-11' ? 19 : 95) * 5;
    const paid = NOTES_HTG.find((n) => n >= price + 5) ?? 1000;
    const change = paid - price;
    return q(this, age, rand, ht(`Yon bagay koute ${price} G. Ou bay ${paid} G. Konbyen lajan yo dwe remèt ou?`), numericOptions(rand, change, 4, 20, 0).map((v) => `${v} G`), `${change} G`, `${paid} − ${price} = ${change}.`);
  },
};

/** Li lè a — read an analog clock, add minutes. */
export const clock: GenModule = {
  id: 'le', name: { ht: 'Li lè a', fr: "Lire l'heure" }, category: 'jeneral', ages: ['6-8', '9-11'],
  generate(age, rand) {
    const h = int(rand, 1, 12), m = age === '6-8' ? pick(rand, [0, 30]) : pick(rand, [0, 15, 30, 45]);
    const fmt = (hh: number, mm: number) => `${((hh - 1) % 12) + 1}:${mm.toString().padStart(2, '0')}`;
    if (age === '6-8' || rand() < 0.5) {
      const ans = fmt(h, m);
      const opts = [ans, fmt(h + 1, m), fmt(h, (m + 30) % 60), fmt(m === 0 ? h + 2 : h - 1, m)];
      return q(this, age, rand, ht('Ki lè li ye?'), opts, ans, undefined, { kind: 'image', ref: `clock:${fmt(h, m)}` });
    }
    const add = pick(rand, [15, 30, 45, 60]);
    const total = h * 60 + m + add;
    const ans = fmt(Math.floor(total / 60) || 12, total % 60);
    return q(this, age, rand, ht(`Li ${fmt(h, m)}. Nan ${add} minit, ki lè li pral ye?`), [ans, fmt(Math.floor(total / 60) + 1 || 12, total % 60), fmt(h, (m + add + 15) % 60), fmt(h, m)], ans);
  },
};

// ---- Kreyòl number words 0–100, standard orthography (Akademi Kreyòl Ayisyen). ----
const ONES = ['zewo', 'en', 'de', 'twa', 'kat', 'senk', 'sis', 'sèt', 'uit', 'nèf', 'dis', 'onz', 'douz', 'trèz', 'katòz', 'kenz', 'sèz', 'disèt', 'dizuit', 'diznèf'];
// [exact, +1, joiner for 2–7, joiner for 8–9]
const TENS: Record<number, [string, string, string, string]> = {
  20: ['ven', 'venteyen', 'venn', 'vent'], 30: ['trant', 'tranteyen', 'trann', 'trant'], 40: ['karant', 'karanteyen', 'karann', 'karant'],
  50: ['senkant', 'senkanteyen', 'senkann', 'senkant'], 60: ['swasant', 'swasanteyen', 'swasann', 'swasant'], 80: ['katreven', 'katrevenen', 'katreven', 'katreven'],
};
export function kreyolNumber(n: number): string {
  if (n === 1) return 'youn';
  if (n < 20) return ONES[n];
  if (n === 100) return 'san';
  if (n >= 70 && n < 80) return 'swasann' + ONES[n - 60];   // swasanndis, swasannonz, swasanndouz…
  if (n >= 90) return 'katreven' + ONES[n - 80];            // katrevendis, katrevenonz…
  const t = Math.floor(n / 10) * 10, u = n % 10;
  const [exact, plusOne, join27, join89] = TENS[t];
  return u === 0 ? exact : u === 1 ? plusOne : (u >= 8 ? join89 : join27) + ONES[u];
}

/** Nonb an lèt — number ↔ Kreyòl words. */
export const numberWords: GenModule = {
  id: 'nonb', name: { ht: 'Nonb an lèt', fr: 'Nombres en lettres' }, category: 'jeneral', ages: ['6-8', '9-11'],
  generate(age, rand) {
    const max = age === '6-8' ? 20 : 100;
    const n = int(rand, 0, max);
    const alts = numericOptions(rand, n, 4, age === '6-8' ? 3 : 12, 0).filter((v) => v <= 100);
    if (rand() < 0.5) return q(this, age, rand, ht(`Ki nonb sa a: «${kreyolNumber(n)}»?`), alts.map(String), String(n));
    return q(this, age, rand, ht(`Kijan yo ekri ${n} an lèt?`), alts.map(kreyolNumber), kreyolNumber(n));
  },
};

/** Pi gwo / pi piti — compare and order (ages 6–8). */
export const compare: GenModule = {
  id: 'konpare', name: { ht: 'Pi gwo, pi piti', fr: 'Plus grand, plus petit' }, category: 'matematik', ages: ['6-8'],
  generate(age, rand) {
    const a = int(rand, 1, 50), b = int(rand, 1, 50);
    if (a === b) return this.generate(age, rand);
    if (rand() < 0.5) return q(this, age, rand, ht(`Ki nonb ki pi gwo: ${a} oswa ${b}?`), [String(a), String(b)], String(Math.max(a, b)));
    return q(this, age, rand, ht(`Ki nonb ki pi piti: ${a} oswa ${b}?`), [String(a), String(b)], String(Math.min(a, b)));
  },
};

/** Sekans — next number in a pattern. */
export const sequence: GenModule = {
  id: 'sekans', name: { ht: 'Sekans', fr: 'Suites' }, category: 'matematik', ages: ['6-8', '9-11', '12-14'],
  generate(age, rand) {
    const start = int(rand, 1, 10);
    const step = age === '6-8' ? pick(rand, [1, 2, 5, 10]) : age === '9-11' ? pick(rand, [2, 3, 4, 5, 7]) : pick(rand, [-3, 3, 6, 9, 11]);
    const geo = age === '12-14' && rand() < 0.3;
    const seq = Array.from({ length: 4 }, (_, i) => (geo ? start * 2 ** i : start + step * i));
    const next = geo ? start * 16 : start + step * 4;
    return q(this, age, rand, ht(`Ki nonb ki vini apre? ${seq.join(', ')}, …`), numericOptions(rand, next, 4, Math.max(2, Math.abs(step)), -50).map(String), String(next), geo ? 'Chak nonb double.' : `Chak fwa ou ajoute ${step}.`);
  },
};

/** Konvèsyon — units and money. HTG rate is a parameter the app refreshes weekly. */
export const HTG_PER_USD = 131;
export const convert: GenModule = {
  id: 'konv', name: { ht: 'Konvèsyon', fr: 'Conversions' }, category: 'matematik', ages: ['9-11', '12-14'],
  generate(age, rand) {
    const kind = pick(rand, age === '9-11' ? ['km', 'kg', 'min'] : ['km', 'kg', 'min', 'usd', 'temp']);
    if (kind === 'km') { const k = int(rand, 1, 9); return q(this, age, rand, ht(`${k} km = konbyen mèt?`), numericOptions(rand, k * 1000, 4, 500, 0).map(String), String(k * 1000), '1 km = 1000 m.'); }
    if (kind === 'kg') { const k = int(rand, 1, 9); return q(this, age, rand, ht(`${k} kg = konbyen gram?`), numericOptions(rand, k * 1000, 4, 500, 0).map(String), String(k * 1000), '1 kg = 1000 g.'); }
    if (kind === 'min') { const h = int(rand, 1, 5); return q(this, age, rand, ht(`${h} èdtan = konbyen minit?`), numericOptions(rand, h * 60, 4, 30, 0).map(String), String(h * 60), '1 èdtan = 60 minit.'); }
    if (kind === 'usd') { const d = int(rand, 1, 20); return q(this, age, rand, ht(`Si 1 $ = ${HTG_PER_USD} G, konbyen ${d} $ fè?`), numericOptions(rand, d * HTG_PER_USD, 4, 200, 0).map((v) => `${v} G`), `${d * HTG_PER_USD} G`); }
    const c = pick(rand, [0, 10, 20, 25, 30, 35, 40]); const f = c * 9 / 5 + 32;
    return q(this, age, rand, ht(`${c} °C = konbyen °F?`), numericOptions(rand, f, 4, 12, -40).map((v) => `${v} °F`), `${f} °F`, '°F = °C × 9/5 + 32.');
  },
};

/** Fòm jewometrik — shapes, perimeter, area. */
export const geometry: GenModule = {
  id: 'jeo', name: { ht: 'Fòm jewometrik', fr: 'Géométrie' }, category: 'matematik', ages: ['6-8', '9-11', '12-14'],
  generate(age, rand) {
    const SHAPES: [string, number][] = [['triyang', 3], ['kare', 4], ['rektang', 4], ['pentagòn', 5], ['egzagòn', 6], ['oktogòn', 8]];
    if (age === '6-8') {
      const [name, sides] = pick(rand, SHAPES);
      return q(this, age, rand, ht(`Konbyen bò yon ${name} genyen?`), numericOptions(rand, sides, 4, 2, 1).map(String), String(sides), undefined, { kind: 'image', ref: `shape:${name}` });
    }
    const w = int(rand, 2, 12), h = int(rand, 2, 12);
    if (age === '9-11' || rand() < 0.5) return q(this, age, rand, ht(`Yon rektang ${w} cm sou ${h} cm. Ki perimèt li?`), numericOptions(rand, 2 * (w + h), 4, 6, 1).map((v) => `${v} cm`), `${2 * (w + h)} cm`, 'Perimèt = 2 × (lajè + wotè).');
    return q(this, age, rand, ht(`Yon rektang ${w} cm sou ${h} cm. Ki sipèfisi li?`), numericOptions(rand, w * h, 4, 10, 1).map((v) => `${v} cm²`), `${w * h} cm²`, 'Sipèfisi = lajè × wotè.');
  },
};

/** Kòd binè — binary ↔ decimal for the Enfòmatik track. */
export const binary: GenModule = {
  id: 'bine', name: { ht: 'Kòd binè', fr: 'Binaire' }, category: 'teknoloji', ages: ['12-14'],
  generate(age, rand) {
    const n = int(rand, 1, 31);
    if (rand() < 0.5) return q(this, age, rand, ht(`${n.toString(2)} an binè = ki nonb?`), numericOptions(rand, n, 4, 4, 0).map(String), String(n), 'Chak pozisyon vo 1, 2, 4, 8, 16…');
    return q(this, age, rand, ht(`Ekri ${n} an binè.`), numericOptions(rand, n, 4, 4, 0).map((v) => v.toString(2)), n.toString(2));
  },
};

export const MATH_MODULES: GenModule[] = [timesTables, fractions, money, clock, numberWords, compare, sequence, convert, geometry, binary];
export type { AgeBand };
