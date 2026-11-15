/**
 * Daily reminders (local notifications, the app's src/lib/reminders.ts schedules them). Pure planning, no clock:
 * - one friendly reminder a day at the time chosen in Paramèt, for the next `days` days — none today when the kid
 *   already played today (or the time has passed); the app plans again on every open and after every activity;
 * - "seri an danje": an evening nudge when the streak is > 2 and the kid has not played that day (today, or
 *   tomorrow when they played today), at most one more a day, never after bedtime.
 * A parent's `maxRemindersPerDay: 0` (KidSettings) turns all of them off.
 */
import type { KidSettings, Progress } from '../types.js';
import { localDay } from './streak.js';

export interface ReminderPrefs { on: boolean; hour: number; minute: number }
export const DEFAULT_REMINDER: ReminderPrefs = { on: false, hour: 17, minute: 0 };
/** Number of friendly texts / streak texts the app has (`rem_daily_N`, `rem_streak_N`). */
export const REMINDER_TEXTS = { daily: 4, streak: 2 } as const;

export interface PlannedReminder {
  /** epoch ms */
  at: number;
  /** local day 'YYYY-MM-DD' */
  day: string;
  kind: 'daily' | 'streak';
  /** which text: daily 0 = "Ti Zwazo ap tann ou! Seri w: N jou" (only with a streak), 1… = the others */
  text: number;
  /** streak shown in the text */
  streak: number;
}

const DAY = 86_400_000;
const addDays = (day: string, n: number) => new Date(Date.parse(day + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
const seed = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

/** Offset (local − UTC, ms) of `tz` at the instant `ms`. */
function tzOffset(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second')) - Math.floor(ms / 1000) * 1000;
}
/** Epoch ms of `day` at hh:mm in `tz` (DST-safe). */
export function localTimeToMs(day: string, hour: number, minute: number, tz: string): number {
  const [y, mo, d] = day.split('-').map(Number);
  const guess = Date.UTC(y, mo - 1, d, hour, minute);
  let at = guess - tzOffset(guess, tz);
  at = guess - tzOffset(at, tz);
  return at;
}

/** Evening time of the streak nudge: 19:00, or an hour before an earlier bedtime. */
export const streakNudgeHour = (bedtimeHour: number) => Math.max(8, Math.min(19, bedtimeHour - 1));

export function planReminders(o: {
  now: number; tz: string; prefs: ReminderPrefs; progress: Pick<Progress, 'streak'>;
  settings: Pick<KidSettings, 'bedtimeHour' | 'maxRemindersPerDay' | 'streakEnabled'>; days?: number;
}): PlannedReminder[] {
  const { now, tz, prefs, settings } = o;
  if (!prefs.on || settings.maxRemindersPerDay <= 0) return [];
  const today = localDay(now, tz);
  const playedToday = o.progress.streak.lastDay === today;
  // the streak as it stands (0 once it broke: last played before yesterday)
  const alive = o.progress.streak.lastDay === today || o.progress.streak.lastDay === addDays(today, -1);
  const streak = settings.streakEnabled && alive ? o.progress.streak.count : 0;
  const days = o.days ?? 7;
  const hour = Math.min(Math.max(0, prefs.hour), 23); const minute = Math.min(Math.max(0, prefs.minute), 59);
  const out: PlannedReminder[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(today, i);
    if (i === 0 && playedToday) continue;
    // never at night (after bedtime / before 8:00)
    if (hour >= settings.bedtimeHour || hour < 8) break;
    const at = localTimeToMs(day, hour, minute, tz);
    if (at <= now + 60_000) continue;
    // "Seri w: N jou" only for the next reminder (later days don't know the streak yet; we plan again anyway)
    const withStreak = out.length === 0 && streak > 0 && (i === 0 || (i === 1 && playedToday));
    const text = withStreak ? 0 : 1 + (seed(day) % (REMINDER_TEXTS.daily - 1));
    out.push({ at, day, kind: 'daily', text, streak: withStreak ? streak : 0 });
  }
  // streak in danger: today if not played yet, tomorrow if played today (the streak then stands at `streak`)
  if (streak > 2) {
    const h = streakNudgeHour(settings.bedtimeHour);
    const day = playedToday ? addDays(today, 1) : today;
    const at = localTimeToMs(day, h, 0, tz);
    const daily = out.find((r) => r.day === day);
    // only as a second, later nudge (or when the daily reminder is off for that day)
    if (at > now + 60_000 && (!daily || daily.at < at - 30 * 60_000)) out.push({ at, day, kind: 'streak', text: seed(day + 's') % REMINDER_TEXTS.streak, streak });
  }
  return out.sort((a, b) => a.at - b.at);
}
