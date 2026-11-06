import { describe, it, expect } from 'vitest';
import {
  emptyProgress, DEFAULT_SETTINGS, levelFromXp, xpForLevel, recordActivity, moodFor, canRemind, localDay,
  dailyQuests, ensureQuests, applyEvent, chestReady, noteWrong, noteReviewed, dueReviews, checkBadges,
  generateUsername, isValidUsername, makeGate, newConsent, canUseOnline, report, canMatch, isBlocked,
  mergeLogs, foldProgress, activityDays, type SyncEvent,
} from '../src/index.js';

const TZ = 'America/Port-au-Prince';
const at = (iso: string) => Date.parse(iso);

describe('xp/levels', () => {
  it('level curve is monotonic and starts at 1', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(xpForLevel(3)).toBe(250);
    expect(levelFromXp(260)).toEqual({ level: 3, into: 10, next: 200 });
  });
});

describe('streak', () => {
  it('counts consecutive local days, uses one freeze for a one-day gap, resets otherwise', () => {
    let p = emptyProgress();
    p = recordActivity(p, DEFAULT_SETTINGS, at('2026-11-05T22:00:00-05:00'), TZ); // Nov 5
    p = recordActivity(p, DEFAULT_SETTINGS, at('2026-11-05T23:30:00-05:00'), TZ); // same day
    expect(p.streak.count).toBe(1);
    p = recordActivity(p, DEFAULT_SETTINGS, at('2026-11-06T06:00:00-05:00'), TZ); // next day
    expect(p.streak.count).toBe(2);
    p = recordActivity(p, DEFAULT_SETTINGS, at('2026-11-08T12:00:00-05:00'), TZ); // skipped Nov 7 → freeze
    expect(p.streak.count).toBe(3); expect(p.streak.freezeAvailable).toBe(false);
    p = recordActivity(p, DEFAULT_SETTINGS, at('2026-11-12T12:00:00-05:00'), TZ); // long gap → reset to 1
    expect(p.streak.count).toBe(1);
  });
  it('uses the kid local day, not UTC', () => {
    expect(localDay(at('2026-11-06T03:00:00Z'), TZ)).toBe('2026-11-05');
  });
  it('is fully off when the parent disables streaks', () => {
    const p = recordActivity(emptyProgress(), { ...DEFAULT_SETTINGS, streakEnabled: false }, Date.now(), TZ);
    expect(p.streak.count).toBe(0); expect(p.streak.lastDay).toBeNull();
  });
});

describe('mood + reminders are gentle', () => {
  it('never shows an urgent mood after bedtime and caps reminders at max/day', () => {
    const p = emptyProgress();
    expect(moodFor(p, DEFAULT_SETTINGS, at('2026-11-05T21:00:00-05:00'), TZ)).toBe('lannwit');
    expect(moodFor(p, DEFAULT_SETTINGS, at('2026-11-05T19:30:00-05:00'), TZ)).toBe('rapel');
    expect(moodFor(p, DEFAULT_SETTINGS, at('2026-11-05T08:00:00-05:00'), TZ)).toBe('maten');
    expect(canRemind(DEFAULT_SETTINGS, 0, at('2026-11-05T17:00:00-05:00'), TZ)).toBe(true);
    expect(canRemind(DEFAULT_SETTINGS, 1, at('2026-11-05T17:00:00-05:00'), TZ)).toBe(false);
    expect(canRemind(DEFAULT_SETTINGS, 0, at('2026-11-05T20:30:00-05:00'), TZ)).toBe(false);
  });
});

describe('daily quests', () => {
  it('are deterministic per user+day, three distinct kinds, and the chest opens when all done', () => {
    const a = dailyQuests('u1', '2026-11-06'), b = dailyQuests('u1', '2026-11-06');
    expect(a).toEqual(b); expect(new Set(a.map((q) => q.kind)).size).toBe(3);
    let p = ensureQuests(emptyProgress(), 'u1', '2026-11-06');
    for (const q of p.quests) {
      for (let i = 0; i < q.goal + 2; i++) {
        const e = q.kind === 'win_duel' ? { type: 'duel_end' as const, won: true, draw: false }
          : q.kind === 'finish_lessons' ? { type: 'lesson_done' as const, course: 'en' }
          : q.kind === 'math_score' ? { type: 'math_run' as const, score: 20 }
          : q.kind === 'review_mistakes' ? { type: 'review_done' as const, count: 3 }
          : { type: 'answer' as const, correct: true, category: 'istwa' };
        p = applyEvent(p, e).progress;
      }
    }
    expect(p.quests.every((q) => q.done)).toBe(true);
    expect(chestReady(p)).toBe(true);
    expect(p.xp).toBe(p.quests.reduce((a, q) => a + q.xp, 0)); // each quest paid exactly once
  });
});

describe('spaced repetition', () => {
  it('brings wrong answers back, promotes on correct, graduates after box 4', () => {
    const t0 = at('2026-11-06T10:00:00Z');
    let p = noteWrong(emptyProgress(), 'ist-001', t0);
    expect(dueReviews(p, t0)).toEqual([]);                       // not yet (20 min)
    expect(dueReviews(p, t0 + 30 * 60_000)).toEqual(['ist-001']);
    p = noteReviewed(p, 'ist-001', true, t0 + 3_600_000);         // → box 1, due +1d
    expect(dueReviews(p, t0 + 3_600_000 + 86_400_000 - 1)).toEqual([]);
    for (let i = 0; i < 4; i++) p = noteReviewed(p, 'ist-001', true, t0 + 10 ** 9);
    expect(p.review['ist-001']).toBeUndefined();                  // graduated
  });
});

describe('badges', () => {
  it('awards each badge once', () => {
    const ctx = { p: emptyProgress(), duelWins: 1, lessonsDone: 1, wordsLearned: 0, departmentsUnlocked: 0, eventsPlayed: [] };
    const r1 = checkBadges(ctx, '2026-11-06T00:00:00Z');
    expect(r1.awarded.sort()).toEqual(['duel1', 'premye']);
    expect(checkBadges({ ...ctx, p: r1.progress }, '2026-11-07T00:00:00Z').awarded).toEqual([]);
  });
});

describe('safety', () => {
  it('generates valid usernames and rejects typed ones', () => {
    const n = generateUsername(123);
    expect(isValidUsername(n)).toBe(true);
    expect(isValidUsername('Jean Pierre')).toBe(false);
    expect(isValidUsername('Malfini 0')).toBe(false);
  });
  it('parent gate has one correct worded answer; online needs confirmed consent', () => {
    const g = makeGate(5);
    expect(g.options.length).toBe(3); expect(g.options[g.answer]).toMatch(/^[a-zè]+$/);
    const c = newConsent('kid1', '+13055550147', '2026-11-06T00:00:00Z');
    expect(c.method).toBe('whatsapp'); expect(canUseOnline(c)).toBe(false);
    expect(canUseOnline({ ...c, confirmedAt: '2026-11-06T00:05:00Z' })).toBe(true);
  });
  it('reporting blocks immediately and matchmaking respects blocks, age and parent settings', () => {
    let m = { blocked: {}, reports: [] };
    const a = { id: 'a', age: '9-11', randomDuelsAllowed: true, consentConfirmed: true };
    const b = { id: 'b', age: '9-11', randomDuelsAllowed: true, consentConfirmed: true };
    expect(canMatch(m, a, b)).toBe(true);
    expect(canMatch(m, a, { ...b, age: '6-8' })).toBe(false);
    expect(canMatch(m, a, { ...b, randomDuelsAllowed: false })).toBe(false);
    m = report(m, { reporterId: 'a', targetId: 'b', reason: 'name', at: 'now' });
    expect(isBlocked(m, 'b', 'a')).toBe(true);
    expect(canMatch(m, a, b)).toBe(false);
  });
});

describe('offline sync', () => {
  it('merges two device logs without double counting and folds progress', () => {
    const e = (id: string, at: number, type: SyncEvent['type'], payload: Record<string, unknown>): SyncEvent => ({ id, at, type, payload });
    const phone = [e('1', 1, 'xp', { amount: 10 }), e('2', 2, 'wrong', { questionId: 'q1' }), e('3', 3, 'streak_day', { day: '2026-11-05' })];
    const tablet = [e('2', 2, 'wrong', { questionId: 'q1' }), e('4', 4, 'xp', { amount: 5 }), e('5', 5, 'hero', { id: 'flon' }), e('6', 6, 'streak_day', { day: '2026-11-05' })];
    const log = mergeLogs(phone, tablet);
    expect(log.map((x) => x.id)).toEqual(['1', '2', '3', '4', '5', '6']);
    const p = foldProgress(log);
    expect(p.xp).toBe(15); expect(p.heroCards).toEqual(['flon']); expect(p.review.q1.misses).toBe(1);
    expect(activityDays(log)).toEqual(['2026-11-05']);
  });
});

describe('pricing: free in Haiti, paid in diaspora', () => {
  it('any Haiti signal makes the app free; diaspora needs a subscription or gift', async () => {
    const { detectRegion, entitlementFor, makeGiftCode, isGiftCode, rng } = await import('../src/index.js');
    expect(detectRegion({ ipCountry: 'US', phoneCountry: 'HT' })).toBe('HT');
    expect(detectRegion({ ipCountry: 'US', storeCountry: 'US' })).toBe('DIASPORA');
    expect(entitlementFor('HT').reason).toBe('haiti_free');
    expect(entitlementFor('DIASPORA').full).toBe(false);
    expect(entitlementFor('DIASPORA', { planId: 'solo_m', until: new Date(Date.now() + 86400000).toISOString() }).reason).toBe('subscription');
    expect(entitlementFor('DIASPORA', null, new Date(Date.now() + 86400000).toISOString()).reason).toBe('gift_code');
    expect(entitlementFor('DIASPORA', { planId: 'solo_m', until: new Date(Date.now() - 1).toISOString() }).full).toBe(false);
    const code = makeGiftCode(rng(1));
    expect(isGiftCode(code)).toBe(true); expect(isGiftCode('KNS-0OI1-AB')).toBe(false);
  });
});
