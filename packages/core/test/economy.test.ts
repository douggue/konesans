import { describe, it, expect } from 'vitest';
import {
  quizXp, mathRunXp, codingXp, XP, startMath, answerMath, mathXp,
  emptyProgress, DEFAULT_SETTINGS, recordPlay, daysToFreeze,
  dailyQuests, ensureQuests, applyEvent, questKindActive,
  emptyMissionLog, noteFullDay, noteFirstDay, weekProgress, weekStart, weeklyLegendEarned, claimWeeklyLegend, weekdayIndex,
  SHOP_ITEMS, buyShopItem, shopItemFor, isItemOpen, lockSafeAvatar, UNLOCKS,
  mergeDefaults, checkBadges, scoreAnswer, QUESTION_TIME_MS,
  type Progress, type QuestState,
} from '../src/index.js';

const TZ = 'America/Port-au-Prince';
const at = (iso: string) => Date.parse(iso);

describe('XP table: a typical activity pays 15–40 XP', () => {
  it('quiz: a 10-question quiz pays about 20–40, never more than 40', () => {
    const avg = 10 * scoreAnswer({ correct: true, elapsedMs: QUESTION_TIME_MS / 2, combo: 0 }); // all right, medium speed
    expect(quizXp(avg)).toBeGreaterThanOrEqual(15);
    expect(quizXp(avg)).toBeLessThanOrEqual(40);
    expect(quizXp(7 * 12)).toBeGreaterThanOrEqual(15);
    expect(quizXp(20 * 20)).toBe(40); // a 20-question daily is capped
    expect(quizXp(0)).toBe(0);
  });
  it('Kalkil Mantal: capped at 40 even for a very fast run (was +376 XP)', () => {
    expect(mathRunXp(188)).toBe(40);
    expect(mathRunXp(0)).toBe(0);
    // a 6–8 kid with 8 right answers still earns a fair amount
    expect(mathRunXp(8)).toBeGreaterThanOrEqual(13);
    // a normal 9–11 run, ~25 right with combos
    expect(mathRunXp(45)).toBeGreaterThanOrEqual(20);
    expect(mathRunXp(45)).toBeLessThanOrEqual(40);
    // a real fast run through the engine
    let r = startMath('12-14', 3, 0);
    for (let i = 0; i < 90; i++) r = answerMath(r, r.current.answer, 1000);
    expect(r.score).toBeGreaterThan(150);
    expect(mathXp(r)).toBe(40);
  });
  it('coding: first clear pays 15–25, replays pay only the stars they add', () => {
    expect(codingXp(0, 1)).toBe(15);
    expect(codingXp(0, 3)).toBe(25);
    expect(codingXp(3, 3)).toBe(0); // replaying a 3-star level: nothing (was +15 every 5 s)
    expect(codingXp(1, 3)).toBe(10);
    expect(codingXp(2, 1)).toBe(0);
    expect(codingXp(0, 0)).toBe(0);
  });
  it('XP per minute is in the same range across modes', () => {
    // rough minutes per activity: quiz 2.5, math 1, lesson 3, duel 2, coding level 1.5
    const perMin = {
      quiz: quizXp(10 * 14) / 2.5,
      math: mathRunXp(45) / 1,
      lesson: XP.lessonComplete / 3,
      duel: XP.duelWin / 2,
      coding: codingXp(0, 3) / 1.5,
    };
    const vals = Object.values(perMin);
    expect(Math.max(...vals) / Math.min(...vals)).toBeLessThan(5); // was ~10× for math
    for (const v of vals) expect(v).toBeLessThanOrEqual(40);
  });
});

describe('streak: only real activity counts; freeze every 7 days', () => {
  it('7 days in a row re-grants the freeze', () => {
    let p: Progress = { ...emptyProgress(), streak: { count: 0, lastDay: null, freezeAvailable: false } };
    for (let d = 1; d <= 6; d++) p = recordPlay(p, DEFAULT_SETTINGS, at(`2026-11-0${d}T12:00:00-05:00`), TZ);
    expect(p.streak.count).toBe(6);
    expect(p.streak.freezeAvailable).toBe(false);
    expect(daysToFreeze(p)).toBe(1);
    p = recordPlay(p, DEFAULT_SETTINGS, at('2026-11-07T12:00:00-05:00'), TZ);
    expect(p.streak.count).toBe(7);
    expect(p.streak.freezeAvailable).toBe(true);
    expect(daysToFreeze(p)).toBe(0);
    // skip a day: the freeze is spent, the streak goes on; the next freeze comes at 14
    p = recordPlay(p, DEFAULT_SETTINGS, at('2026-11-09T12:00:00-05:00'), TZ);
    expect(p.streak.count).toBe(8);
    expect(p.streak.freezeAvailable).toBe(false);
    // same day again: nothing changes
    expect(recordPlay(p, DEFAULT_SETTINGS, at('2026-11-09T18:00:00-05:00'), TZ)).toBe(p);
  });
  it('ensureQuests alone (opening the app) never touches the streak', () => {
    const p = ensureQuests(emptyProgress(), 'u1', '2026-11-06');
    expect(p.streak).toEqual(emptyProgress().streak);
  });
});

describe('quests: same rules in every mode, goals per age', () => {
  const only = (kind: QuestState['kind'], goal: number): Progress => ({ ...emptyProgress(), questsDay: 'd', quests: [{ id: 'd:' + kind, kind, goal, progress: 0, xp: 20, done: false }] });
  it('duel and Kalkil Mantal answers count for "answer correctly", not for "play a category"', () => {
    let p = only('answer_correct', 3);
    p = applyEvent(p, { type: 'answer', correct: true, category: 'duel' }).progress;
    p = applyEvent(p, { type: 'answer', correct: true, category: 'math' }).progress;
    p = applyEvent(p, { type: 'answer', correct: false, category: 'math' }).progress;
    expect(p.quests[0].progress).toBe(2);
    let c = only('play_category', 3);
    for (const category of ['duel', 'math', 'mix']) c = applyEvent(c, { type: 'answer', correct: true, category }).progress;
    expect(c.quests[0].progress).toBe(0);
    c = applyEvent(c, { type: 'answer', correct: false, category: 'istwa' }).progress;
    expect(c.quests[0].progress).toBe(1);
  });
  it('a coding quest exists and finishing a level advances it', () => {
    expect(questKindActive('coding_level')).toBe(true);
    const r = applyEvent(only('coding_level', 1), { type: 'coding_done', levelId: 3 });
    expect(r.progress.quests[0].done).toBe(true);
    expect(r.xpAwarded).toBe(20);
  });
  it('goals follow the age band (math score 8 / 12 / 15)', () => {
    const goal = (age: '6-8' | '9-11' | '12-14', kind: string) => {
      for (let i = 0; i < 400; i++) { const q = dailyQuests('u' + i, '2026-11-06', age).find((x) => x.kind === kind); if (q) return q.goal; }
      return -1;
    };
    expect(goal('6-8', 'math_score')).toBe(8);
    expect(goal('9-11', 'math_score')).toBe(12);
    expect(goal('12-14', 'math_score')).toBe(15);
    expect(goal('6-8', 'answer_correct')).toBeLessThan(goal('12-14', 'answer_correct'));
    // same kinds whatever the age (only goals change), so the pick stays the same for a kid
    expect(dailyQuests('u7', '2026-11-06', '6-8').map((q) => q.kind)).toEqual(dailyQuests('u7', '2026-11-06', '12-14').map((q) => q.kind));
  });
});

describe('weekly 7/7: the week counts from the first day the kid played', () => {
  const full = (log: ReturnType<typeof emptyMissionLog>, day: string) => {
    const p: Progress = { ...emptyProgress(), questsDay: day, quests: [1, 2, 3].map((i) => ({ id: `${day}:${i}`, kind: 'answer_correct', goal: 1, progress: 1, xp: 1, done: true }) as QuestState) };
    return noteFullDay(log, p);
  };
  it('a Friday starter gets a full 7-day week, nothing drawn as missed', () => {
    let log = noteFirstDay(emptyMissionLog(), '2026-11-06'); // Friday
    expect(noteFirstDay(log, '2026-11-10').firstDay).toBe('2026-11-06');
    const w = weekProgress(log, '2026-11-06');
    expect(w.start).toBe('2026-11-06');
    expect(w.days.filter((d) => !d.future && !d.today && !d.full)).toHaveLength(0); // no grey "missed" day
    expect(weekdayIndex(w.days[0].day)).toBe(4); // labels follow the real weekday (V)
    for (let i = 0; i < 7; i++) log = full(log, `2026-11-${String(6 + i).padStart(2, '0')}`);
    expect(weeklyLegendEarned(log, '2026-11-12')).toBe(true);
    log = claimWeeklyLegend(log, '2026-11-12');
    expect(weeklyLegendEarned(log, '2026-11-12')).toBe(false);
    expect(weekStart('2026-11-13', log.firstDay)).toBe('2026-11-13'); // next week
  });
  it('a kid who has not played yet sees a week starting today', () => {
    const w = weekProgress(emptyMissionLog(), '2026-11-06');
    expect(w.start).toBe('2026-11-06');
  });
  it('old saves without a first day keep Monday weeks', () => {
    const log = full({ chestDay: null, fullDays: [], legendWeeks: [] }, '2026-11-03');
    expect(weekProgress(log, '2026-11-06').start).toBe('2026-11-02');
  });
});

describe('avatar shop', () => {
  it('items are new (not rank unlocks), priced, and closed until bought', () => {
    expect(SHOP_ITEMS.length).toBeGreaterThanOrEqual(10);
    for (const it of SHOP_ITEMS) {
      expect(UNLOCKS.some((u) => u.id === it.id)).toBe(false);
      expect(it.price).toBeGreaterThan(0);
      expect(isItemOpen(it.kind, it.value, [], { xp: 1e9, streak: 999, badges: 99 })).toBe(false);
      expect(isItemOpen(it.kind, it.value, [it.id])).toBe(true);
    }
    expect(new Set(SHOP_ITEMS.map((x) => x.id)).size).toBe(SHOP_ITEMS.length);
  });
  it('buying spends coins once', () => {
    const it = shopItemFor('extra', 'bowtie')!;
    expect(buyShopItem(it.price - 1, [], it.id)).toEqual({ ok: false, reason: 'coins' });
    const r = buyShopItem(500, ['x'], it.id);
    expect(r.ok && r.coins).toBe(500 - it.price);
    expect(r.ok && r.bought).toEqual(['x', it.id]);
    expect(buyShopItem(500, [it.id], it.id)).toEqual({ ok: false, reason: 'owned' });
    expect(buyShopItem(500, [], 'nope:1')).toEqual({ ok: false, reason: 'unknown' });
  });
  it('an unbought item in a restored avatar falls back to a free default', () => {
    const a = { skin: 0, hair: 'afro' as const, hairColor: 8, shirt: 9, extra: 'headwrap' as const, bg: 11, frame: 6 };
    expect(lockSafeAvatar(a, [])).toMatchObject({ hairColor: 0, shirt: 1, extra: 'none', bg: 0, frame: 0 });
    expect(lockSafeAvatar(a, ['hairColor:8', 'shirt:9', 'extra:headwrap', 'bg:11', 'frame:6'])).toEqual(a);
  });
});

describe('coding trophy', () => {
  it('5 coding levels give "Ti pwogramè"', () => {
    const base = { p: emptyProgress(), duelWins: 0, lessonsDone: 0, wordsLearned: 0, departmentsUnlocked: 0, eventsPlayed: [] };
    expect(checkBadges({ ...base, codingLevels: 4 }, 'x').awarded).not.toContain('kod5');
    expect(checkBadges({ ...base, codingLevels: 5 }, 'x').awarded).toContain('kod5');
  });
});

describe('persisted stores: deep merge of saved data over new defaults', () => {
  const defaults = {
    settings: { sfx: true, music: true, voice: true, haptic: true, textSize: 1 },
    kidSettings: { ...DEFAULT_SETTINGS },
    missions: emptyMissionLog(),
    progress: emptyProgress(),
    stats: { duels: 0, perCategoryCorrect: {} as Record<string, number> },
    changeReq: null as null | { id: string },
    bought: [] as string[],
    act: () => 1,
  };
  it('a v1 snapshot without new nested fields gets their defaults', () => {
    const v1 = {
      settings: { sfx: false, music: true, voice: true, haptic: false }, // no textSize (added later)
      kidSettings: { dailyLimitMin: 30 },
      missions: { chestDay: '2026-11-01', fullDays: ['2026-11-01'], legendWeeks: [] }, // no firstDay
      progress: { xp: 500, coins: 20, streak: { count: 3, lastDay: '2026-11-01' } }, // no freezeAvailable
      stats: { duels: 4, perCategoryCorrect: { istwa: 7 } },
      changeReq: { id: 'r1' },
    };
    const m = mergeDefaults(defaults, v1);
    expect(m.settings).toEqual({ sfx: false, music: true, voice: true, haptic: false, textSize: 1 });
    expect(m.kidSettings).toEqual({ ...DEFAULT_SETTINGS, dailyLimitMin: 30 });
    expect(m.missions.firstDay).toBeNull();
    expect(m.missions.fullDays).toEqual(['2026-11-01']);
    expect(m.progress.xp).toBe(500);
    expect(m.progress.streak).toEqual({ count: 3, lastDay: '2026-11-01', freezeAvailable: true });
    expect(m.progress.quests).toEqual([]);
    expect(m.stats.perCategoryCorrect).toEqual({ istwa: 7 });
    expect(m.changeReq).toEqual({ id: 'r1' });
    expect(m.bought).toEqual([]);
    expect(typeof m.act).toBe('function');
  });
  it('wrong-shaped saved values fall back to the default', () => {
    const m = mergeDefaults(defaults, { settings: { textSize: 'big' }, progress: 'x', bought: { a: 1 }, act: 5 });
    expect(m.settings.textSize).toBe(1);
    expect(m.progress).toEqual(emptyProgress());
    expect(m.bought).toEqual([]);
    expect(typeof m.act).toBe('function');
  });
  it('null saved where null is allowed stays null; nothing saved gives the defaults', () => {
    expect(mergeDefaults(defaults, { changeReq: null }).changeReq).toBeNull();
    expect(mergeDefaults(defaults, undefined)).toBe(defaults);
  });
});
