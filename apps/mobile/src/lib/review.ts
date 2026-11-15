/**
 * "Revize erè m" (app/review.tsx): which mistakes are due today, and the questions behind them.
 * The spaced-repetition rules live in @konesans/core (progress/srs.ts); the copies of the questions in ./mistakes.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dueReviews, dueReviewCount, dropReviews, DEPARTMENTS, EVENT_QUESTIONS, REVIEW_SESSION_SIZE, shuffleOptions, rng, type Question } from '@konesans/core';
import { useStore, KID_TZ } from './store';
import { useMistakeBank, savedQuestion } from './mistakes';
import { findQuestion } from './content';

function vwayajQuestion(id: string): Question | undefined {
  for (const d of DEPARTMENTS) { const q = d.questions.find((x) => x.id === id); if (q) return q; }
  for (const k of Object.keys(EVENT_QUESTIONS)) { const q = EVENT_QUESTIONS[k].find((x) => x.id === id); if (q) return q; }
  return undefined;
}

/** The question behind a list entry: its saved copy, else the bank / server packs / Vwayaj. */
export const reviewQuestion = (id: string): Question | undefined => savedQuestion(id) ?? findQuestion(id) ?? vwayajQuestion(id);

/**
 * Today's session: up to 10 due mistakes the app can still show (options shuffled again so the kid can't
 * answer by position). Entries whose question is gone (removed from the bank, saved on another phone) are dropped.
 */
export function buildReviewSession(now = Date.now()): Question[] {
  const s = useStore.getState();
  const ids = dueReviews(s.progress, now, Infinity, KID_TZ);
  const out: Question[] = []; const gone: string[] = [];
  const rand = rng(now % 1e9);
  for (const id of ids) {
    if (out.length >= REVIEW_SESSION_SIZE) break;
    const q = reviewQuestion(id);
    if (q) out.push(shuffleOptions(q, rand)); else gone.push(id);
  }
  if (gone.length) useStore.setState((st) => ({ progress: dropReviews(st.progress, gone) }));
  useMistakeBank.getState().keep(out.filter((q) => !useMistakeBank.getState().qs[q.id]));
  return out;
}

/** Mistakes due today (re-checked when the app comes back and at least every minute, so a new day shows them). */
export function useReviewDue(): number {
  const review = useStore((s) => s.progress.review);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 60_000);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') setTick((x) => x + 1); });
    return () => { clearInterval(id); sub.remove(); };
  }, []);
  void tick;
  return dueReviewCount({ ...useStore.getState().progress, review }, Date.now(), KID_TZ);
}
