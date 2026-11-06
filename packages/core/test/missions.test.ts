import { describe, it, expect } from 'vitest';
import {
  emptyProgress, ensureQuests, applyEvent, chestReady, dailyQuests, emptyMissionLog, noteFullDay, openChest, canOpenChest,
  weekStart, weekProgress, weeklyLegendEarned, claimWeeklyLegend, msToLocalMidnight, CHEST_BONUS_XP, CHEST_BONUS_COINS,
  RANKS, rankForXp, rankIndexForLevel, xpForLevel, UNLOCKS, unlocksEarned, rankUnlocks, isItemOpen, lockSafeAvatar,
  type Progress, type GameEvent, type QuestState,
} from '../src/index.js';

const finishAll = (p: Progress): Progress => {
  for (const q of p.quests) {
    for (let i = 0; i < q.goal + 2; i++) {
      const e: GameEvent = q.kind === 'win_duel' ? { type: 'duel_end', won: true, draw: false }
        : q.kind === 'finish_lessons' ? { type: 'lesson_done', course: 'en' }
        : q.kind === 'math_score' ? { type: 'math_run', score: 20 }
        : q.kind === 'review_mistakes' ? { type: 'review_done', count: 3 }
        : { type: 'answer', correct: true, category: 'istwa' };
      p = applyEvent(p, e).progress;
    }
  }
  return p;
};

describe('daily quests', () => {
  it('never hand out a quest the app cannot complete (review)', () => {
    for (let i = 0; i < 300; i++) expect(dailyQuests('u' + i, '2026-11-06').some((q) => q.kind === 'review_mistakes')).toBe(false);
  });
  it('swap an old unfinishable quest on the same day, keeping progress on the others', () => {
    const day = '2026-11-06';
    const old: QuestState[] = [
      { id: `${day}:win_duel`, kind: 'win_duel', goal: 1, progress: 1, xp: 20, done: true },
      { id: `${day}:review_mistakes`, kind: 'review_mistakes', goal: 5, progress: 2, xp: 25, done: false },
      { id: `${day}:answer_correct`, kind: 'answer_correct', goal: 10, progress: 4, xp: 20, done: false },
    ];
    const p = ensureQuests({ ...emptyProgress(), questsDay: day, quests: old }, 'u1', day);
    expect(p.quests[0]).toEqual(old[0]); expect(p.quests[2]).toEqual(old[2]);
    expect(p.quests[1].kind).not.toBe('review_mistakes');
    expect(new Set(p.quests.map((q) => q.kind)).size).toBe(3);
    expect(ensureQuests(p, 'u1', day)).toBe(p); // stable
  });
  it('"play in a category" ignores the mixed daily quiz and counts wrong answers too', () => {
    const day = '2026-11-06';
    let p: Progress = { ...emptyProgress(), questsDay: day, quests: [{ id: 'x', kind: 'play_category', goal: 5, progress: 0, xp: 15, done: false }] };
    p = applyEvent(p, { type: 'answer', correct: true, category: 'mix' }).progress;
    expect(p.quests[0].progress).toBe(0);
    p = applyEvent(p, { type: 'answer', correct: false, category: 'istwa' }).progress;
    expect(p.quests[0].progress).toBe(1);
  });
});

describe('daily chest', () => {
  it('opens once per day, only when all three quests are done', () => {
    const day = '2026-11-06';
    let p = ensureQuests(emptyProgress(), 'u1', day);
    let log = emptyMissionLog();
    expect(openChest(log, p, day)).toBeNull();
    p = finishAll(p);
    expect(chestReady(p)).toBe(true);
    const r = openChest(log, p, day)!;
    expect(r.xp).toBe(CHEST_BONUS_XP); expect(r.coins).toBe(CHEST_BONUS_COINS);
    log = r.log;
    expect(log.fullDays).toContain(day);
    expect(canOpenChest(log, p, day)).toBe(false);
    expect(openChest(log, p, day)).toBeNull();
    // next day: fresh quests, chest closed again until they are done
    const p2 = ensureQuests(p, 'u1', '2026-11-07');
    expect(openChest(log, p2, '2026-11-07')).toBeNull();
    expect(openChest(log, finishAll(p2), '2026-11-07')).not.toBeNull();
  });
  it('a stale quest list (yesterday) cannot open today\'s chest', () => {
    const p = finishAll(ensureQuests(emptyProgress(), 'u1', '2026-11-05'));
    expect(openChest(emptyMissionLog(), p, '2026-11-06')).toBeNull();
  });
});

describe('weekly missions', () => {
  it('weeks start on Monday', () => {
    expect(weekStart('2026-11-06')).toBe('2026-11-02'); // Friday → Monday
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
    expect(weekStart('2026-11-08')).toBe('2026-11-02'); // Sunday belongs to the week before
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
  });
  it('counts full days this week; 7/7 earns the Legend card once', () => {
    let log = emptyMissionLog();
    const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
    for (const d of days.slice(0, 4)) log = noteFullDay(log, finishAll(ensureQuests(emptyProgress(), 'u1', d)));
    log = noteFullDay(log, finishAll(ensureQuests(emptyProgress(), 'u1', '2026-10-30'))); // last week: doesn't count
    let w = weekProgress(log, '2026-11-06');
    expect(w.done).toBe(4); expect(w.complete).toBe(false);
    expect(w.days.find((d) => d.today)?.day).toBe('2026-11-06');
    expect(w.days.filter((d) => d.future).length).toBe(2);
    expect(weeklyLegendEarned(log, '2026-11-06')).toBe(false);
    for (const d of days.slice(4)) log = noteFullDay(log, finishAll(ensureQuests(emptyProgress(), 'u1', d)));
    w = weekProgress(log, '2026-11-08');
    expect(w.done).toBe(7); expect(w.complete).toBe(true);
    expect(weeklyLegendEarned(log, '2026-11-08')).toBe(true);
    log = claimWeeklyLegend(log, '2026-11-08');
    expect(weeklyLegendEarned(log, '2026-11-08')).toBe(false);
    expect(claimWeeklyLegend(log, '2026-11-08')).toBe(log);
    expect(weekProgress(log, '2026-11-09').done).toBe(0); // new week
  });
  it('a day is only "full" when all quests are done, and only recorded once', () => {
    const p = ensureQuests(emptyProgress(), 'u1', '2026-11-06');
    expect(noteFullDay(emptyMissionLog(), p).fullDays).toEqual([]);
    const done = finishAll(p);
    const l1 = noteFullDay(emptyMissionLog(), done);
    expect(noteFullDay(l1, done)).toBe(l1);
  });
});

describe('countdown to new quests', () => {
  it('counts to local midnight in the kid\'s time zone', () => {
    const TZ = 'America/Port-au-Prince'; // UTC-5 in November
    expect(msToLocalMidnight(Date.parse('2026-11-06T17:48:00-05:00'), TZ)).toBe((6 * 60 + 12) * 60_000);
    expect(msToLocalMidnight(Date.parse('2026-11-06T23:59:30-05:00'), TZ)).toBe(30_000);
    expect(msToLocalMidnight(Date.parse('2026-11-06T00:00:00-05:00'), TZ)).toBe(86_400_000);
  });
});

describe('ranks', () => {
  it('ten ranks, ordered by level, starting at level 1 and ending with Lejand', () => {
    expect(RANKS.length).toBe(10);
    expect(RANKS[0].level).toBe(1);
    expect(RANKS[RANKS.length - 1].name.ht).toBe('Lejand');
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].level).toBeGreaterThan(RANKS[i - 1].level);
    for (const r of RANKS) { expect(r.name.ht).toBeTruthy(); expect(r.name.fr).toBeTruthy(); }
  });
  it('maps XP to the right rank with progress to the next one', () => {
    expect(rankForXp(0).rank.id).toBe('grenn');
    expect(rankForXp(0).progress).toBe(0);
    expect(rankForXp(xpForLevel(3) - 1).index).toBe(0);
    expect(rankForXp(xpForLevel(3)).index).toBe(1);
    const mid = rankForXp((xpForLevel(5) + xpForLevel(8)) / 2);
    expect(mid.rank.id).toBe('zwazo'); expect(mid.progress).toBeCloseTo(0.5, 5);
    expect(mid.xpToNext).toBe(xpForLevel(8) - (xpForLevel(5) + xpForLevel(8)) / 2);
    const top = rankForXp(10_000_000);
    expect(top.rank.id).toBe('lejand'); expect(top.next).toBeNull(); expect(top.progress).toBe(1); expect(top.xpToNext).toBe(0);
    expect(rankIndexForLevel(39)).toBe(8); expect(rankIndexForLevel(40)).toBe(9);
  });
});

describe('unlockable avatar items', () => {
  it('every rank after the first unlocks something; ids are unique', () => {
    for (let i = 1; i < RANKS.length; i++) expect(rankUnlocks(i).length, RANKS[i].id).toBeGreaterThan(0);
    expect(new Set(UNLOCKS.map((x) => x.id)).size).toBe(UNLOCKS.length);
  });
  it('earned by rank, streak and trophies', () => {
    expect(unlocksEarned({ xp: 0, streak: 0, badges: 0 })).toEqual([]);
    const lvl5 = unlocksEarned({ xp: xpForLevel(5), streak: 0, badges: 0 });
    expect(lvl5).toEqual(expect.arrayContaining(['hairColor:5', 'shirt:6', 'hair:bun', 'bg:6']));
    expect(lvl5).not.toContain('extra:headphones');
    expect(unlocksEarned({ xp: 0, streak: 7, badges: 0 })).toEqual(['extra:flower']);
    expect(unlocksEarned({ xp: 0, streak: 0, badges: 3 })).toEqual(['hairColor:7']);
    expect(unlocksEarned({ xp: 10_000_000, streak: 30, badges: 9 }).length).toBe(UNLOCKS.length);
  });
  it('free items are always open; gated ones open when owned or earned', () => {
    expect(isItemOpen('hair', 'afro', [])).toBe(true);
    expect(isItemOpen('extra', 'crown', [])).toBe(false);
    expect(isItemOpen('extra', 'crown', ['extra:crown'])).toBe(true);
    expect(isItemOpen('hair', 'bun', [], { xp: xpForLevel(5), streak: 0, badges: 0 })).toBe(true);
  });
  it('old saved avatars stay valid; locked parts fall back to free ones', () => {
    const old = { skin: 2, hair: 'puffs' as const, hairColor: 1, shirt: 3, extra: 'mask' as const, bg: 4 };
    expect(lockSafeAvatar(old, [])).toEqual({ ...old, frame: undefined });
    const fancy = { skin: 2, hair: 'locs' as const, hairColor: 7, shirt: 8, extra: 'crown' as const, bg: 8, frame: 4 };
    expect(lockSafeAvatar(fancy, [])).toEqual({ skin: 2, hair: 'afro', hairColor: 0, shirt: 1, extra: 'none', bg: 0, frame: 0 });
    expect(lockSafeAvatar(fancy, UNLOCKS.map((x) => x.id))).toEqual(fancy);
  });
});
