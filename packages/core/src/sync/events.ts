import { emptyProgress, type Progress } from '../types.js';
import { noteWrong } from '../progress/srs.js';

/**
 * Offline-first sync. The device keeps an append-only log of events. Progress
 * is a pure fold over the log, so the server can rebuild it and two devices
 * can merge by union (events have unique ids; order by time, then id).
 */
export interface SyncEvent {
  id: string;            // uuid, idempotency key
  at: number;            // ms (device clock)
  type: 'xp' | 'coins' | 'wrong' | 'hero' | 'badge' | 'streak_day';
  payload: Record<string, unknown>;
  synced?: boolean;
}

export function mergeLogs(a: SyncEvent[], b: SyncEvent[]): SyncEvent[] {
  const byId = new Map<string, SyncEvent>();
  for (const e of [...a, ...b]) if (!byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()].sort((x, y) => x.at - y.at || (x.id < y.id ? -1 : 1));
}

export function foldProgress(log: SyncEvent[], base: Progress = emptyProgress()): Progress {
  let p = base;
  for (const e of log) {
    switch (e.type) {
      case 'xp': p = { ...p, xp: p.xp + Number(e.payload.amount ?? 0) }; break;
      case 'coins': p = { ...p, coins: Math.max(0, p.coins + Number(e.payload.amount ?? 0)) }; break;
      case 'wrong': p = noteWrong(p, String(e.payload.questionId), e.at); break;
      case 'hero': p = p.heroCards.includes(String(e.payload.id)) ? p : { ...p, heroCards: [...p.heroCards, String(e.payload.id)] }; break;
      case 'badge': p = { ...p, badges: { ...p.badges, [String(e.payload.id)]: new Date(e.at).toISOString() } }; break;
      case 'streak_day': break; // streak is recomputed from days, see recomputeStreak
    }
  }
  return p;
}

/** Streak days are derived from the log, so clock-skewed devices can't double count. */
export function activityDays(log: SyncEvent[]): string[] {
  return [...new Set(log.filter((e) => e.type === 'streak_day').map((e) => String(e.payload.day)))].sort();
}

/** Events not yet acknowledged by the server. */
export const pending = (log: SyncEvent[]) => log.filter((e) => !e.synced);
export const markSynced = (log: SyncEvent[], ids: Set<string>) => log.map((e) => (ids.has(e.id) ? { ...e, synced: true } : e));
