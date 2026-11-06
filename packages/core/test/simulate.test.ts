import { describe, it, expect } from 'vitest';
import {
  SAMPLE_QUESTIONS, selectQuestions, createDuel, reduce, planBotAnswer, BOT_PROFILES, rng, publicView,
  emptyProgress, DEFAULT_SETTINGS, recordActivity, ensureQuests, applyEvent, noteWrong, dueReviews, levelFromXp, localDay,
} from '../src/index.js';

/** Full day in the life: a kid plays a duel vs the bot, loses one question, reviews it later. */
describe('end-to-end: kid vs bot, then progress', () => {
  it('runs a complete 10-question duel with timers and a bot, then updates streak/quests/review', () => {
    const TZ = 'America/Port-au-Prince';
    const seed = 2026;
    const rand = rng(seed);
    const questions = selectQuestions(SAMPLE_QUESTIONS, { age: '9-11', category: 'mix', count: 10, seed });
    expect(questions.length).toBeGreaterThanOrEqual(8); // sample bank is small

    let now = Date.parse('2026-11-06T16:05:00-05:00');
    let d = createDuel('sim', questions, now);
    d = reduce(d, { type: 'join', player: { id: 'kid', username: 'Malfini 27', isBot: false } }, now);
    now += 10_000; d = reduce(d, { type: 'tick' }, now); // nobody came → server adds bot
    expect(d.phase).toBe('ended'); // core alone ends the lobby; the server module intercepts before this and adds a bot:
    d = createDuel('sim', questions, now);
    d = reduce(d, { type: 'join', player: { id: 'kid', username: 'Malfini 27', isBot: false } }, now);
    d = reduce(d, { type: 'join', player: { id: 'bot', username: 'Robo Lanbi', isBot: true } }, now);

    const kidWrong: string[] = [];
    let guard = 0;
    while (d.phase !== 'ended' && guard++ < 500) {
      if (d.phase === 'question') {
        const q = d.questions[d.index];
        const bot = planBotAnswer(d, BOT_PROFILES['9-11'], rand);
        const kidAt = 1500 + Math.floor(rand() * 6000);
        const kidRight = rand() < 0.8;
        const kidChosen = kidRight ? q.answer : (q.answer + 1) % q.options.length;
        if (!kidRight) kidWrong.push(q.id);
        const first = Math.min(kidAt, bot.atMs), second = Math.max(kidAt, bot.atMs);
        const start = d.phaseStartedAt;
        d = reduce(d, { type: 'answer', playerId: kidAt <= bot.atMs ? 'kid' : 'bot', chosen: kidAt <= bot.atMs ? kidChosen : bot.chosen }, start + first);
        d = reduce(d, { type: 'answer', playerId: kidAt <= bot.atMs ? 'bot' : 'kid', chosen: kidAt <= bot.atMs ? bot.chosen : kidChosen }, start + second);
        expect(d.phase).toBe('reveal');
        now = start + second;
      }
      now += 200;
      d = reduce(d, { type: 'tick' }, now);
    }
    expect(d.phase).toBe('ended');
    expect(d.endReason).toBe('completed');
    const view = publicView(d, 'kid');
    expect(view.players.map((p) => p.score).every((s) => s >= 0)).toBe(true);

    // progress after the match
    let p = emptyProgress();
    p = recordActivity(p, DEFAULT_SETTINGS, now, TZ);
    p = ensureQuests(p, 'kid', localDay(now, TZ));
    const won = d.winnerId === 'kid';
    p = applyEvent(p, { type: 'duel_end', won, draw: d.winnerId === null }).progress;
    for (const id of kidWrong) p = noteWrong(p, id, now);
    p = { ...p, xp: p.xp + (won ? 40 : 15) };

    expect(p.streak.count).toBe(1);
    expect(p.quests.length).toBe(3);
    expect(Object.keys(p.review)).toEqual([...new Set(kidWrong)]);
    expect(dueReviews(p, now + 30 * 60_000).length).toBe(new Set(kidWrong).size);
    expect(levelFromXp(p.xp).level).toBeGreaterThanOrEqual(1);
  });
});
