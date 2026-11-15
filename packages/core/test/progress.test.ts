import { describe, it, expect } from 'vitest';
import {
  emptyProgress, DEFAULT_SETTINGS, levelFromXp, xpForLevel, recordActivity, moodFor, canRemind, localDay,
  dailyQuests, ensureQuests, applyEvent, chestReady, noteWrong, noteReviewed, dueReviews, dueReviewCount, reviewAnswer, dropReviews, REVIEW_MAX_ITEMS, REVIEW_SESSION_SIZE, reviewXp, checkBadges,
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

describe('spaced repetition (Revize erè m)', () => {
  const D = (day: string, h = 10) => at(`${day}T${String(h).padStart(2, '0')}:00:00Z`);
  it('a mistake is due tomorrow, in box 1', () => {
    const p = noteWrong(emptyProgress(), 'ist-001', D('2026-11-06'));
    expect(p.review['ist-001']).toMatchObject({ box: 1, due: '2026-11-07', misses: 1 });
    expect(dueReviews(p, D('2026-11-06', 23))).toEqual([]);
    expect(dueReviews(p, D('2026-11-07', 0))).toEqual(['ist-001']);
    expect(dueReviewCount(p, D('2026-11-09'))).toBe(1);
  });
  it('leaves the list after two right answers on different days (1 → 2 → metrize)', () => {
    let p = noteWrong(emptyProgress(), 'q', D('2026-11-06'));
    let r = reviewAnswer(p, 'q', true, D('2026-11-07'));
    expect(r.outcome).toBe('promoted'); p = r.progress;
    expect(p.review.q).toMatchObject({ box: 2, due: '2026-11-10', right: '2026-11-07' });
    // a second right answer the same day does not count
    r = reviewAnswer(p, 'q', true, D('2026-11-07', 15));
    expect(r.outcome).toBe('same_day'); expect(r.progress.review.q.box).toBe(2);
    expect(dueReviews(p, D('2026-11-09'))).toEqual([]);
    r = reviewAnswer(p, 'q', true, D('2026-11-10'));
    expect(r.outcome).toBe('mastered');
    expect(r.progress.review.q).toBeUndefined();
  });
  it('a miss in review goes back to box 1, due tomorrow', () => {
    let p = noteWrong(emptyProgress(), 'q', D('2026-11-06'));
    p = reviewAnswer(p, 'q', true, D('2026-11-07')).progress;
    const r = reviewAnswer(p, 'q', false, D('2026-11-10'));
    expect(r.outcome).toBe('missed');
    expect(r.progress.review.q).toMatchObject({ box: 1, due: '2026-11-11', misses: 2 });
    expect(reviewAnswer(p, 'nope', true, D('2026-11-10')).outcome).toBe('unknown');
  });
  it('uses the kid\'s local day', () => {
    // 2026-11-07 02:00 UTC is still 2026-11-06 in Port-au-Prince
    const p = noteWrong(emptyProgress(), 'q', at('2026-11-07T02:00:00Z'), 'America/Port-au-Prince');
    expect(p.review.q.due).toBe('2026-11-07');
  });
  it('reads old saves (ISO due, box 0–4), caps the list, sorts most overdue first, drops unknown ids', () => {
    let p: ReturnType<typeof emptyProgress> = { ...emptyProgress(), review: { old: { box: 0, due: '2026-11-01T10:20:00.000Z', misses: 3 }, older: { box: 4, due: '2026-10-30T10:00:00.000Z', misses: 1 } } };
    expect(dueReviews(p, D('2026-11-06'))).toEqual(['older', 'old']);
    expect(reviewAnswer(p, 'older', true, D('2026-11-06')).outcome).toBe('mastered'); // box 4 = past box 2
    expect(reviewAnswer(p, 'old', true, D('2026-11-06')).outcome).toBe('promoted');
    for (let i = 0; i < REVIEW_MAX_ITEMS + 5; i++) p = noteWrong(p, 'n' + i, D('2026-11-06'));
    expect(Object.keys(p.review).length).toBe(REVIEW_MAX_ITEMS);
    expect(dueReviews(p, D('2026-11-07')).length).toBe(REVIEW_SESSION_SIZE);
    expect(dropReviews(p, ['n10']).review.n10).toBeUndefined();
  });
  it('pays a small, capped XP for a session', () => {
    expect(reviewXp(0)).toBe(5); expect(reviewXp(3)).toBe(21); expect(reviewXp(10)).toBe(35); expect(reviewXp(50)).toBe(40);
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
