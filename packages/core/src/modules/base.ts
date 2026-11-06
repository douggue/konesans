import type { AgeBand, CategoryId, LocalizedText, Question } from '../types.js';

/**
 * Generated modules: code produces questions, so there is no content to write.
 * Every generator is a pure function of (age, rand) and returns a normal `Question`,
 * so the quiz engine, duels, scoring and review all work unchanged.
 */
export type Rand = () => number;

export interface GenModule {
  id: string;
  name: LocalizedText;         // shown in the category list
  category: CategoryId;
  ages: AgeBand[];
  generate: (age: AgeBand, rand: Rand) => Question;
}

export const int = (rand: Rand, min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
export const pick = <T>(rand: Rand, arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

/** Build 2–4 unique options around a numeric answer; the answer is always present. */
export function numericOptions(rand: Rand, answer: number, count = 4, spread = 10, min = 0): number[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < count && guard++ < 200) {
    const d = int(rand, 1, spread) * (rand() < 0.5 ? -1 : 1);
    const v = answer + d;
    if (v >= min) set.add(v);
  }
  return shuffleArr([...set], rand);
}

export function shuffleArr<T>(a: T[], rand: Rand): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export const ht = (s: string): LocalizedText => ({ ht: s });

/** Assemble a Question from parts. `opts` are display strings; `answer` is the correct one. */
export function q(mod: GenModule, age: AgeBand, rand: Rand, prompt: LocalizedText, opts: string[], answer: string, explain?: string, media?: Question['media']): Question {
  const uniq = [...new Set(opts)];
  if (!uniq.includes(answer)) uniq.unshift(answer);
  const options = shuffleArr(uniq, rand).slice(0, 4);
  if (!options.includes(answer)) options[0] = answer;
  return {
    id: `${mod.id}:${age}:${Math.floor(rand() * 1e9).toString(36)}`,
    category: mod.category, difficulty: age === '6-8' ? 1 : age === '9-11' ? 2 : 3, ages: [age],
    prompt, options: options.map(ht), answer: options.indexOf(answer),
    explain: explain ? ht(explain) : undefined, media, status: 'approved',
  };
}
