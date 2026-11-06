import type { Progress, QuestKind, QuestState } from '../types.js';
import { rng } from '../quiz/engine.js';

/** Events the app emits; quests and badges listen to these. */
export type GameEvent =
  | { type: 'duel_end'; won: boolean; draw: boolean }
  | { type: 'lesson_done'; course: string }
  | { type: 'math_run'; score: number }
  | { type: 'answer'; correct: boolean; category: string }
  | { type: 'review_done'; count: number };

const TEMPLATES: { kind: QuestKind; goal: number; xp: number; weight: number }[] = [
  { kind: 'win_duel', goal: 1, xp: 20, weight: 3 },
  { kind: 'finish_lessons', goal: 2, xp: 30, weight: 3 },
  { kind: 'math_score', goal: 15, xp: 25, weight: 2 },
  { kind: 'answer_correct', goal: 10, xp: 20, weight: 3 },
  { kind: 'play_category', goal: 5, xp: 15, weight: 2 },
  { kind: 'review_mistakes', goal: 5, xp: 25, weight: 2 },
];

/** Three quests per day, deterministic for (userId, day) so devices agree offline. */
export function dailyQuests(userId: string, day: string): QuestState[] {
  let h = 0;
  for (const c of userId + day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rand = rng(h);
  const pool = TEMPLATES.flatMap((t) => Array(t.weight).fill(t));
  const picked: QuestState[] = [];
  while (picked.length < 3) {
    const t = pool[Math.floor(rand() * pool.length)];
    if (!picked.some((q) => q.kind === t.kind)) picked.push({ id: `${day}:${t.kind}`, kind: t.kind, goal: t.goal, progress: 0, xp: t.xp, done: false });
  }
  return picked;
}

/** Ensure today's quests exist (rolls over at local midnight). */
export function ensureQuests(p: Progress, userId: string, day: string): Progress {
  return p.questsDay === day ? p : { ...p, questsDay: day, quests: dailyQuests(userId, day) };
}

/** Advance quests from an event. Returns new progress and XP newly awarded. */
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
      case 'play_category': add = e.type === 'answer' ? 1 : 0; break;
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
export const chestReady = (p: Progress) => p.quests.length === 3 && p.quests.every((q) => q.done);
