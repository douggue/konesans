import { describe, it, expect } from 'vitest';
import {
  mergePart, mergeSaves, hashText, stableJson, trimProgress, savePreview, makeRecoveryCode, normalizeRecoveryCode, CODE_WORDS, CODE_DIGITS,
  SAVE_PARTS, SAVE_MAX_REVIEW, type CloudSave, type SavePartRec,
} from '../src/sync/save.js';
import { emptyProgress } from '../src/types.js';
import { rng } from '../src/quiz/engine.js';
import { NAME_WORDS } from '../src/safety/username.js';

const rec = (at: number, data: Record<string, any>): SavePartRec => ({ at, data });

describe('cloud save merge — newest wins per part', () => {
  it('a missing side takes the other', () => {
    expect(mergePart('settings', undefined, rec(5, { sfx: false }))).toEqual(rec(5, { sfx: false }));
    expect(mergePart('settings', rec(3, { sfx: true }), undefined)).toEqual(rec(3, { sfx: true }));
    expect(mergePart('settings', undefined, undefined)).toBeUndefined();
  });
  it('plain parts (profile, settings, kidSettings, prefs): newest as a whole, whichever side it is on', () => {
    const old = rec(100, { username: 'Mango 4', lang: 'ht' }), neu = rec(200, { username: 'Toti 9', lang: 'fr' });
    expect(mergePart('profile', old, neu)).toEqual(neu);
    expect(mergePart('profile', neu, old)).toEqual(neu); // an older phone never overwrites newer data
    expect(mergePart('prefs', rec(1, { difficulty: 3 }), rec(2, { difficulty: 1 }))!.data.difficulty).toBe(1);
  });
  it('a malformed side is ignored', () => {
    expect(mergePart('progress', { at: 9, data: 'x' as any }, rec(1, { xp: 4 }))).toEqual(rec(1, { xp: 4 }));
  });
});

describe('cloud save merge — what a kid earned never goes away', () => {
  it('progress: XP max, trophies + hero cards union (first date kept), coins/review from the newest', () => {
    const a = rec(100, { ...emptyProgress(), xp: 900, coins: 50, badges: { first: '2026-01-02T00:00:00Z', duel5: '2026-02-01T00:00:00Z' }, heroCards: ['tousen'], review: { q1: { box: 1, due: 'x', misses: 1 } } });
    const b = rec(200, { ...emptyProgress(), xp: 300, coins: 10, badges: { first: '2026-03-01T00:00:00Z', streak3: '2026-03-02T00:00:00Z' }, heroCards: ['desalin'], review: {} });
    const m = mergePart('progress', a, b)!;
    expect(m.at).toBe(200);
    expect(m.data.xp).toBe(900);
    expect(m.data.coins).toBe(10);
    expect(m.data.badges).toEqual({ first: '2026-01-02T00:00:00Z', duel5: '2026-02-01T00:00:00Z', streak3: '2026-03-02T00:00:00Z' });
    expect(m.data.heroCards.sort()).toEqual(['desalin', 'tousen']);
    expect(m.data.review).toEqual({});
  });
  it('progress: streak with the later day; quests of the later day, same day → furthest progress', () => {
    const a = rec(100, { ...emptyProgress(), streak: { count: 9, lastDay: '2026-11-05', freezeAvailable: true }, questsDay: '2026-11-05', quests: [{ id: 'q1', progress: 3, done: true }, { id: 'q2', progress: 0, done: false }] });
    const b = rec(200, { ...emptyProgress(), streak: { count: 2, lastDay: '2026-11-04', freezeAvailable: true }, questsDay: '2026-11-05', quests: [{ id: 'q1', progress: 1, done: false }, { id: 'q2', progress: 2, done: false }] });
    const m = mergePart('progress', a, b)!.data;
    expect(m.streak.count).toBe(9);
    expect(m.quests).toEqual([{ id: 'q1', progress: 3, done: true }, { id: 'q2', progress: 2, done: false }]);
    const c = rec(300, { ...emptyProgress(), questsDay: '2026-11-04', quests: [{ id: 'old' }] });
    expect(mergePart('progress', a, c)!.data.questsDay).toBe('2026-11-05');
  });
  it('courses: finished lessons are a union, best stars / score / times kept', () => {
    const a = rec(1, { en: { lessons: { l1: { stars: 3, best: 90, doneAt: '2026-01-01', times: 2 } } }, es: { lessons: {} } });
    const b = rec(2, { en: { lessons: { l1: { stars: 1, best: 40, doneAt: '2026-02-01', times: 1 }, l2: { stars: 2, best: 70, doneAt: '2026-02-01', times: 1 } } }, es: { lessons: { e1: { stars: 1, best: 10, doneAt: 'x', times: 1 } } } });
    const m = mergePart('courses', a, b)!.data;
    expect(m.en.lessons.l1).toEqual({ stars: 3, best: 90, times: 2, doneAt: '2026-02-01' });
    expect(Object.keys(m.en.lessons).sort()).toEqual(['l1', 'l2']);
    expect(Object.keys(m.es.lessons)).toEqual(['e1']);
  });
  it('stats counters and coding stars: max', () => {
    const s = mergePart('stats', rec(1, { duels: 9, duelWins: 4, lessons: 1, questionsAnswered: 50, correct: 30, perCategoryCorrect: { istwa: 5 }, mathBest: 12 }),
      rec(2, { duels: 3, duelWins: 1, lessons: 6, questionsAnswered: 10, correct: 8, perCategoryCorrect: { istwa: 2, syans: 4 } }))!.data;
    expect(s).toMatchObject({ duels: 9, duelWins: 4, lessons: 6, questionsAnswered: 50, correct: 30, mathBest: 12, perCategoryCorrect: { istwa: 5, syans: 4 } });
    expect(mergePart('coding', rec(1, { 1: 3, 2: 1 }), rec(2, { 2: 2, 5: 1 }))!.data).toEqual({ 1: 3, 2: 2, 5: 1 });
  });
  it('missions, extra (ranks, unlocks), cards, vwayaj', () => {
    const mi = mergePart('missions', rec(1, { chestDay: '2026-11-05', fullDays: ['2026-11-01', '2026-11-05'], legendWeeks: ['2026-10-26'] }), rec(2, { chestDay: '2026-11-03', fullDays: ['2026-11-03'], legendWeeks: [] }))!.data;
    expect(mi).toEqual({ chestDay: '2026-11-05', fullDays: ['2026-11-01', '2026-11-03', '2026-11-05'], legendWeeks: ['2026-10-26'], firstDay: null });
    // the first play day is the earliest one either phone saw
    expect(mergePart('missions', rec(1, { firstDay: '2026-10-02' }), rec(2, { firstDay: '2026-10-09' }))!.data.firstDay).toBe('2026-10-02');
    const ex = mergePart('extra', rec(5, { rankSeen: 4, unlocked: ['a', 'b'], seenUnlocks: ['a'], onboarded: true, courseLang: 'en' }), rec(9, { rankSeen: 1, unlocked: ['c'], seenUnlocks: [], onboarded: false, courseLang: 'es' }))!.data;
    expect(ex).toEqual({ rankSeen: 4, unlocked: ['c', 'a', 'b'], seenUnlocks: ['a'], bought: [], onboarded: true, courseLang: 'es' });
    // avatar shop items bought on either phone are kept (a union, never newest-wins)
    const sh = mergePart('extra', rec(5, { bought: ['shirt:9', 'bg:10'] }), rec(9, { bought: ['frame:5'] }))!.data;
    expect(sh.bought.sort()).toEqual(['bg:10', 'frame:5', 'shirt:9']);
    expect(mergePart('extra', rec(9, { bought: ['frame:5'] }), rec(5, { bought: ['shirt:9'] }))!.data.bought.sort()).toEqual(['frame:5', 'shirt:9']);
    const ca = mergePart('cards', rec(1, { owned: ['x', 'y'], fresh: ['y'], read: ['x'] }), rec(2, { owned: ['z'], fresh: ['z'], read: ['y'] }))!.data;
    expect(ca.owned).toEqual(['z', 'x', 'y']);
    expect(ca.read.sort()).toEqual(['x', 'y']);
    expect(ca.fresh).toEqual(['z']);
    const vw = mergePart('vwayaj', rec(1, { done: { ouest: { best: 9, day: '2026-10-01' } }, best: { ouest: 9, nord: 4 }, eventsPlayed: ['e1'], selected: 'ouest' }),
      rec(2, { done: { ouest: { best: 7, day: '2026-10-05' }, sud: { best: 8, day: '2026-11-01' } }, best: { ouest: 7, sud: 8 }, eventsPlayed: ['e2'], selected: 'sud' }))!.data;
    expect(vw.done).toEqual({ ouest: { best: 9, day: '2026-10-01' }, sud: { best: 8, day: '2026-11-01' } });
    expect(vw.best).toEqual({ ouest: 9, nord: 4, sud: 8 });
    expect(vw.eventsPlayed.sort()).toEqual(['e1', 'e2']);
    expect(vw.selected).toBe('sud');
  });
  it('merging is idempotent and the order of the two sides does not change earned things', () => {
    const a = rec(100, { ...emptyProgress(), xp: 500, heroCards: ['a'], badges: { b1: '2026-01-01' } });
    const b = rec(200, { ...emptyProgress(), xp: 200, heroCards: ['b'], badges: { b2: '2026-02-01' } });
    const ab = mergePart('progress', a, b)!, ba = mergePart('progress', b, a)!;
    expect(ab.data.xp).toBe(ba.data.xp);
    expect(ab.data.heroCards.sort()).toEqual(ba.data.heroCards.sort());
    expect(mergePart('progress', ab, ab)).toEqual(ab);
    expect(mergePart('progress', ab, b)!.data.xp).toBe(500);
  });
  it('mergeSaves merges every part', () => {
    const s1: CloudSave = { v: 1, profileId: 'p', updatedAt: 10, parts: { progress: rec(10, { ...emptyProgress(), xp: 70 }), settings: rec(10, { sfx: true }) } };
    const s2: CloudSave = { v: 1, profileId: 'p', updatedAt: 20, parts: { progress: rec(20, { ...emptyProgress(), xp: 30 }), prefs: rec(20, { difficulty: 3 }) } };
    const m = mergeSaves(s1, s2);
    expect(m.updatedAt).toBe(20);
    expect(Object.keys(m.parts).sort()).toEqual(['prefs', 'progress', 'settings']);
    expect(m.parts.progress!.data.xp).toBe(70);
    expect(SAVE_PARTS.length).toBe(12);
  });
});

describe('cloud save helpers', () => {
  it('hashText changes with the content', () => {
    expect(hashText('{"a":1}')).toBe(hashText('{"a":1}'));
    expect(hashText('{"a":1}')).not.toBe(hashText('{"a":2}'));
  });
  it('stableJson ignores key order', () => {
    expect(stableJson({ b: 1, a: [{ d: 2, c: null }], u: undefined })).toBe('{"a":[{"c":null,"d":2}],"b":1}');
    expect(stableJson({ a: 1, b: 2 })).toBe(stableJson({ b: 2, a: 1 }));
  });
  it('trimProgress keeps the review list small', () => {
    const review: Record<string, any> = {};
    for (let i = 0; i < SAVE_MAX_REVIEW + 50; i++) review['q' + i] = { box: 0, due: `2026-01-${String(1 + (i % 28)).padStart(2, '0')}`, misses: 1 };
    const t = trimProgress({ xp: 1, review });
    expect(Object.keys(t.review)).toHaveLength(SAVE_MAX_REVIEW);
    expect(trimProgress({ xp: 1, review: { a: {} } }).review).toEqual({ a: {} });
  });
  it('savePreview summarises a save', () => {
    const s: CloudSave = { v: 1, profileId: 'p', updatedAt: 5, parts: { profile: rec(1, { username: 'Mango 12' }), progress: rec(1, { xp: 340, badges: { a: 'x' } }), cards: rec(1, { owned: ['a', 'b'] }), stats: rec(1, { lessons: 3 }) } };
    expect(savePreview(s)).toEqual({ username: 'Mango 12', avatar: undefined, xp: 340, cards: 2, badges: 1, lessons: 3, updatedAt: 5 });
    expect(savePreview(null)).toBeNull();
  });
});

describe('recovery codes', () => {
  it('look like WORD-1234 with no ambiguous digits', () => {
    const r = rng(7);
    for (let i = 0; i < 500; i++) {
      const c = makeRecoveryCode(r);
      expect(c).toMatch(/^[A-Z]{2,12}-[2-9]{4}$/);
      expect(normalizeRecoveryCode(c)).toBe(c);
    }
    expect(CODE_DIGITS).not.toMatch(/[01]/);
  });
  it('word list: unique, plain letters, nothing offensive, big enough', () => {
    expect(new Set(CODE_WORDS).size).toBe(CODE_WORDS.length);
    for (const w of CODE_WORDS) expect(w).toMatch(/^[A-Z]{3,8}$/);
    const banned = ['MAKAK', 'BOURIK', 'KOCHON', 'CHEN', 'KRAPO', 'KODENN', 'POUL', 'BET', 'SOT', 'GWO', 'LOTO'];
    for (const b of banned) expect(CODE_WORDS).not.toContain(b);
    expect(CODE_WORDS.length * CODE_DIGITS.length ** 4).toBeGreaterThan(300_000);
    expect(NAME_WORDS.length).toBeGreaterThan(0);
  });
  it('normalizes what a kid types', () => {
    expect(normalizeRecoveryCode('mango-4821')).toBe('MANGO-4821');
    expect(normalizeRecoveryCode(' Mango 4821 ')).toBe('MANGO-4821');
    expect(normalizeRecoveryCode('MANG0 4821')).toBe('MANGO-4821');
    expect(normalizeRecoveryCode('kenèp-2345')).toBe('KENEP-2345');
    expect(normalizeRecoveryCode('MANGO-482')).toBeNull();
    expect(normalizeRecoveryCode('4821')).toBeNull();
    expect(normalizeRecoveryCode('')).toBeNull();
  });
});
