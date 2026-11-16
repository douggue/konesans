import { describe, it, expect } from 'vitest';
import { planReminders, localTimeToMs, streakNudgeHour, DEFAULT_REMINDER, DEFAULT_SETTINGS } from '../src/index.js';

const TZ = 'America/Port-au-Prince';
const prefs = { ...DEFAULT_REMINDER, on: true };
const at = (iso: string) => Date.parse(iso);
const hhmm = (ms: number) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
const dayOf = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ms));
const streak = (count: number, lastDay: string | null) => ({ streak: { count, lastDay, freezeAvailable: true } });

describe('daily reminders', () => {
  it('converts a local time to the right instant (DST-safe)', () => {
    expect(localTimeToMs('2026-11-16', 17, 0, TZ)).toBe(at('2026-11-16T22:00:00Z')); // EST −5
    expect(localTimeToMs('2026-07-01', 17, 0, TZ)).toBe(at('2026-07-01T21:00:00Z')); // EDT −4
    expect(localTimeToMs('2026-11-16', 17, 30, 'UTC')).toBe(at('2026-11-16T17:30:00Z'));
  });
  it('off → nothing; parent max 0 → nothing', () => {
    const now = at('2026-11-16T12:00:00Z');
    expect(planReminders({ now, tz: TZ, prefs: DEFAULT_REMINDER, progress: streak(0, null), settings: DEFAULT_SETTINGS })).toEqual([]);
    expect(planReminders({ now, tz: TZ, prefs, progress: streak(0, null), settings: { ...DEFAULT_SETTINGS, maxRemindersPerDay: 0 } })).toEqual([]);
  });
  it('one a day at the chosen time for 7 days; today too when not played yet', () => {
    const now = at('2026-11-16T14:00:00Z'); // 9:00 local
    const r = planReminders({ now, tz: TZ, prefs, progress: streak(0, null), settings: DEFAULT_SETTINGS });
    expect(r.length).toBe(7);
    expect(r.every((x) => x.kind === 'daily' && hhmm(x.at) === '17:00')).toBe(true);
    expect(dayOf(r[0].at)).toBe('2026-11-16');
    expect(new Set(r.map((x) => x.day)).size).toBe(7);
    expect(r.every((x) => x.text >= 1 && x.text <= 3)).toBe(true); // no streak → no streak text
  });
  it('skips today once the kid played (or the time has passed)', () => {
    const now = at('2026-11-16T14:00:00Z');
    const played = planReminders({ now, tz: TZ, prefs, progress: streak(1, '2026-11-16'), settings: DEFAULT_SETTINGS });
    expect(played[0].day).toBe('2026-11-17');
    const late = planReminders({ now: at('2026-11-16T23:00:00Z'), tz: TZ, prefs, progress: streak(0, null), settings: DEFAULT_SETTINGS });
    expect(late[0].day).toBe('2026-11-17');
  });
  it('the next reminder shows the streak ("Seri w: N jou")', () => {
    const now = at('2026-11-16T14:00:00Z');
    const r = planReminders({ now, tz: TZ, prefs, progress: streak(2, '2026-11-15'), settings: DEFAULT_SETTINGS });
    expect(r[0]).toMatchObject({ kind: 'daily', text: 0, streak: 2, day: '2026-11-16' });
    expect(r.filter((x) => x.kind === 'daily').slice(1).every((x) => x.text > 0)).toBe(true);
    // a broken streak is not shown
    const broken = planReminders({ now, tz: TZ, prefs, progress: streak(5, '2026-11-10'), settings: DEFAULT_SETTINGS });
    expect(broken[0].text).toBeGreaterThan(0);
  });
  it('streak in danger: one reminder a day, and it becomes the streak reminder', () => {
    const now = at('2026-11-16T14:00:00Z');
    const r = planReminders({ now, tz: TZ, prefs, progress: streak(4, '2026-11-15'), settings: DEFAULT_SETTINGS });
    const today = r.filter((x) => x.day === '2026-11-16');
    expect(today.length).toBe(1);
    expect(today[0]).toMatchObject({ kind: 'streak', streak: 4 });
    expect(hhmm(today[0].at)).toBe('17:00');
    // never two on any day
    const perDay = new Map<string, number>(); for (const x of r) perDay.set(x.day, (perDay.get(x.day) ?? 0) + 1);
    expect([...perDay.values()].every((n) => n === 1)).toBe(true);
    // the daily time already passed today → the evening nudge is the only one today
    const late = planReminders({ now: at('2026-11-16T22:30:00Z'), tz: TZ, prefs, progress: streak(4, '2026-11-15'), settings: DEFAULT_SETTINGS }).filter((x) => x.day === '2026-11-16');
    expect(late.length).toBe(1); expect(late[0].kind).toBe('streak'); expect(hhmm(late[0].at)).toBe('19:00');
    // played today → tomorrow's reminder is the streak one
    const p = planReminders({ now, tz: TZ, prefs, progress: streak(4, '2026-11-16'), settings: DEFAULT_SETTINGS }).filter((x) => x.kind === 'streak');
    expect(p[0].day).toBe('2026-11-17');
    // streak 2 → none; streaks turned off by a parent → none
    expect(planReminders({ now, tz: TZ, prefs, progress: streak(2, '2026-11-15'), settings: DEFAULT_SETTINGS }).some((x) => x.kind === 'streak')).toBe(false);
    expect(planReminders({ now, tz: TZ, prefs, progress: streak(9, '2026-11-15'), settings: { ...DEFAULT_SETTINGS, streakEnabled: false } }).some((x) => x.kind === 'streak')).toBe(false);
  });
  it('never at night: before 8:00 or after bedtime', () => {
    const now = at('2026-11-16T14:00:00Z');
    expect(planReminders({ now, tz: TZ, prefs: { on: true, hour: 21, minute: 0 }, progress: streak(0, null), settings: DEFAULT_SETTINGS })).toEqual([]);
    expect(streakNudgeHour(20)).toBe(19); expect(streakNudgeHour(19)).toBe(18);
  });
});
