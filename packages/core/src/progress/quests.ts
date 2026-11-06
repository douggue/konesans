import type { Progress, QuestKind, QuestState } from '../types.js';
import { rng } from '../quiz/engine.js';

export * from './ranks.js';

/** Events the app emits; quests and badges listen to these. */
export type GameEvent =
  | { type: 'duel_end'; won: boolean; draw: boolean }
  | { type: 'lesson_done'; course: string }
  | { type: 'math_run'; score: number }
  | { type: 'answer'; correct: boolean; category: string }
  | { type: 'review_done'; count: number };

/** weight 0 = not handed out (the app has no screen that can complete it yet). */
const TEMPLATES: { kind: QuestKind; goal: number; xp: number; weight: number }[] = [
  { kind: 'win_duel', goal: 1, xp: 20, weight: 3 },
  { kind: 'finish_lessons', goal: 2, xp: 30, weight: 3 },
  { kind: 'math_score', goal: 15, xp: 25, weight: 2 },
  { kind: 'answer_correct', goal: 10, xp: 20, weight: 3 },
  { kind: 'play_category', goal: 5, xp: 15, weight: 2 },
  { kind: 'review_mistakes', goal: 5, xp: 25, weight: 0 },
];
const ACTIVE = TEMPLATES.filter((t) => t.weight > 0);
export const questKindActive = (k: QuestKind) => ACTIVE.some((t) => t.kind === k);

const seed = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/** Three quests per day, deterministic for (userId, day) so devices agree offline. */
export function dailyQuests(userId: string, day: string): QuestState[] {
  const rand = rng(seed(userId + day));
  const pool = ACTIVE.flatMap((t) => Array(t.weight).fill(t));
  const picked: QuestState[] = [];
  while (picked.length < 3) {
    const t = pool[Math.floor(rand() * pool.length)];
    if (!picked.some((q) => q.kind === t.kind)) picked.push({ id: `${day}:${t.kind}`, kind: t.kind, goal: t.goal, progress: 0, xp: t.xp, done: false });
  }
  return picked;
}

/**
 * Ensure today's quests exist (rolls over at local midnight).
 * Same day: keeps progress, but swaps out any unfinished quest the app can no longer complete
 * (a kind that was retired after the quests were handed out), so the chest stays reachable.
 */
export function ensureQuests(p: Progress, userId: string, day: string): Progress {
  if (p.questsDay !== day) return { ...p, questsDay: day, quests: dailyQuests(userId, day) };
  if (p.quests.every((q) => q.done || questKindActive(q.kind))) return p;
  const rand = rng(seed(userId + day + ':swap'));
  const quests = [...p.quests];
  for (let i = 0; i < quests.length; i++) {
    const q = quests[i];
    if (q.done || questKindActive(q.kind)) continue;
    const free = ACTIVE.filter((t) => !quests.some((x) => x.kind === t.kind));
    const t = free[Math.floor(rand() * free.length)];
    if (t) quests[i] = { id: `${day}:${t.kind}`, kind: t.kind, goal: t.goal, progress: 0, xp: t.xp, done: false };
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
      case 'play_category': add = e.type === 'answer' && e.category !== 'mix' ? 1 : 0; break; // any answer, in a chosen category
      case 'review_mistakes': add = e.type === 'review_done' ? e.count : 0; break;
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
  /** weeks (their Monday) whose 7/7 reward was already handed out */
  legendWeeks: string[];
}
export const emptyMissionLog = (): MissionLog => ({ chestDay: null, fullDays: [], legendWeeks: [] });

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

/** Monday of the week containing `day` (YYYY-MM-DD). */
export function weekStart(day: string): string {
  const dow = new Date(day + 'T00:00:00Z').getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

/** This week (Mon→Sun): which days were full, how many, and whether all 7 are. */
export function weekProgress(log: MissionLog, day: string): { start: string; days: { day: string; full: boolean; today: boolean; future: boolean }[]; done: number; complete: boolean } {
  const start = weekStart(day);
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
  weeklyLegendEarned(log, day) ? { ...log, legendWeeks: [...log.legendWeeks, weekStart(day)].slice(-12) } : log;

/** Milliseconds until the next local midnight in `tz` (when new quests arrive). */
export function msToLocalMidnight(now: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(now));
  const get = (t: string) => Number(parts.find((x) => x.type === t)?.value ?? 0);
  const elapsed = ((get('hour') % 24) * 3600 + get('minute') * 60 + get('second')) * 1000 + (now % 1000);
  return Math.max(1000, DAY_MS - elapsed);
}
