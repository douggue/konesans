/**
 * Defi Jodi a (daily challenge) — shared by the server (server/nakama/src/daily.ts) and the app (src/lib/daily.ts).
 *  - The day is the calendar day in Haiti (America/Port-au-Prince), the same for every phone whatever its clock zone.
 *  - Every kid of an age band gets the SAME questions that day: a deterministic pick from the served bank
 *    (approved + review, never draft), seeded by (day, age band). The server freezes the set the first time it is
 *    asked for, so a publish in the middle of the day does not change it; offline phones run the same pick on
 *    their own copy of the bank (identical when they hold the same published packs).
 *  - Scoring is done from the questions' own answer keys (the server never trusts a client's score).
 * Pure functions: no Intl (the Nakama JS runtime has none), no Date.now inside.
 */
import type { AgeBand, Question } from '../types.js';
import { rng, shuffle, shuffleOptions, scoreAnswer, QUESTION_TIME_MS } from '../quiz/engine.js';

export const DAILY_DEFAULT_COUNT = 10;
export const DAILY_MIN_COUNT = 5;
export const DAILY_MAX_COUNT = 20;
/** Nobody reads a question and taps an answer faster than this; faster claims are scored as this. */
export const DAILY_MIN_ANSWER_MS = 800;
/** How many places the daily ranking shows. */
export const DAILY_TOP = 10;

export const clampDailyCount = (n: unknown): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v > 0 ? Math.min(DAILY_MAX_COUNT, Math.max(DAILY_MIN_COUNT, v)) : DAILY_DEFAULT_COUNT;
};

// ─── Haiti's calendar day ─────────────────────────────────────────────────────
// Haiti follows the US rule: UTC−5, and UTC−4 from the 2nd Sunday of March 02:00 to the 1st Sunday of November 02:00.
const DAY = 86_400_000, HOUR = 3_600_000;
/** UTC ms of the n-th Sunday (1-based) of a month at a given UTC hour. */
function nthSunday(year: number, month0: number, n: number, utcHour: number): number {
  const first = new Date(Date.UTC(year, month0, 1)).getUTCDay(); // 0 = Sunday
  const day = 1 + ((7 - first) % 7) + (n - 1) * 7;
  return Date.UTC(year, month0, day, utcHour);
}
/** Haiti's offset from UTC in hours (−4 in summer time, −5 otherwise) at a UTC instant. */
export function haitiOffsetHours(ms: number): number {
  const y = new Date(ms).getUTCFullYear();
  const start = nthSunday(y, 2, 2, 7); // 02:00 EST = 07:00 UTC
  const end = nthSunday(y, 10, 1, 6);  // 02:00 EDT = 06:00 UTC
  return ms >= start && ms < end ? -4 : -5;
}
/** 'YYYY-MM-DD' in Haiti at a UTC instant. */
export function haitiDay(ms: number): string {
  const d = new Date(ms + haitiOffsetHours(ms) * HOUR);
  const p = (n: number) => (n < 10 ? '0' : '') + n;
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}
/** The day before / after a 'YYYY-MM-DD'. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + n * DAY);
  const p = (x: number) => (x < 10 ? '0' : '') + x;
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}
export const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isAgeBand = (s: unknown): s is AgeBand => s === '6-8' || s === '9-11' || s === '12-14';

/** Stable 32-bit seed for a (day, age band). */
export function dailySeed(day: string, age: AgeBand): number {
  const s = `konesans-daily|${day}|${age}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/**
 * The day's questions for an age band. Deterministic for (pool content, day, age, count) — the pool's order
 * does not matter (sorted by id first). Spreads the set over categories (round robin), options shuffled.
 */
export function pickDaily(pool: readonly Question[], age: AgeBand, day: string, count: number): Question[] {
  const byId = new Map<string, Question>();
  for (const q of pool) if ((q.status === 'approved' || q.status === 'review') && q.ages.includes(age) && q.options.length >= 2 && !byId.has(q.id)) byId.set(q.id, q);
  const ids = [...byId.keys()].sort();
  const rand = rng(dailySeed(day, age));
  const groups = new Map<string, Question[]>();
  for (const id of ids) { const q = byId.get(id)!; const g = groups.get(q.category); if (g) g.push(q); else groups.set(q.category, [q]); }
  const cats = shuffle([...groups.keys()].sort(), rand);
  const queues = cats.map((c) => shuffle(groups.get(c)!, rand));
  const out: Question[] = [];
  for (let round = 0; out.length < count; round++) {
    let took = false;
    for (const qs of queues) { if (out.length >= count) break; if (round < qs.length) { out.push(qs[round]); took = true; } }
    if (!took) break;
  }
  return out.map((q) => shuffleOptions(q, rand));
}

export interface DailyAnswer { /** chosen option index, null = time ran out */ i: number | null; /** time taken on this question */ ms: number }
export interface DailyScore { correct: number; total: number; score: number; ms: number; perQuestion: boolean[] }

/** Score a run from the questions' own answers. Missing answers count as timed out. Speed bonus uses clamped times. */
export function scoreDaily(questions: readonly Question[], answers: readonly (DailyAnswer | null | undefined)[]): DailyScore {
  let combo = 0, score = 0, correct = 0, ms = 0;
  const perQuestion: boolean[] = [];
  questions.forEach((q, k) => {
    const a = answers[k];
    const raw = Number(a?.ms);
    const t = Math.min(QUESTION_TIME_MS, Math.max(DAILY_MIN_ANSWER_MS, Number.isFinite(raw) ? Math.round(raw) : QUESTION_TIME_MS));
    const timedOut = !a || a.i === null || a.i === undefined || !Number.isInteger(a.i) || (Number.isFinite(raw) && raw > QUESTION_TIME_MS + 1500);
    const ok = !timedOut && a!.i === q.answer;
    combo = ok ? combo + 1 : 0;
    score += scoreAnswer({ correct: ok, elapsedMs: t, combo });
    if (ok) correct++;
    ms += timedOut ? QUESTION_TIME_MS : t;
    perQuestion.push(ok);
  });
  return { correct, total: questions.length, score, ms, perQuestion };
}

/** Sort key for the ranking: more correct answers first, then more points, then faster. Fits a leaderboard score. */
export const dailyRankScore = (s: { correct: number; score: number }) => s.correct * 1000 + Math.min(999, s.score);
export const dailyRankSubscore = (s: { ms: number }) => Math.max(0, 10_000_000 - Math.round(s.ms));
