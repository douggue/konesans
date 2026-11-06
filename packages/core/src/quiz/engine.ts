import type { AgeBand, CategoryId, Question } from '../types.js';

/** Deterministic PRNG (mulberry32) so the server and tests can reproduce a session from a seed. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface SelectOptions {
  age: AgeBand;
  category?: CategoryId | 'mix';
  count: number;
  seed: number;
  /** Question ids seen recently; avoided unless the pool is too small. */
  exclude?: Iterable<string>;
  /** Ids to prioritize (e.g. due review items). */
  prefer?: Iterable<string>;
  /** Also serve questions still waiting for proofreading (`review`). Flagged (`draft`) questions are never served. */
  includeReview?: boolean;
}

/**
 * Pick questions for a session. Rules:
 *  - only `approved` questions (plus `review` when includeReview), matching the age band (and category unless 'mix')
 *  - preferred ids first (review), then unseen, then seen (if needed)
 *  - options are shuffled per question, answer index remapped
 */
export function selectQuestions(bank: Question[], opt: SelectOptions): Question[] {
  const rand = rng(opt.seed);
  const exclude = new Set(opt.exclude ?? []);
  const prefer = new Set(opt.prefer ?? []);
  const pool = bank.filter((q) => (q.status === 'approved' || (opt.includeReview && q.status === 'review')) && q.ages.includes(opt.age) && (!opt.category || opt.category === 'mix' || q.category === opt.category));
  const preferred = shuffle(pool.filter((q) => prefer.has(q.id)), rand);
  const fresh = shuffle(pool.filter((q) => !prefer.has(q.id) && !exclude.has(q.id)), rand);
  const seen = shuffle(pool.filter((q) => !prefer.has(q.id) && exclude.has(q.id)), rand);
  const picked = [...preferred, ...fresh, ...seen].slice(0, opt.count);
  return picked.map((q) => shuffleOptions(q, rand));
}

export function shuffleOptions(q: Question, rand: () => number): Question {
  const idx = shuffle(q.options.map((_, i) => i), rand);
  return { ...q, options: idx.map((i) => q.options[i]), answer: idx.indexOf(q.answer) };
}

// ---------- Scoring ----------

export const QUESTION_TIME_MS = 15_000;

export interface ScoreInput { correct: boolean; elapsedMs: number; combo: number; usedHint?: boolean }

/**
 * Points for one answer. Base 10, up to +5 for speed (linear over the timer),
 * +1 per combo step from 3 up (max +5), halved if a hint was used, 0 if wrong.
 */
export function scoreAnswer(i: ScoreInput, timeMs = QUESTION_TIME_MS): number {
  if (!i.correct) return 0;
  const speed = Math.round(5 * Math.max(0, 1 - Math.min(i.elapsedMs, timeMs) / timeMs));
  const comboBonus = Math.min(5, Math.max(0, i.combo - 2));
  const pts = 10 + speed + comboBonus;
  return i.usedHint ? Math.ceil(pts / 2) : pts;
}

// ---------- Solo session (pure state machine) ----------

export interface AnswerRecord { questionId: string; chosen: number | null; correct: boolean; elapsedMs: number; points: number }

export interface SoloSession {
  questions: Question[];
  index: number;
  answers: AnswerRecord[];
  combo: number;
  score: number;
  startedAt: number; // ms
  questionStartedAt: number;
  finished: boolean;
}

export function startSolo(questions: Question[], now: number): SoloSession {
  return { questions, index: 0, answers: [], combo: 0, score: 0, startedAt: now, questionStartedAt: now, finished: questions.length === 0 };
}

/** Answer the current question. `chosen === null` means time ran out. */
export function answerSolo(s: SoloSession, chosen: number | null, now: number, usedHint = false): SoloSession {
  if (s.finished) return s;
  const q = s.questions[s.index];
  const elapsedMs = Math.max(0, now - s.questionStartedAt);
  const timedOut = chosen === null || elapsedMs > QUESTION_TIME_MS;
  const correct = !timedOut && chosen === q.answer;
  const combo = correct ? s.combo + 1 : 0;
  const points = scoreAnswer({ correct, elapsedMs, combo, usedHint });
  const answers = [...s.answers, { questionId: q.id, chosen: timedOut ? null : chosen, correct, elapsedMs, points }];
  const index = s.index + 1;
  return { ...s, answers, combo, score: s.score + points, index, questionStartedAt: now, finished: index >= s.questions.length };
}

export const soloSummary = (s: SoloSession) => ({
  total: s.questions.length,
  correct: s.answers.filter((a) => a.correct).length,
  score: s.score,
  wrongIds: s.answers.filter((a) => !a.correct).map((a) => a.questionId),
  durationMs: s.answers.reduce((a, r) => a + r.elapsedMs, 0),
});
