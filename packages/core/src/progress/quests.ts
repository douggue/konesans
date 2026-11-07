import type { AgeBand, Progress, QuestKind, QuestState } from '../types.js';
import { rng } from '../quiz/engine.js';

export * from './ranks.js';

/** Events the app emits; quests and badges listen to these. */
export type GameEvent =
  | { type: 'duel_end'; won: boolean; draw: boolean }
  | { type: 'lesson_done'; course: string }
  | { type: 'math_run'; score: number }
  /** one answered question, from any mode: category quiz, Peyi, Vwayaj ('vwayaj'), duel ('duel'), Kalkil Mantal ('math') */
  | { type: 'answer'; correct: boolean; category: string }
  | { type: 'review_done'; count: number }
  | { type: 'coding_done'; levelId: number };

/** Answers from these modes count for "answer correctly" but not for "play a category". */
const NOT_A_CATEGORY = ['mix', 'math', 'duel'];

type Goal = number | Record<AgeBand, number>;
/**
 * weight 0 = not handed out (the app has no screen that can complete it yet).
 * Goals scale with the age band where the effort differs (a 6-year-old types answers slowly on the keypad).
 */
const TEMPLATES: { kind: QuestKind; goal: Goal; xp: number; weight: number }[] = [
  { kind: 'win_duel', goal: 1, xp: 20, weight: 3 },
  { kind: 'finish_lessons', goal: { '6-8': 1, '9-11': 2, '12-14': 2 }, xp: 30, weight: 3 },
  { kind: 'math_score', goal: { '6-8': 8, '9-11': 12, '12-14': 15 }, xp: 25, weight: 2 },
  { kind: 'answer_correct', goal: { '6-8': 8, '9-11': 10, '12-14': 12 }, xp: 20, weight: 3 },
  { kind: 'play_category', goal: { '6-8': 4, '9-11': 5, '12-14': 5 }, xp: 15, weight: 2 },
  { kind: 'coding_level', goal: { '6-8': 1, '9-11': 2, '12-14': 2 }, xp: 20, weight: 2 },
  { kind: 'review_mistakes', goal: 5, xp: 25, weight: 0 },
];
const goalFor = (g: Goal, age: AgeBand) => (typeof g === 'number' ? g : g[age] ?? g['9-11']);
const ACTIVE = TEMPLATES.filter((t) => t.weight > 0);
export const questKindActive = (k: QuestKind) => ACTIVE.some((t) => t.kind === k);

const seed = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/** Three quests per day, deterministic for (userId, day) so devices agree offline. Goals follow the age band. */
export function dailyQuests(userId: string, day: string, age: AgeBand = '9-11'): QuestState[] {
  const rand = rng(seed(userId + day));
  const pool = ACTIVE.flatMap((t) => Array(t.weight).fill(t));
  const picked: QuestState[] = [];
  while (picked.length < 3) {
    const t = pool[Math.floor(rand() * pool.length)];
    if (!picked.some((q) => q.kind === t.kind)) picked.push({ id: `${day}:${t.kind}`, kind: t.kind, goal: goalFor(t.goal, age), progress: 0, xp: t.xp, done: false });
  }
  return picked;
}

/**
 * Ensure today's quests exist (rolls over at local midnight).
 * Same day: keeps progress, but swaps out any unfinished quest the app can no longer complete
 * (a kind that was retired after the quests were handed out), so the chest stays reachable.
 */
export function ensureQuests(p: Progress, userId: string, day: string, age: AgeBand = '9-11'): Progress {
  if (p.questsDay !== day) return { ...p, questsDay: day, quests: dailyQuests(userId, day, age) };
  if (p.quests.every((q) => q.done || questKindActive(q.kind))) return p;
  const rand = rng(seed(userId + day + ':swap'));
  const quests = [...p.quests];
  for (let i = 0; i < quests.length; i++) {
    const q = quests[i];
    if (q.done || questKindActive(q.kind)) continue;
    const free = ACTIVE.filter((t) => !quests.some((x) => x.kind === t.kind));
    const t = free[Math.floor(rand() * free.length)];
    if (t) quests[i] = { id: `${day}:${t.kind}`, kind: t.kind, goal: goalFor(t.goal, age), progress: 0, xp: t.xp, done: false };
  }
  return { ...p, quests };
}

/** Advance quests from an event. Returns new progress (quest XP already added to `xp`) and the XP newly awarded. */
export function applyEvent(p: Progress, e: GameEvent): { progress: Progress; xpAwarded: number } {
  let xpAwarded = 0;
  const quests = p.quests.map((q) => {
    if (q.done) return q;
    let add = 0;
    switch (q.kind) {
      case 'win_duel': add = e.type === 'duel_end' && e.won ? 1 : 0; break;
      case 'finish_lessons': add = e.type === 'lesson_done' ? 1 : 0; break;
      case 'math_score': add = e.type === 'math_run' ? Math.max(0, e.score - q.progress) : 0; break; // best score counts
      case 'answer_correct': add = e.type === 'answer' && e.correct ? 1 : 0; break;
      case 'play_category': add = e.type === 'answer' && !NOT_A_CATEGORY.includes(e.category) ? 1 : 0; break; // any answer, in a chosen category
      case 'review_mistakes': add = e.type === 'review_done' ? e.count : 0; break;
      case 'coding_level': add = e.type === 'coding_done' ? 1 : 0; break;
    }
    if (!add) return q;
    const progress = Math.min(q.goal, q.progress + add);
    const done = progress >= q.goal;
    if (done) xpAwarded += q.xp;
    return { ...q, progress, done };
  });
  return { progress: { ...p, quests, xp: p.xp + xpAwarded }, xpAwarded };
}

export const CHEST_BONUS_XP = 100;
export const CHEST_BONUS_COINS = 50;
export const chestReady = (p: Progress) => p.quests.length === 3 && p.quests.every((q) => q.done);

// ─── Daily chest + weekly missions ──────────────────────────────────────────

/** Kept by the app next to Progress. */
export interface MissionLog {
  /** local day the daily chest was last opened */
  chestDay: string | null;
  /** local days on which all three daily quests were finished (last ~3 weeks) */
  fullDays: string[];
  /** weeks (their first day) whose 7/7 reward was already handed out */
  legendWeeks: string[];
  /**
   * First local day the kid finished an activity. The kid's mission weeks start on this day (every 7 days from
   * it), so a kid who starts on a Friday gets a full 7-day week instead of a week already lost on day 1.
   * Older saves without it keep Monday weeks (store migration sets it to a Monday).
   */
  firstDay?: string | null;
}
export const emptyMissionLog = (): MissionLog => ({ chestDay: null, fullDays: [], legendWeeks: [], firstDay: null });

/** Remember the first play day (no change once set). */
export const noteFirstDay = (log: MissionLog, day: string): MissionLog => (log.firstDay ? log : { ...log, firstDay: day });

/** Record today as a "full" day once all quests are done. Idempotent. */
export function noteFullDay(log: MissionLog, p: Progress): MissionLog {
  if (!p.questsDay || !chestReady(p) || log.fullDays.includes(p.questsDay)) return log;
  return { ...log, fullDays: [...log.fullDays, p.questsDay].sort().slice(-21) };
}

export const canOpenChest = (log: MissionLog, p: Progress, day: string) => p.questsDay === day && chestReady(p) && log.chestDay !== day;

/** Open today's chest: once per day, only when all three quests are done. */
export function openChest(log: MissionLog, p: Progress, day: string): { log: MissionLog; xp: number; coins: number } | null {
  if (!canOpenChest(log, p, day)) return null;
  return { log: { ...noteFullDay(log, p), chestDay: day }, xp: CHEST_BONUS_XP, coins: CHEST_BONUS_COINS };
}

const DAY_MS = 86_400_000;
const addDays = (day: string, n: number) => new Date(Date.parse(day + 'T00:00:00Z') + n * DAY_MS).toISOString().slice(0, 10);

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY_MS);

/**
 * First day of the mission week containing `day`. With an `anchor` (the kid's first play day) weeks are the
 * 7-day blocks counted from it; without one (or before it) the week starts on Monday.
 */
export function weekStart(day: string, anchor?: string | null): string {
  if (anchor && anchor <= day) return addDays(anchor, Math.floor(dayDiff(anchor, day) / 7) * 7);
  if (anchor && anchor > day) return anchor;
  const dow = new Date(day + 'T00:00:00Z').getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}
/** The anchor for a log: its first play day, or today for a kid who has not played yet (their week starts today). */
const anchorOf = (log: MissionLog, day: string) => (log.firstDay ? log.firstDay : log.fullDays.length ? null : day);
/** Day of week (0 = Monday … 6 = Sunday), for the day letters under the weekly boxes. */
export const weekdayIndex = (day: string) => (new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7;

/** This mission week (7 days from its start): which days were full, how many, and whether all 7 are. */
export function weekProgress(log: MissionLog, day: string): { start: string; days: { day: string; full: boolean; today: boolean; future: boolean }[]; done: number; complete: boolean } {
  const start = weekStart(day, anchorOf(log, day));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return { day: d, full: log.fullDays.includes(d), today: d === day, future: d > day };
  });
  const done = days.filter((d) => d.full).length;
  return { start, days, done, complete: done === 7 };
}

/** 7/7 this week and the guaranteed Legend hero card not yet handed out. */
export const weeklyLegendEarned = (log: MissionLog, day: string) => {
  const w = weekProgress(log, day);
  return w.complete && !log.legendWeeks.includes(w.start);
};
export const claimWeeklyLegend = (log: MissionLog, day: string): MissionLog =>
  weeklyLegendEarned(log, day) ? { ...log, legendWeeks: [...log.legendWeeks, weekProgress(log, day).start].slice(-12) } : log;

/** Milliseconds until the next local midnight in `tz` (when new quests arrive). */
export function msToLocalMidnight(now: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(now));
  const get = (t: string) => Number(parts.find((x) => x.type === t)?.value ?? 0);
  const elapsed = ((get('hour') % 24) * 3600 + get('minute') * 60 + get('second')) * 1000 + (now % 1000);
  return Math.max(1000, DAY_MS - elapsed);
}
