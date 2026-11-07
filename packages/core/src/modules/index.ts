import type { AgeBand, Question } from '../types.js';
import { rng } from '../quiz/engine.js';
import { shuffleOptions } from '../quiz/engine.js';
import { MATH_MODULES } from './math.js';
import { COUNTRY_MODULES } from './countries.js';
import { basicsGen } from '../coding/basics.js';
import type { GenModule } from './base.js';

export * from './base.js';
export * from './math.js';
export * from './countries.js';
export * from './daily.js';

/** Registry of every generated module. The app lists these next to authored categories. */
export const MODULES: GenModule[] = [...MATH_MODULES, ...COUNTRY_MODULES, basicsGen];
export const moduleById = (id: string) => MODULES.find((m) => m.id === id);
export const modulesForAge = (age: AgeBand) => MODULES.filter((m) => m.ages.includes(age));

/**
 * Generate a set of questions for a module. Deterministic for (moduleId, age, seed),
 * so a duel's two devices (or the server) can produce the same set. De-duplicates prompts.
 */
export function generateSet(moduleId: string, age: AgeBand, count: number, seed: number): Question[] {
  const mod = moduleById(moduleId);
  if (!mod || !mod.ages.includes(age)) return [];
  const rand = rng(seed);
  const out: Question[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard++ < count * 20) {
    const q = mod.generate(age, rand);
    const key = q.prompt.ht + '|' + (q.media?.ref ?? '') + '|' + q.options[q.answer].ht;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(shuffleOptions(q, rand));
  }
  return out;
}

/** A mixed set across several modules (e.g. a "Matematik" daily challenge). */
export function generateMixed(moduleIds: string[], age: AgeBand, count: number, seed: number): Question[] {
  const rand = rng(seed);
  const per = moduleIds.filter((id) => moduleById(id)?.ages.includes(age));
  if (!per.length) return [];
  const out: Question[] = [];
  for (let i = 0; i < count; i++) {
    const id = per[i % per.length];
    out.push(...generateSet(id, age, 1, Math.floor(rand() * 1e9)));
  }
  return out;
}
