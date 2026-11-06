/** Question supply for a quiz: hand-written bank (SAMPLE_QUESTIONS for now; content packs later) + generated modules. */
import { SAMPLE_QUESTIONS, MODULES, generateMixed, selectQuestions, shuffle, rng, type AgeBand, type Question } from '@konesans/core';

export const CATEGORY_ORDER = ['istwa', 'jewografi', 'peyi', 'kilti', 'syans', 'matematik', 'jeneral', 'espo', 'teknoloji'] as const;
export type CatId = (typeof CATEGORY_ORDER)[number];

export function modulesFor(category: string, age: AgeBand) {
  return MODULES.filter((m) => m.category === category && m.ages.includes(age));
}

/** Build a set for a category ('mix' = all), half from the bank, the rest generated when modules exist. */
export function buildQuestions(category: CatId | 'mix', age: AgeBand, count: number, seed: number, seen: Iterable<string> = []): Question[] {
  const bank = selectQuestions(SAMPLE_QUESTIONS, { age, category: category === 'mix' ? 'mix' : category, count, seed, exclude: seen });
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
  SAMPLE_QUESTIONS.some((q) => q.category === category && q.ages.includes(age) && q.status === 'approved') || modulesFor(category, age).length > 0;
