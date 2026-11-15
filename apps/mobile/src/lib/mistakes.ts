/**
 * "Revize erè m" — the questions behind the kid's mistakes list (progress.review in the main store).
 * - `rememberQuestion`: every question the kid sees goes through QuestionView, which drops it here (in memory,
 *   the last few hundred) with the outcome once it is revealed. So any mode (quiz, Peyi, Defi Jodi a, Vwayaj,
 *   duels, generated maths/countries) can hand its wrong answers to the list without changing its screen.
 * - `useMistakeBank`: a saved copy of each question that is on the list (persisted, key 'konesans-mistakes'),
 *   because generated questions (and server packs that change) can't be found again from their id alone.
 * This file imports no other app module (the main store imports it).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Question } from '@konesans/core';

const RECENT_MAX = 300;
const recent = new Map<string, { q: Question; ok?: boolean }>();

/** A question was shown (`ok` undefined) or answered (`ok` = right / wrong). Valid questions only. */
export function rememberQuestion(q: Question, ok?: boolean) {
  if (!q?.id || !Array.isArray(q.options) || q.options.length < 2 || !(q.answer >= 0 && q.answer < q.options.length)) {
    // an online duel question has no answer until the reveal: keep only the outcome when we already know it
    if (q?.id && recent.has(q.id) && ok !== undefined) recent.set(q.id, { ...recent.get(q.id)!, ok });
    return;
  }
  const prev = recent.get(q.id);
  recent.delete(q.id);
  recent.set(q.id, { q, ok: ok ?? prev?.ok });
  if (recent.size > RECENT_MAX) recent.delete(recent.keys().next().value as string);
}
/** A question seen recently (full data). */
export const recentQuestion = (id: string): Question | undefined => recent.get(id)?.q;
/** Of these ids, the ones the kid got wrong the last time they were shown. */
export const recentWrongIds = (ids: string[]): string[] => ids.filter((id) => recent.get(id)?.ok === false);

interface MistakeBank {
  qs: Record<string, Question>;
  /** save copies (the list keeps them until the question is mastered) */
  keep: (qs: Question[]) => void;
  /** drop copies that are no longer on the list */
  prune: (onList: string[]) => void;
  reset: () => void;
}

const slim = (q: Question): Question => ({ id: q.id, category: q.category, difficulty: q.difficulty, ages: q.ages, prompt: q.prompt, options: q.options, answer: q.answer, status: 'approved', ...(q.explain ? { explain: q.explain } : {}), ...(q.media ? { media: q.media } : {}), ...(q.topic ? { topic: q.topic } : {}) });

export const useMistakeBank = create<MistakeBank>()(
  persist(
    (set, get) => ({
      qs: {},
      keep: (qs) => {
        const ok = qs.filter((q) => q?.id && q.options?.length >= 2 && q.answer >= 0 && q.answer < q.options.length);
        if (ok.length) set({ qs: { ...get().qs, ...Object.fromEntries(ok.map((q) => [q.id, slim(q)])) } });
      },
      prune: (onList) => {
        const keepSet = new Set(onList); const cur = get().qs;
        const ids = Object.keys(cur);
        if (ids.every((id) => keepSet.has(id))) return;
        set({ qs: Object.fromEntries(ids.filter((id) => keepSet.has(id)).map((id) => [id, cur[id]])) });
      },
      reset: () => { recent.clear(); set({ qs: {} }); },
    }),
    { name: 'konesans-mistakes', version: 1, storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ qs: s.qs }) },
  ),
);

/** A question for the mistakes list: a saved copy, else one seen recently. */
export const savedQuestion = (id: string): Question | undefined => useMistakeBank.getState().qs[id] ?? recentQuestion(id);
