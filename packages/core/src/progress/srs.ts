import type { Progress, ReviewItem } from '../types.js';

/**
 * Spaced repetition for mistakes (Leitner boxes). A wrong answer enters box 0
 * and comes back soon; each correct review moves it up a box and pushes it
 * further out. After box 4 it leaves the review queue.
 */
const INTERVAL_DAYS = [0, 1, 3, 7, 14] as const; // by box
const DAY = 86_400_000;

export function noteWrong(p: Progress, questionId: string, now: number): Progress {
  const prev = p.review[questionId];
  const item: ReviewItem = { box: 0, due: new Date(now + 20 * 60_000).toISOString(), misses: (prev?.misses ?? 0) + 1 };
  return { ...p, review: { ...p.review, [questionId]: item } };
}

export function noteReviewed(p: Progress, questionId: string, correct: boolean, now: number): Progress {
  const prev = p.review[questionId];
  if (!prev) return p;
  if (!correct) return noteWrong(p, questionId, now);
  if (prev.box >= 4) { const { [questionId]: _, ...rest } = p.review; return { ...p, review: rest }; }
  const box = (prev.box + 1) as ReviewItem['box'];
  return { ...p, review: { ...p.review, [questionId]: { ...prev, box, due: new Date(now + INTERVAL_DAYS[box] * DAY).toISOString() } } };
}

/** Question ids due for review, most overdue first. */
export function dueReviews(p: Progress, now: number, limit = 10): string[] {
  return Object.entries(p.review)
    .filter(([, r]) => Date.parse(r.due) <= now)
    .sort((a, b) => Date.parse(a[1].due) - Date.parse(b[1].due))
    .slice(0, limit)
    .map(([id]) => id);
}
