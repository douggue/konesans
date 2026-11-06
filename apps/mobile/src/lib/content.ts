/** Question supply for a quiz: the authored bank (content/bank → BANK) + generated modules. */
import { BANK, SAMPLE_QUESTIONS, MODULES, generateMixed, selectQuestions, shuffle, rng, type AgeBand, type Question } from '@konesans/core';

/** Until the first proofreading pass is done, questions still marked `review` are served too; flagged ones never are. */
const INCLUDE_REVIEW = true;
const ALL = [...BANK, ...SAMPLE_QUESTIONS.filter((s) => !BANK.some((b) => b.id === s.id))];
const servable = (q: Question) => q.status === 'approved' || (INCLUDE_REVIEW && q.status === 'review');

export const CATEGORY_ORDER = ['istwa', 'jewografi', 'peyi', 'kilti', 'syans', 'matematik', 'jeneral', 'espo', 'teknoloji'] as const;
export type CatId = (typeof CATEGORY_ORDER)[number];

export function modulesFor(category: string, age: AgeBand) {
  return MODULES.filter((m) => m.category === category && m.ages.includes(age));
}

/** Build a set for a category ('mix' = all), half from the bank, the rest generated when modules exist. */
export function buildQuestions(category: CatId | 'mix', age: AgeBand, count: number, seed: number, seen: Iterable<string> = []): Question[] {
  const bank = selectQuestions(ALL, { age, category: category === 'mix' ? 'mix' : category, count, seed, exclude: seen, includeReview: INCLUDE_REVIEW });
  const mods = category === 'mix' ? MODULES.filter((m) => m.ages.includes(age)) : modulesFor(category, age);
  const gen = mods.length ? generateMixed(mods.map((m) => m.id), age, count, seed + 7) : [];
  const out: Question[] = [];
  const rand = rng(seed + 3);
  // interleave: bank questions are more interesting, generated ones keep sets full
  const b = bank.slice(), g = gen.slice();
  while (out.length < count && (b.length || g.length)) {
    const takeBank = b.length && (!g.length || rand() < 0.5);
    out.push(takeBank ? b.shift()! : g.shift()!);
  }
  return shuffle(out, rand);
}

/** Does this category have anything to play for this age? */
export const hasContent = (category: CatId, age: AgeBand) =>
  ALL.some((q) => q.category === category && q.ages.includes(age) && servable(q)) || modulesFor(category, age).length > 0;
