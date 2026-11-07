import { rng } from './engine.js';
import type { AgeBand } from '../types.js';
import { mathRunXp } from '../progress/xp.js';

/**
 * Kalkil Mantal — generated mental-math problems, 60 seconds, combo bonus.
 *
 * Every problem has an integer answer the kid types on a number pad (negatives allowed for 12–14).
 * Problem kinds grow with age: 6–8 count and add; 9–11 get tables, missing numbers and order of
 * operations; 12–14 get equations, percentages, powers, roots, negatives, fractions, averages…
 * Harder kinds are worth 2 points.
 */
export type Op = '+' | '-' | '×' | '÷';
export type MathKind =
  | 'add' | 'sub' | 'mul' | 'div' | 'double' | 'half' | 'missing' | 'sequence' | 'order'
  | 'square' | 'percent' | 'remainder' | 'eq1' | 'eq2' | 'neg' | 'power' | 'sqrt' | 'fraction_of' | 'average' | 'compare_diff' | 'unit';

export interface MathProblem {
  kind: MathKind;
  /** what the kid sees, big (e.g. "2x + 3 = 11", "15% nan 200", "7 × 8") */
  text: string;
  /** small line under it when the question isn't obvious (e.g. "x = ?", "rès = ?") */
  ask?: string;
  /** French versions of `text` and `ask` (the app shows them when the kid plays in French) */
  textFr: string;
  askFr?: string;
  answer: number;
  points: 1 | 2;
  /** legacy fields, kept for the four basic operations */
  a?: number; b?: number; op?: Op;
}

type Rand = () => number;
const ri = (rand: Rand, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1)); // inclusive
const pick = <T>(rand: Rand, a: readonly T[]) => a[Math.floor(rand() * a.length)];
const fmt = (n: number) => (n < 0 ? `(${n})` : String(n));

// ─── generators ──────────────────────────────────────────────────────────────

const G: Record<MathKind, (age: AgeBand, rand: Rand) => Omit<MathProblem, 'textFr' | 'askFr'>> = {
  add(age, rand) {
    const max = age === '6-8' ? 20 : age === '9-11' ? 100 : 500;
    const a = ri(rand, 2, max), b = ri(rand, 2, max);
    return { kind: 'add', text: `${a} + ${b}`, answer: a + b, points: 1, a, b, op: '+' };
  },
  sub(age, rand) {
    const max = age === '6-8' ? 20 : age === '9-11' ? 100 : 500;
    let a = ri(rand, 2, max), b = ri(rand, 2, max);
    if (b > a) [a, b] = [b, a];
    return { kind: 'sub', text: `${a} − ${b}`, answer: a - b, points: 1, a, b, op: '-' };
  },
  mul(age, rand) {
    const max = age === '12-14' ? 15 : 12;
    const a = ri(rand, 2, max), b = ri(rand, 2, age === '12-14' ? 25 : max);
    return { kind: 'mul', text: `${a} × ${b}`, answer: a * b, points: 1, a, b, op: '×' };
  },
  div(age, rand) {
    const max = age === '12-14' ? 15 : 12;
    const q = ri(rand, 2, max), b = ri(rand, 2, max);
    return { kind: 'div', text: `${q * b} ÷ ${b}`, answer: q, points: 1, a: q * b, b, op: '÷' };
  },
  double(age, rand) {
    const n = age === '6-8' ? ri(rand, 1, 15) : age === '9-11' ? ri(rand, 10, 60) : ri(rand, 25, 250);
    return { kind: 'double', text: `${n} × 2`, ask: 'Doub li', answer: n * 2, points: 1 };
  },
  half(age, rand) {
    const n = age === '6-8' ? ri(rand, 1, 10) * 2 : age === '9-11' ? ri(rand, 6, 50) * 2 : ri(rand, 20, 200) * 2;
    return { kind: 'half', text: `${n} ÷ 2`, ask: 'Mwatye li', answer: n / 2, points: 1 };
  },
  missing(age, rand) {
    // ? + b = c   |   a × ? = c
    if (age === '6-8' || rand() < 0.5) {
      const max = age === '6-8' ? 20 : 100;
      const a = ri(rand, 1, max - 1), b = ri(rand, 1, max - a);
      return { kind: 'missing', text: `? + ${b} = ${a + b}`, ask: '? = ', answer: a, points: 1 };
    }
    const a = ri(rand, 2, 12), b = ri(rand, 2, 12);
    return { kind: 'missing', text: `${a} × ? = ${a * b}`, ask: '? = ', answer: b, points: age === '12-14' ? 1 : 2 };
  },
  sequence(age, rand) {
    const step = age === '6-8' ? pick(rand, [1, 2, 5, 10]) : age === '9-11' ? pick(rand, [2, 3, 4, 5, 6, 7, 8, 9, 10, 25]) : pick(rand, [3, 4, 6, 7, 8, 9, 11, 12, 15, -2, -3, -5]);
    const start = age === '6-8' ? ri(rand, 0, 10) : age === '9-11' ? ri(rand, 0, 30) : ri(rand, -20, 50);
    const seq = [0, 1, 2, 3].map((i) => start + i * step);
    return { kind: 'sequence', text: `${seq.slice(0, 3).join(', ')}, ?`, ask: 'Ki nimewo ki vini apre?', answer: seq[3], points: age === '6-8' ? 1 : 1 };
  },
  order(age, rand) {
    // 9–11: a + b × c ; 12–14: (a − b) × c + d, a + b × c − d
    if (age !== '12-14') {
      const a = ri(rand, 1, 20), b = ri(rand, 2, 9), c = ri(rand, 2, 9);
      return rand() < 0.5
        ? { kind: 'order', text: `${a} + ${b} × ${c}`, answer: a + b * c, points: 2 }
        : { kind: 'order', text: `${a + b * c} − ${b} × ${c}`, answer: a, points: 2 };
    }
    const a = ri(rand, 5, 20), b = ri(rand, 1, 4), c = ri(rand, 2, 9), d = ri(rand, 1, 20);
    const v = pick(rand, [
      { text: `(${a} − ${b}) × ${c} + ${d}`, answer: (a - b) * c + d },
      { text: `${a} + ${b} × ${c} − ${d}`, answer: a + b * c - d },
      { text: `${a * c} ÷ ${c} + ${b} × ${d}`, answer: a + b * d },
      { text: `${a}² − ${b * c}`, answer: a * a - b * c },
    ]);
    return { kind: 'order', ...v, points: 2 };
  },
  square(age, rand) {
    const n = ri(rand, 2, age === '12-14' ? 20 : 12);
    return { kind: 'square', text: `${n}²`, answer: n * n, points: age === '12-14' ? 1 : 2 };
  },
  percent(age, rand) {
    if (age !== '12-14') {
      const p = pick(rand, [10, 25, 50]);
      const n = (100 / p) * ri(rand, 1, 10) * (p === 10 ? 1 : 2);
      return { kind: 'percent', text: `${p}% nan ${n}`, answer: (n * p) / 100, points: 2 };
    }
    const p = pick(rand, [5, 10, 15, 20, 25, 30, 40, 50, 75, 90]);
    const base = ri(rand, 1, 20) * (p % 25 === 0 ? 4 : p % 10 === 0 ? 10 : 20);
    return { kind: 'percent', text: `${p}% nan ${base}`, answer: Math.round((base * p) / 100), points: 2 };
  },
  remainder(age, rand) {
    const b = ri(rand, 3, 9), q = ri(rand, 2, 12), r = ri(rand, 1, b - 1);
    return { kind: 'remainder', text: `${q * b + r} ÷ ${b}`, ask: 'Rès la = ?', answer: r, points: 2 };
  },
  eq1(age, rand) {
    // one-step equations: x + a = b ; x − a = b ; a·x = b ; x ÷ a = b
    const x = ri(rand, age === '12-14' ? -12 : 1, 20);
    const a = ri(rand, 2, 12);
    const v = pick(rand, [
      { text: `x + ${a} = ${x + a}` }, { text: `x − ${a} = ${x - a}` }, { text: `${a}x = ${a * x}` }, { text: `x ÷ ${a} = ${x}`, ans: x * a },
    ]);
    return { kind: 'eq1', text: v.text, ask: 'x = ?', answer: 'ans' in v ? (v.ans as number) : x, points: age === '12-14' ? 1 : 2 };
  },
  eq2(age, rand) {
    // two-step: ax + b = c ; ax − b = c ; (x + a) × b = c ; a − x = c
    const x = ri(rand, -10, 15), a = ri(rand, 2, 9), b = ri(rand, 1, 15);
    const v = pick(rand, [
      { text: `${a}x + ${b} = ${a * x + b}` }, { text: `${a}x − ${b} = ${a * x - b}` },
      { text: `(x + ${b}) × ${a} = ${(x + b) * a}` }, { text: `${b} − x = ${b - x}` }, { text: `${a}(x − ${b}) = ${a * (x - b)}` },
    ]);
    return { kind: 'eq2', text: v.text, ask: 'x = ?', answer: x, points: 2 };
  },
  neg(age, rand) {
    const a = ri(rand, -20, 20), b = ri(rand, -20, 20);
    const v = pick(rand, [
      { text: `${fmt(a)} + ${fmt(b)}`, answer: a + b }, { text: `${fmt(a)} − ${fmt(b)}`, answer: a - b },
      { text: `${fmt(ri(rand, -9, -2))} × ${ri(rand, 2, 9)}`, answer: NaN },
    ]);
    if (Number.isNaN(v.answer)) { const m = /\((-?\d+)\) × (\d+)/.exec(v.text)!; v.answer = Number(m[1]) * Number(m[2]); }
    return { kind: 'neg', ...v, points: 1 };
  },
  power(age, rand) {
    const v = pick(rand, [
      { b: 2, e: ri(rand, 3, 8) }, { b: 3, e: ri(rand, 2, 4) }, { b: 5, e: ri(rand, 2, 3) }, { b: 10, e: ri(rand, 2, 4) }, { b: ri(rand, 4, 9), e: 3 },
    ]);
    const sup = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'][v.e];
    return { kind: 'power', text: `${v.b}${sup}`, answer: Math.pow(v.b, v.e), points: 2 };
  },
  sqrt(age, rand) {
    const n = ri(rand, 2, 15);
    return { kind: 'sqrt', text: `√${n * n}`, answer: n, points: 1 };
  },
  fraction_of(age, rand) {
    const d = pick(rand, [2, 3, 4, 5, 6, 8, 10]), n = ri(rand, 1, d - 1), k = ri(rand, 2, 12);
    return { kind: 'fraction_of', text: `${n}/${d} nan ${d * k}`, answer: n * k, points: 2 };
  },
  average(age, rand) {
    const m = ri(rand, 3, 30), n = pick(rand, [3, 4]);
    const vals: number[] = []; let sum = 0;
    for (let i = 0; i < n - 1; i++) { const v = ri(rand, Math.max(0, m - 10), m + 10); vals.push(v); sum += v; }
    const last = m * n - sum; if (last < 0) return G.average(age, rand);
    vals.push(last);
    return { kind: 'average', text: `${vals.join(', ')}`, ask: 'Mwayèn nan = ?', answer: m, points: 2 };
  },
  compare_diff(age, rand) {
    const a = ri(rand, 10, 999), b = ri(rand, 10, 999);
    return { kind: 'compare_diff', text: `${a} ak ${b}`, ask: 'Ki diferans ant yo?', answer: Math.abs(a - b), points: 1 };
  },
  unit(age, rand) {
    const v = pick(rand, [
      { k: ri(rand, 1, 9), text: (k: number) => `${k} km = ? m`, f: (k: number) => k * 1000 },
      { k: ri(rand, 1, 9), text: (k: number) => `${k} m = ? cm`, f: (k: number) => k * 100 },
      { k: ri(rand, 1, 5), text: (k: number) => `${k} è = ? minit`, f: (k: number) => k * 60 },
      { k: ri(rand, 2, 12) * 5, text: (k: number) => `${k} minit = ? segonn`, f: (k: number) => k * 60 },
      { k: ri(rand, 1, 9), text: (k: number) => `${k} kg = ? g`, f: (k: number) => k * 1000 },
      { k: ri(rand, 1, 3), text: (k: number) => `${k} jou = ? è`, f: (k: number) => k * 24 },
    ]);
    return { kind: 'unit', text: v.text(v.k), answer: v.f(v.k), points: 1 };
  },
};

/** Which kinds each age band gets, with weights (more weight = more often). */
const MIX: Record<AgeBand, [MathKind, number][]> = {
  '6-8':   [['add', 5], ['sub', 4], ['double', 2], ['half', 1], ['missing', 2], ['sequence', 2]],
  '9-11':  [['add', 3], ['sub', 3], ['mul', 5], ['div', 3], ['double', 1], ['half', 1], ['missing', 3], ['sequence', 2], ['order', 2], ['square', 2], ['percent', 2], ['eq1', 1], ['unit', 1]],
  '12-14': [['mul', 2], ['div', 2], ['order', 3], ['square', 1], ['percent', 3], ['remainder', 1], ['eq1', 3], ['eq2', 3], ['neg', 3], ['power', 2], ['sqrt', 2], ['fraction_of', 2], ['average', 1], ['compare_diff', 1], ['unit', 1], ['sequence', 1]],
};

export const kindsFor = (age: AgeBand): MathKind[] => MIX[age].map(([k]) => k);

export function makeProblem(age: AgeBand, rand: Rand, kind?: MathKind): MathProblem {
  if (!kind) {
    const total = MIX[age].reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [k, w] of MIX[age]) { r -= w; if (r < 0) { kind = k; break; } }
    kind ??= MIX[age][0][0];
  }
  const p = G[kind](age, rand);
  const text = p.text.replace(/-(\d)/g, '−$1'); // typographic minus for negatives
  return { ...p, text, textFr: mathTextFr(text), ...(p.ask !== undefined ? { askFr: ASK_FR[p.ask] ?? p.ask } : {}) };
}

/** The few Kreyòl words that appear in problems, in French. */
const ASK_FR: Record<string, string> = {
  'Doub li': 'Son double', 'Mwatye li': 'Sa moitié', 'Ki nimewo ki vini apre?': 'Quel nombre vient ensuite ?',
  'Rès la = ?': 'Le reste = ?', 'Mwayèn nan = ?': 'La moyenne = ?', 'Ki diferans ant yo?': 'Quelle est la différence ?',
  '? = ': '? = ', 'x = ?': 'x = ?',
};
export function mathTextFr(text: string): string {
  return text
    .replace(/ nan /g, ' de ')
    .replace(/ ak /g, ' et ')
    .replace(/(\d) è\b/g, '$1 h').replace(/\? è$/, '? h')
    .replace(/\bminit\b/g, 'min')
    .replace(/\bsegonn\b/g, 's')
    .replace(/(\d) jou\b/g, (_m, d) => `${d} ${d === '1' ? 'jour' : 'jours'}`);
}

/** True when an answer can be negative for this band (the number pad shows a − key). */
export const allowsNegative = (age: AgeBand) => age === '12-14';

export interface MathRun { age: AgeBand; seed: number; i: number; score: number; misses: number; combo: number; best: number; current: MathProblem; durationMs: number; endsAt: number; history: { kind: MathKind; ok: boolean }[] }

export function startMath(age: AgeBand, seed: number, now: number, durationMs = 60_000): MathRun {
  const rand = rng(seed);
  return { age, seed, i: 0, score: 0, misses: 0, combo: 0, best: 0, current: makeProblem(age, rand), durationMs, endsAt: now + durationMs, history: [] };
}

/** Submit an answer; returns the next state. A combo of 5+ doubles the points. Problems are deterministic per seed. */
export function answerMath(r: MathRun, value: number, now: number): MathRun {
  if (now >= r.endsAt) return r;
  if (value === r.current.answer) {
    const rand = rng(r.seed);
    for (let k = 0; k <= r.i; k++) makeProblem(r.age, rand); // replay to the next deterministic problem
    const next = makeProblem(r.age, rand);
    const combo = r.combo + 1;
    const pts = r.current.points * (combo >= 5 ? 2 : 1);
    return { ...r, i: r.i + 1, score: r.score + pts, combo, best: Math.max(r.best, combo), current: next, history: [...r.history, { kind: r.current.kind, ok: true }] };
  }
  return { ...r, misses: r.misses + 1, combo: 0, history: [...r.history, { kind: r.current.kind, ok: false }] };
}

/** Skip the current problem (counts as a miss, breaks the combo). */
export function skipMath(r: MathRun, now: number): MathRun {
  if (now >= r.endsAt) return r;
  const rand = rng(r.seed);
  for (let k = 0; k <= r.i; k++) makeProblem(r.age, rand);
  const next = makeProblem(r.age, rand);
  return { ...r, i: r.i + 1, misses: r.misses + 1, combo: 0, current: next, history: [...r.history, { kind: r.current.kind, ok: false }] };
}

/** XP for a finished run (the table lives in progress/xp.ts). */
export const mathXp = (r: MathRun) => mathRunXp(r.score);

/** Kinds the kid got wrong most, for the "pratike sa" tip at the end. */
export function weakKinds(r: MathRun, n = 2): MathKind[] {
  const miss: Record<string, number> = {};
  for (const h of r.history) if (!h.ok) miss[h.kind] = (miss[h.kind] ?? 0) + 1;
  return Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k as MathKind);
}

export const KIND_LABEL: Record<MathKind, { ht: string; fr: string }> = {
  add: { ht: 'Adisyon', fr: 'Addition' }, sub: { ht: 'Soustraksyon', fr: 'Soustraction' }, mul: { ht: 'Miltiplikasyon', fr: 'Multiplication' }, div: { ht: 'Divizyon', fr: 'Division' },
  double: { ht: 'Doub', fr: 'Double' }, half: { ht: 'Mwatye', fr: 'Moitié' }, missing: { ht: 'Nimewo ki manke', fr: 'Nombre manquant' }, sequence: { ht: 'Sekans', fr: 'Suite' },
  order: { ht: 'Lòd operasyon', fr: 'Priorité des opérations' }, square: { ht: 'Kare', fr: 'Carré' }, percent: { ht: 'Pousantaj', fr: 'Pourcentage' }, remainder: { ht: 'Rès divizyon', fr: 'Reste' },
  eq1: { ht: 'Ekwasyon senp', fr: 'Équation simple' }, eq2: { ht: 'Ekwasyon 2 etap', fr: 'Équation à 2 étapes' }, neg: { ht: 'Nimewo negatif', fr: 'Nombres négatifs' }, power: { ht: 'Pisans', fr: 'Puissance' },
  sqrt: { ht: 'Rasin kare', fr: 'Racine carrée' }, fraction_of: { ht: 'Fraksyon', fr: 'Fraction' }, average: { ht: 'Mwayèn', fr: 'Moyenne' }, compare_diff: { ht: 'Diferans', fr: 'Différence' }, unit: { ht: 'Inite', fr: 'Unités' },
};
