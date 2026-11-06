/**
 * Question supply for a quiz: the published packs from your server (admin → Pibliye) when we have them,
 * otherwise the bank bundled in the app (content/bank → BANK), plus generated modules.
 */
import { BANK, SAMPLE_QUESTIONS, MODULES, generateMixed, selectQuestions, shuffle, rng, type AgeBand, type CategoryId, type Difficulty, type Question } from '@konesans/core';
import { useRemote, type RemoteCategory } from './remote';
import { colors, CATEGORY_META } from './theme';

/** The bundled bank: until the first proofreading pass, questions still marked `review` are served too; flagged ones never are. */
const INCLUDE_REVIEW = true;
const BUNDLED = [...BANK, ...SAMPLE_QUESTIONS.filter((s) => !BANK.some((b) => b.id === s.id))];
const servable = (q: Question) => q.status === 'approved' || (INCLUDE_REVIEW && q.status === 'review');

/** Server packs are already filtered by the server (approved + review if the admin allows it). */
function allQuestions(): Question[] {
  const { version, packs } = useRemote.getState();
  if (!version) return BUNDLED;
  const out: Question[] = [];
  for (const k of Object.keys(packs)) for (const q of packs[k]) out.push(q.status === 'approved' ? q : { ...q, status: 'approved' });
  return out;
}

export const CATEGORY_ORDER = ['istwa', 'jewografi', 'peyi', 'kilti', 'syans', 'matematik', 'jeneral', 'espo', 'teknoloji'] as const;
export type CatId = string;

export interface CategoryInfo { id: string; ht: string; fr: string; color: string; soft: string; icon: string; isNew: boolean; ages: AgeBand[] }
const AGES_ALL: AgeBand[] = ['6-8', '9-11', '12-14'];
const fromRemote = (c: RemoteCategory): CategoryInfo => ({
  id: c.id, ht: c.name.ht, fr: c.name.fr || c.name.ht, color: c.color, soft: CATEGORY_META[c.id]?.soft ?? c.color + '22',
  icon: c.icon, isNew: c.isNew, ages: c.ages?.length ? c.ages : AGES_ALL,
});
const BUILTIN: CategoryInfo[] = CATEGORY_ORDER.map((id) => ({ id, ...CATEGORY_META[id], isNew: false, ages: AGES_ALL }));

/** Categories to show, in the admin's order (only enabled ones). */
export function useCategories(): CategoryInfo[] {
  const remote = useRemote((s) => s.categories);
  if (!remote?.length) return BUILTIN;
  return remote.filter((c) => c.enabled).sort((a, b) => a.order - b.order).map(fromRemote);
}
/** One category's name/colour/icon (server first, then built-in). */
export function categoryInfo(id: string): CategoryInfo {
  const r = useRemote.getState().categories?.find((c) => c.id === id);
  return r ? fromRemote(r) : BUILTIN.find((c) => c.id === id) ?? { id, ht: id, fr: id, color: colors.blue, soft: colors.blueSoft, icon: 'kesyon', isNew: false, ages: AGES_ALL };
}

export function modulesFor(category: string, age: AgeBand) {
  return MODULES.filter((m) => m.category === category && m.ages.includes(age));
}

/** Build a set for a category ('mix' = all), half from the bank, the rest generated when modules exist. */
export function buildQuestions(category: CatId | 'mix', age: AgeBand, count: number, seed: number, seen: Iterable<string> = [], difficulty?: Difficulty): Question[] {
  const bank = selectQuestions(allQuestions(), { age, category: (category === 'mix' ? 'mix' : category) as CategoryId | 'mix', count, seed, exclude: seen, includeReview: INCLUDE_REVIEW, difficulty });
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
  allQuestions().some((q) => q.category === category && q.ages.includes(age) && servable(q)) || modulesFor(category, age).length > 0;
