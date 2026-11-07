import { describe, it, expect } from 'vitest';
import { BANK, haitiDay, haitiOffsetHours, addDays, pickDaily, scoreDaily, dailySeed, clampDailyCount, dailyRankScore, DAILY_MIN_ANSWER_MS, type AgeBand } from '../src/index.js';

describe('daily challenge (shared server/app logic)', () => {
  it("uses Haiti's calendar day, with summer time", () => {
    expect(haitiOffsetHours(Date.UTC(2026, 0, 15, 12))).toBe(-5);
    expect(haitiOffsetHours(Date.UTC(2026, 6, 15, 12))).toBe(-4);
    // 2026: summer time from Sun 8 March 07:00 UTC to Sun 1 November 06:00 UTC
    expect(haitiOffsetHours(Date.UTC(2026, 2, 8, 6, 59))).toBe(-5);
    expect(haitiOffsetHours(Date.UTC(2026, 2, 8, 7, 0))).toBe(-4);
    expect(haitiOffsetHours(Date.UTC(2026, 10, 1, 5, 59))).toBe(-4);
    expect(haitiOffsetHours(Date.UTC(2026, 10, 1, 6, 0))).toBe(-5);
    expect(haitiDay(Date.UTC(2026, 10, 7, 4, 59))).toBe('2026-11-06'); // 23:59 in Port-au-Prince
    expect(haitiDay(Date.UTC(2026, 10, 7, 5, 0))).toBe('2026-11-07');
    expect(haitiDay(Date.UTC(2026, 6, 1, 3, 59))).toBe('2026-06-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    // agrees with Intl where available
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 3.7 * 3600_000) {
      const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Port-au-Prince', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
      expect(haitiDay(t)).toBe(f);
    }
  });

  it('same questions for everyone of an age band on a day, whatever the bank order', () => {
    const a = pickDaily(BANK, '9-11', '2026-11-06', 10);
    const b = pickDaily([...BANK].reverse(), '9-11', '2026-11-06', 10);
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(a.map((q) => q.answer)).toEqual(b.map((q) => q.answer));
    expect(a.map((q) => q.options[0].ht)).toEqual(b.map((q) => q.options[0].ht));
    expect(new Set(a.map((q) => q.id)).size).toBe(10);
    expect(new Set(a.map((q) => q.category)).size).toBeGreaterThanOrEqual(5); // spread over categories
    for (const q of a) expect(q.ages).toContain('9-11');
    expect(pickDaily(BANK, '9-11', '2026-11-07', 10).map((q) => q.id)).not.toEqual(a.map((q) => q.id));
    expect(pickDaily(BANK, '6-8', '2026-11-06', 10).map((q) => q.id)).not.toEqual(a.map((q) => q.id));
    expect(dailySeed('2026-11-06', '9-11')).not.toBe(dailySeed('2026-11-06', '6-8'));
  });

  it('never serves draft questions; count honoured', () => {
    const drafts = BANK.slice(0, 400).map((q) => ({ ...q, status: 'draft' as const }));
    for (const age of ['6-8', '9-11', '12-14'] as AgeBand[]) {
      const qs = pickDaily([...drafts, ...BANK.slice(400)], age, '2026-11-06', 20);
      expect(qs.length).toBe(20);
      for (const q of qs) expect(drafts.some((d) => d.id === q.id)).toBe(false);
    }
    expect(clampDailyCount(3)).toBe(5); expect(clampDailyCount(50)).toBe(20); expect(clampDailyCount('x')).toBe(10); expect(clampDailyCount(12)).toBe(12);
  });

  it('scores from the answer key, ignores impossible speeds and missing answers', () => {
    const qs = pickDaily(BANK, '12-14', '2026-11-06', 5);
    const right = qs.map((q) => ({ i: q.answer, ms: 3000 }));
    const s = scoreDaily(qs, right);
    expect(s.correct).toBe(5); expect(s.total).toBe(5); expect(s.ms).toBe(15000);
    const instant = scoreDaily(qs, qs.map((q) => ({ i: q.answer, ms: 0 })));
    const atFloor = scoreDaily(qs, qs.map((q) => ({ i: q.answer, ms: DAILY_MIN_ANSWER_MS })));
    expect(instant.score).toBe(atFloor.score); // 0 ms is scored like the floor
    const partial = scoreDaily(qs, [right[0], { i: null, ms: 15000 }]);
    expect(partial.correct).toBe(1); expect(partial.perQuestion).toEqual([true, false, false, false, false]);
    const late = scoreDaily(qs, qs.map((q) => ({ i: q.answer, ms: 60_000 })));
    expect(late.correct).toBe(0);
    expect(dailyRankScore({ correct: 5, score: 10 })).toBeGreaterThan(dailyRankScore({ correct: 4, score: 999 }));
  });
});
