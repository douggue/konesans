import type { AgeBand } from '../types.js';
import { type GenModule, type Rand, int, pick, numericOptions, q, tx } from './base.js';

/** Tab miltiplikasyon — times tables with reverse ("? × 7 = 56") for older kids. */
export const timesTables: GenModule = {
  id: 'tab', name: { ht: 'Tab miltiplikasyon', fr: 'Tables de multiplication' }, category: 'matematik', ages: ['9-11', '12-14'],
  generate(age, rand) {
    // no trivial facts (2 × 2) above 8 years old: 9–11 from 3 × 3, 12–14 from 4 × 3
    const a = age === '9-11' ? int(rand, 3, 9) : int(rand, 4, 12), b = age === '9-11' ? int(rand, 3, 10) : int(rand, 3, 12);
    if (age === '12-14' && rand() < 0.4) {
      return q(this, age, rand, tx(`? × ${b} = ${a * b}`, `? × ${b} = ${a * b}`), numericOptions(rand, a, 4, 3, 1).map(String), String(a), `${a} × ${b} = ${a * b}`);
    }
    return q(this, age, rand, tx(`Konbyen ${a} × ${b} fè?`, `Combien font ${a} × ${b} ?`), numericOptions(rand, a * b, 4, 8, 0).map(String), String(a * b));
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
      return q(this, age, rand, tx('Ki fraksyon ki kolore?', 'Quelle fraction est coloriée ?'), opts, `${n}/${d}`, tx(`${n} moso sou ${d} kolore: ${n}/${d}.`, `${n} parts sur ${d} sont coloriées : ${n}/${d}.`), { kind: 'image', ref: `fraction:${n}/${d}` });
    }
    if (kind === 'cmp') {
      const d1 = pick(rand, [2, 3, 4, 5, 6, 8]), d2 = pick(rand, [2, 3, 4, 5, 6, 8]);
      const n1 = int(rand, 1, d1 - 1), n2 = int(rand, 1, d2 - 1);
      if (n1 / d1 === n2 / d2) return this.generate(age, rand);
      const a = `${n1}/${d1}`, b = `${n2}/${d2}`, big = n1 / d1 > n2 / d2 ? a : b;
      return q(this, age, rand, tx(`Ki fraksyon ki pi gwo: ${a} oswa ${b}?`, `Quelle fraction est la plus grande : ${a} ou ${b} ?`), [a, b], big, tx(`${big} pi gwo paske li pi pre 1.`, `${big} est plus grande parce qu'elle est plus proche de 1.`));
    }
    if (kind === 'add') {
      const d = pick(rand, [3, 4, 5, 6, 8, 10]), n1 = int(rand, 1, d - 2), n2 = int(rand, 1, d - 1 - n1);
      const ans = `${n1 + n2}/${d}`;
      return q(this, age, rand, tx(`Konbyen ${n1}/${d} + ${n2}/${d} fè?`, `Combien font ${n1}/${d} + ${n2}/${d} ?`), [ans, `${n1 + n2}/${d * 2}`, `${n1 * n2}/${d}`, `${n1 + n2 + 1}/${d}`], ans, tx('Lè denominatè yo menm, ou ajoute nimeratè yo sèlman.', 'Quand les dénominateurs sont pareils, on additionne seulement les numérateurs.'));
    }
    const n = int(rand, 1, 4), d = int(rand, n + 1, 6), k = pick(rand, [2, 3, 4]);
    const ans = `${n * k}/${d * k}`;
    return q(this, age, rand, tx(`Ki fraksyon ki egal ak ${n}/${d}?`, `Quelle fraction est égale à ${n}/${d} ?`), [ans, `${n + k}/${d + k}`, `${n * k}/${d}`, `${n}/${d * k}`], ans, tx(`Miltipliye anwo ak anba pa ${k}.`, `Multiplie le haut et le bas par ${k}.`));
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
      return q(this, age, rand, tx(`Konbyen goud sa fè? ${items.map((v) => v + ' G').join(' + ')}`, `Combien de gourdes cela fait-il ? ${items.map((v) => v + ' G').join(' + ')}`), numericOptions(rand, total, 4, 25, 1).map((v) => `${v} G`), `${total} G`, undefined, { kind: 'image', ref: `money:${items.join(',')}` });
    }
    const price = int(rand, 2, age === '9-11' ? 19 : 95) * 5;
    const paid = NOTES_HTG.find((n) => n >= price + 5) ?? 1000;
    const change = paid - price;
    return q(this, age, rand, tx(`Yon bagay koute ${price} G. Ou bay ${paid} G. Konbyen lajan yo dwe remèt ou?`, `Un article coûte ${price} G. Tu donnes ${paid} G. Combien doit-on te rendre ?`), numericOptions(rand, change, 4, 20, 0).map((v) => `${v} G`), `${change} G`, `${paid} − ${price} = ${change}.`);
  },
};

/** Li lè a — read an analog clock, add minutes. */
export const clock: GenModule = {
  id: 'le', name: { ht: 'Li lè a', fr: "Lire l'heure" }, category: 'jeneral', ages: ['6-8', '9-11'],
  generate(age, rand) {
    const h = int(rand, 1, 12), m = age === '6-8' ? pick(rand, [0, 30]) : pick(rand, [0, 15, 30, 45]);
    const fmt = (hh: number, mm: number) => `${((((hh - 1) % 12) + 12) % 12) + 1}:${mm.toString().padStart(2, '0')}`; // 0 → 12, 13 → 1 (never "0:30")
    if (age === '6-8' || rand() < 0.5) {
      const ans = fmt(h, m);
      const opts = [ans, fmt(h + 1, m), fmt(h, (m + 30) % 60), fmt(m === 0 ? h + 2 : h - 1, m)];
      return q(this, age, rand, tx('Ki lè li ye?', 'Quelle heure est-il ?'), opts, ans, undefined, { kind: 'image', ref: `clock:${fmt(h, m)}` });
    }
    const add = pick(rand, [15, 30, 45, 60]);
    const total = h * 60 + m + add;
    const ans = fmt(Math.floor(total / 60) || 12, total % 60);
    return q(this, age, rand, tx(`Li ${fmt(h, m)}. Nan ${add} minit, ki lè li pral ye?`, `Il est ${fmt(h, m)}. Quelle heure sera-t-il dans ${add} minutes ?`), [ans, fmt(Math.floor(total / 60) + 1 || 12, total % 60), fmt(h, (m + add + 15) % 60), fmt(h, m)], ans);
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

// ---- French number words 0–100 (1990 spelling: hyphens everywhere). ----
const FR_ONES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const FR_TENS: Record<number, string> = { 20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante' };
export function frenchNumber(n: number): string {
  if (n < 20) return FR_ONES[n];
  if (n === 100) return 'cent';
  if (n < 70) { const t = Math.floor(n / 10) * 10, u = n % 10; return u === 0 ? FR_TENS[t] : u === 1 ? `${FR_TENS[t]}-et-un` : `${FR_TENS[t]}-${FR_ONES[u]}`; }
  if (n < 80) return n === 71 ? 'soixante-et-onze' : `soixante-${FR_ONES[n - 60]}`;
  if (n === 80) return 'quatre-vingts';
  return `quatre-vingt-${FR_ONES[n - 80]}`;
}

/** Nonb an lèt — number ↔ words (Kreyòl words for Kreyòl, French words for French). */
export const numberWords: GenModule = {
  id: 'nonb', name: { ht: 'Nonb an lèt', fr: 'Nombres en lettres' }, category: 'jeneral', ages: ['6-8', '9-11'],
  generate(age, rand) {
    const max = age === '6-8' ? 20 : 100;
    const n = int(rand, 0, max);
    // wrong numbers stay inside 0…max, so the set always has 4 options ("san" = 100 used to get only one)
    const alts = numericOptions(rand, n, 4, age === '6-8' ? 3 : 12, 0).filter((v) => v <= max);
    for (let d = 1; alts.length < 4 && d <= max; d++) for (const v of [n - d, n + d]) if (alts.length < 4 && v >= 0 && v <= max && !alts.includes(v)) alts.push(v);
    // Kreyòl kids read Kreyòl number words, French kids French ones
    const word = (v: number) => ({ ht: kreyolNumber(v), fr: frenchNumber(v) });
    if (rand() < 0.5) return q(this, age, rand, tx(`Ki nonb sa a: «${kreyolNumber(n)}»?`, `Quel est ce nombre : « ${frenchNumber(n)} » ?`), alts.map(String), String(n));
    return q(this, age, rand, tx(`Kijan yo ekri ${n} an lèt?`, `Comment écrit-on ${n} en lettres ?`), alts.map(word), word(n));
  },
};

/** Pi gwo / pi piti — compare and order (ages 6–8). */
export const compare: GenModule = {
  id: 'konpare', name: { ht: 'Pi gwo, pi piti', fr: 'Plus grand, plus petit' }, category: 'matematik', ages: ['6-8'],
  generate(age, rand) {
    const a = int(rand, 1, 50), b = int(rand, 1, 50);
    if (a === b) return this.generate(age, rand);
    if (rand() < 0.5) return q(this, age, rand, tx(`Ki nonb ki pi gwo: ${a} oswa ${b}?`, `Quel nombre est le plus grand : ${a} ou ${b} ?`), [String(a), String(b)], String(Math.max(a, b)));
    return q(this, age, rand, tx(`Ki nonb ki pi piti: ${a} oswa ${b}?`, `Quel nombre est le plus petit : ${a} ou ${b} ?`), [String(a), String(b)], String(Math.min(a, b)));
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
    return q(this, age, rand, tx(`Ki nonb ki vini apre? ${seq.join(', ')}, …`, `Quel nombre vient ensuite ? ${seq.join(', ')}, …`), numericOptions(rand, next, 4, Math.max(2, Math.abs(step)), -50).map(String), String(next), geo ? tx('Chak nonb double.', 'Chaque nombre double.') : step < 0 ? tx(`Chak fwa ou retire ${-step}.`, `À chaque fois, on enlève ${-step}.`) : tx(`Chak fwa ou ajoute ${step}.`, `À chaque fois, on ajoute ${step}.`));
  },
};

/** Konvèsyon — units and money. HTG rate is a parameter the app refreshes weekly. */
export const HTG_PER_USD = 131;
export const convert: GenModule = {
  id: 'konv', name: { ht: 'Konvèsyon', fr: 'Conversions' }, category: 'matematik', ages: ['9-11', '12-14'],
  generate(age, rand) {
    const kind = pick(rand, age === '9-11' ? ['km', 'kg', 'min'] : ['km', 'kg', 'min', 'usd', 'temp']);
    if (kind === 'km') { const k = int(rand, 1, 9); return q(this, age, rand, tx(`${k} km = konbyen mèt?`, `${k} km = combien de mètres ?`), numericOptions(rand, k * 1000, 4, 500, 0).map(String), String(k * 1000), '1 km = 1000 m.'); }
    if (kind === 'kg') { const k = int(rand, 1, 9); return q(this, age, rand, tx(`${k} kg = konbyen gram?`, `${k} kg = combien de grammes ?`), numericOptions(rand, k * 1000, 4, 500, 0).map(String), String(k * 1000), '1 kg = 1000 g.'); }
    if (kind === 'min') { const h = int(rand, 1, 5); return q(this, age, rand, tx(`${h} èdtan = konbyen minit?`, `${h} h = combien de minutes ?`), numericOptions(rand, h * 60, 4, 30, 0).map(String), String(h * 60), tx('1 èdtan = 60 minit.', '1 heure = 60 minutes.')); }
    if (kind === 'usd') { const d = int(rand, 1, 20); return q(this, age, rand, tx(`Si 1 $ = ${HTG_PER_USD} G, konbyen ${d} $ fè?`, `Si 1 $ = ${HTG_PER_USD} G, combien font ${d} $ ?`), numericOptions(rand, d * HTG_PER_USD, 4, 200, 0).map((v) => `${v} G`), `${d * HTG_PER_USD} G`); }
    const c = pick(rand, [0, 10, 20, 25, 30, 35, 40]); const f = c * 9 / 5 + 32;
    return q(this, age, rand, tx(`${c} °C = konbyen °F?`, `${c} °C = combien de °F ?`), numericOptions(rand, f, 4, 12, -40).map((v) => `${v} °F`), `${f} °F`, '°F = °C × 9/5 + 32.');
  },
};

/** Fòm jewometrik — shapes, perimeter, area. */
export const geometry: GenModule = {
  id: 'jeo', name: { ht: 'Fòm jewometrik', fr: 'Géométrie' }, category: 'matematik', ages: ['6-8', '9-11', '12-14'],
  generate(age, rand) {
    const SHAPES: [string, number, string][] = [['triyang', 3, 'un triangle'], ['kare', 4, 'un carré'], ['rektang', 4, 'un rectangle'], ['pentagòn', 5, 'un pentagone'], ['egzagòn', 6, 'un hexagone'], ['oktogòn', 8, 'un octogone']];
    if (age === '6-8') {
      const [name, sides, nameFr] = pick(rand, SHAPES);
      return q(this, age, rand, tx(`Konbyen bò yon ${name} genyen?`, `Combien de côtés a ${nameFr} ?`), numericOptions(rand, sides, 4, 2, 1).map(String), String(sides), undefined, { kind: 'image', ref: `shape:${name}` });
    }
    const w = int(rand, 2, 12), h = int(rand, 2, 12);
    if (age === '9-11' || rand() < 0.5) return q(this, age, rand, tx(`Yon rektang ${w} cm sou ${h} cm. Ki perimèt li?`, `Un rectangle de ${w} cm sur ${h} cm. Quel est son périmètre ?`), numericOptions(rand, 2 * (w + h), 4, 6, 1).map((v) => `${v} cm`), `${2 * (w + h)} cm`, tx('Perimèt = 2 × (lajè + wotè).', 'Périmètre = 2 × (largeur + hauteur).'));
    return q(this, age, rand, tx(`Yon rektang ${w} cm sou ${h} cm. Ki sipèfisi li?`, `Un rectangle de ${w} cm sur ${h} cm. Quelle est son aire ?`), numericOptions(rand, w * h, 4, 10, 1).map((v) => `${v} cm²`), `${w * h} cm²`, tx('Sipèfisi = lajè × wotè.', 'Aire = largeur × hauteur.'));
  },
};

/** Kòd binè — binary ↔ decimal for the Enfòmatik track. */
export const binary: GenModule = {
  id: 'bine', name: { ht: 'Kòd binè', fr: 'Binaire' }, category: 'teknoloji', ages: ['12-14'],
  generate(age, rand) {
    const n = int(rand, 1, 31);
    if (rand() < 0.5) return q(this, age, rand, tx(`${n.toString(2)} an binè = ki nonb?`, `${n.toString(2)} en binaire = quel nombre ?`), numericOptions(rand, n, 4, 4, 0).map(String), String(n), tx('Chak pozisyon vo 1, 2, 4, 8, 16…', 'Chaque position vaut 1, 2, 4, 8, 16…'));
    return q(this, age, rand, tx(`Ekri ${n} an binè.`, `Écris ${n} en binaire.`), numericOptions(rand, n, 4, 4, 0).map((v) => v.toString(2)), n.toString(2));
  },
};

export const MATH_MODULES: GenModule[] = [timesTables, fractions, money, clock, numberWords, compare, sequence, convert, geometry, binary];
export type { AgeBand };
