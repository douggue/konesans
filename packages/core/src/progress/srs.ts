import type { Progress, ReviewItem } from '../types.js';
import { localDay } from './streak.js';

/**
 * "Revize erè m" — light spaced repetition for mistakes (Leitner boxes 1 → 2 → 3).
 * - A wrong answer anywhere (quiz, lesson, Vwayaj, Defi Jodi a, duel) puts the question in box 1, due tomorrow.
 * - Right in a review: box 1 → box 2 (due in 3 days); box 2 → box 3 = metrize: it leaves the list.
 *   So a question leaves after being answered right twice, on two different days (a second right answer
 *   on the same day does not count). Box 3 (7 days) is "metrize": it is not kept in the list any more.
 * - Wrong in a review: back to box 1, due tomorrow.
 * Days are the kid's local days ('YYYY-MM-DD'); `due` of saves made before this used ISO times (still read fine).
 */
export const REVIEW_INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7 } as const;
/** Mistakes kept at most (oldest misses dropped first): the list stays a short, doable daily task. */
export const REVIEW_MAX_ITEMS = 120;
/** Questions in one review session. */
export const REVIEW_SESSION_SIZE = 10;

const DAY = 86_400_000;
const addDays = (day: string, n: number) => new Date(Date.parse(day + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
/** The day an item is due ('YYYY-MM-DD'), for both the new day format and old ISO times. */
const dueDay = (r: ReviewItem) => String(r.due).slice(0, 10);
const boxOf = (r: ReviewItem): 1 | 2 => (r.box >= 2 ? 2 : 1);

function cap(review: Record<string, ReviewItem>): Record<string, ReviewItem> {
  const ids = Object.keys(review);
  if (ids.length <= REVIEW_MAX_ITEMS) return review;
  // too many: the oldest overdue ones go first (the fresh mistakes matter most)
  ids.sort((a, b) => (dueDay(review[a]) < dueDay(review[b]) ? -1 : dueDay(review[a]) > dueDay(review[b]) ? 1 : 0));
  const out: Record<string, ReviewItem> = {};
  for (const id of ids.slice(ids.length - REVIEW_MAX_ITEMS)) out[id] = review[id];
  return out;
}

/** A wrong answer (in any mode): box 1, due tomorrow. `tz` = the kid's time zone. */
export function noteWrong(p: Progress, questionId: string, now: number, tz = 'UTC'): Progress {
  const prev = p.review[questionId];
  const item: ReviewItem = { box: 1, due: addDays(localDay(now, tz), REVIEW_INTERVAL_DAYS[1]), misses: (prev?.misses ?? 0) + 1 };
  return { ...p, review: cap({ ...p.review, [questionId]: item }) };
}

export type ReviewOutcome = 'missed' | 'promoted' | 'mastered' | 'same_day' | 'unknown';

/** One answer in a review session. `mastered`: it left the list (second right answer, on another day). */
export function reviewAnswer(p: Progress, questionId: string, correct: boolean, now: number, tz = 'UTC'): { progress: Progress; outcome: ReviewOutcome } {
  const prev = p.review[questionId];
  if (!prev) return { progress: p, outcome: 'unknown' };
  if (!correct) return { progress: noteWrong(p, questionId, now, tz), outcome: 'missed' };
  const today = localDay(now, tz);
  // right again on the same day: no promotion, it comes back tomorrow
  if (prev.right === today) return { progress: { ...p, review: { ...p.review, [questionId]: { ...prev, due: addDays(today, 1) } } }, outcome: 'same_day' };
  const box = boxOf(prev) + 1;
  if (box >= 3) { const { [questionId]: _, ...rest } = p.review; return { progress: { ...p, review: rest }, outcome: 'mastered' }; }
  const item: ReviewItem = { ...prev, box: 2, due: addDays(today, REVIEW_INTERVAL_DAYS[2]), right: today };
  return { progress: { ...p, review: { ...p.review, [questionId]: item } }, outcome: 'promoted' };
}

/** Compatibility wrapper (older callers). */
export function noteReviewed(p: Progress, questionId: string, correct: boolean, now: number, tz = 'UTC'): Progress {
  return reviewAnswer(p, questionId, correct, now, tz).progress;
}

/** Question ids due for review today, most overdue first (then most missed). */
export function dueReviews(p: Progress, now: number, limit = REVIEW_SESSION_SIZE, tz = 'UTC'): string[] {
  const today = localDay(now, tz);
  return Object.entries(p.review)
    .filter(([, r]) => dueDay(r) <= today)
    .sort((a, b) => (dueDay(a[1]) < dueDay(b[1]) ? -1 : dueDay(a[1]) > dueDay(b[1]) ? 1 : (b[1].misses ?? 0) - (a[1].misses ?? 0)))
    .slice(0, limit)
    .map(([id]) => id);
}

/** How many mistakes are due today (all of them, not capped at a session). */
export const dueReviewCount = (p: Progress, now: number, tz = 'UTC') => dueReviews(p, now, Infinity, tz).length;

/** Drop list entries the app can no longer show (question removed from the bank, no saved copy). */
export function dropReviews(p: Progress, ids: string[]): Progress {
  if (!ids.some((id) => id in p.review)) return p;
  const review = { ...p.review };
  for (const id of ids) delete review[id];
  return { ...p, review };
}

/** XP for a finished review session: the session bonus + 2 per right answer, capped like any activity (15–35). */
export const reviewXp = (correct: number) => (correct > 0 ? Math.min(40, 15 + 2 * correct) : 5);
