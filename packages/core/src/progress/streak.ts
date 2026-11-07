import type { KidSettings, Progress } from '../types.js';

/** Local calendar day (YYYY-MM-DD) for a timestamp in an IANA timezone. */
export function localDay(ms: number, timeZone: string): string {
  const d = new Date(ms);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export const localHour = (ms: number, timeZone: string) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).format(new Date(ms)));

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86_400_000);

/**
 * Record that the kid completed a qualifying activity today.
 * - same day: no change
 * - next day: +1
 * - missed exactly one day with a freeze available: freeze is spent, streak continues
 * - otherwise: streak resets to 1 (never to 0 — today counts)
 * If the parent disabled streaks, the streak stays at 0 and nothing is tracked.
 */
export function recordActivity(p: Progress, settings: KidSettings, now: number, tz: string): Progress {
  if (!settings.streakEnabled) return { ...p, streak: { count: 0, lastDay: null, freezeAvailable: p.streak.freezeAvailable } };
  const today = localDay(now, tz);
  const { count, lastDay, freezeAvailable } = p.streak;
  if (lastDay === today) return p;
  if (lastDay === null) return { ...p, streak: { count: 1, lastDay: today, freezeAvailable } };
  const gap = dayDiff(lastDay, today);
  if (gap === 1) return { ...p, streak: { count: count + 1, lastDay: today, freezeAvailable } };
  if (gap === 2 && freezeAvailable) return { ...p, streak: { count: count + 1, lastDay: today, freezeAvailable: false } };
  return { ...p, streak: { count: 1, lastDay: today, freezeAvailable } };
}

/** Freeze rule: every 7 days in a row (7, 14, 21…) earns a streak freeze 🧊. The kid holds at most one. */
export const FREEZE_EVERY = 7;
export const grantFreeze = (p: Progress): Progress =>
  p.streak.count > 0 && p.streak.count % FREEZE_EVERY === 0 ? { ...p, streak: { ...p.streak, freezeAvailable: true } } : p;

/**
 * A real activity was finished (quiz, lesson, duel, Kalkil Mantal, coding level, Vwayaj run — never just opening
 * the app): counts the day for the streak, and re-grants the freeze when the streak reaches a multiple of 7.
 */
export function recordPlay(p: Progress, settings: KidSettings, now: number, tz: string): Progress {
  const next = recordActivity(p, settings, now, tz);
  return next.streak.lastDay !== p.streak.lastDay ? grantFreeze(next) : next; // a new day was counted
}

/** Days still to play before the next freeze (0 when the kid already holds one). */
export const daysToFreeze = (p: Progress) => (p.streak.freezeAvailable ? 0 : FREEZE_EVERY - (p.streak.count % FREEZE_EVERY));

export type Mood = 'maten' | 'midi' | 'aswe' | 'rapel' | 'lannwit';

/**
 * Widget / mascot mood for the home-screen widget. Gentle by design:
 * done today → happy or asleep; not done → follows the clock; no urgency after bedtime.
 */
export function moodFor(p: Progress, settings: KidSettings, now: number, tz: string): Mood {
  const h = localHour(now, tz);
  const doneToday = p.streak.lastDay === localDay(now, tz);
  if (h >= settings.bedtimeHour || h < 6) return 'lannwit';
  if (doneToday) return h >= 18 ? 'lannwit' : 'midi';
  if (h < 11) return 'maten';
  if (h < 16) return 'midi';
  if (h < settings.bedtimeHour - 1) return 'aswe';
  return 'rapel';
}

/** Decide whether a reminder may be sent now. Enforces max/day and bedtime. */
export function canRemind(settings: KidSettings, remindersSentToday: number, now: number, tz: string): boolean {
  const h = localHour(now, tz);
  if (remindersSentToday >= settings.maxRemindersPerDay) return false;
  if (h >= settings.bedtimeHour || h < 8) return false;
  return true;
}
