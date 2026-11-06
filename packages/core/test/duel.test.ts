import { describe, it, expect } from 'vitest';
import { SAMPLE_QUESTIONS, selectQuestions, createDuel, reduce, publicView, planBotAnswer, BOT_PROFILES, ratingDelta, rng, type DuelState } from '../src/index.js';

const qs = () => selectQuestions(SAMPLE_QUESTIONS, { age: '9-11', category: 'mix', count: 3, seed: 11 });
const join = (s: DuelState, id: string, now: number, isBot = false) => reduce(s, { type: 'join', player: { id, username: id, isBot } }, now);

describe('duel state machine', () => {
  it('starts when two players join, scores first-correct, reveals, ends with a winner', () => {
    let s = createDuel('m1', qs(), 0);
    s = join(s, 'a', 0);
    expect(s.phase).toBe('lobby');
    s = join(s, 'b', 100);
    expect(s.phase).toBe('question');

    const q = s.questions[0];
    s = reduce(s, { type: 'answer', playerId: 'a', chosen: q.answer }, 2100);             // a right, 2s
    expect(s.phase).toBe('question');                                                       // waiting for b
    s = reduce(s, { type: 'answer', playerId: 'b', chosen: (q.answer + 1) % q.options.length }, 3100); // b wrong
    expect(s.phase).toBe('reveal');
    expect(s.players[0].score).toBeGreaterThan(10);
    expect(s.players[1].score).toBe(0);

    s = reduce(s, { type: 'tick' }, 3100 + 2999);
    expect(s.phase).toBe('reveal');
    s = reduce(s, { type: 'tick' }, 3100 + 3000);
    expect(s.phase).toBe('question'); expect(s.index).toBe(1);

    // b never answers the rest → timeouts; a answers right
    for (let i = 1; i < 3; i++) {
      const t = s.phaseStartedAt;
      s = reduce(s, { type: 'answer', playerId: 'a', chosen: s.questions[i].answer }, t + 1000);
      s = reduce(s, { type: 'tick' }, t + 15_000);   // question timeout → reveal
      expect(s.phase).toBe('reveal');
      s = reduce(s, { type: 'tick' }, t + 15_000 + 3000);
    }
    expect(s.phase).toBe('ended'); expect(s.endReason).toBe('completed'); expect(s.winnerId).toBe('a');
  });

  it('ignores double answers, out-of-range answers, and answers from strangers', () => {
    let s = join(join(createDuel('m2', qs(), 0), 'a', 0), 'b', 0);
    const q = s.questions[0];
    s = reduce(s, { type: 'answer', playerId: 'a', chosen: q.answer }, 500);
    const again = reduce(s, { type: 'answer', playerId: 'a', chosen: 0 }, 600);
    expect(again).toBe(s);
    expect(reduce(s, { type: 'answer', playerId: 'b', chosen: 99 }, 600)).toBe(s);
    expect(reduce(s, { type: 'answer', playerId: 'zzz', chosen: 0 }, 600)).toBe(s);
  });

  it('forfeits when a player leaves mid-match; lobby times out', () => {
    let s = join(join(createDuel('m3', qs(), 0), 'a', 0), 'b', 0);
    s = reduce(s, { type: 'leave', playerId: 'b' }, 1000);
    expect(s.phase).toBe('ended'); expect(s.endReason).toBe('forfeit'); expect(s.winnerId).toBe('a');

    let l = join(createDuel('m4', qs(), 0), 'a', 0);
    l = reduce(l, { type: 'tick' }, 10_000);
    expect(l.phase).toBe('ended'); expect(l.endReason).toBe('timeout');
  });

  it('only accepts preset reactions', () => {
    let s = join(join(createDuel('m5', qs(), 0), 'a', 0), 'b', 0);
    s = reduce(s, { type: 'react', playerId: 'a', reaction: 'bravo' }, 1);
    expect(s.reactions.a).toBe('bravo');
    expect(reduce(s, { type: 'react', playerId: 'a', reaction: 'you suck' }, 2)).toBe(s);
  });

  it('public view hides the answer key and the opponent choice until reveal', () => {
    let s = join(join(createDuel('m6', qs(), 0), 'a', 0), 'b', 0);
    s = reduce(s, { type: 'answer', playerId: 'a', chosen: 0 }, 100);
    const vb = publicView(s, 'b');
    expect(vb.question!.answer).toBeUndefined();
    expect(vb.players[0].answered).toBe(true);
    expect(vb.players[0].chosen).toBeUndefined();
    expect(publicView(s, 'a').players[0].chosen).toBe(0);
    s = reduce(s, { type: 'tick' }, 15_000);
    expect(publicView(s, 'b').question!.answer).toBeDefined();
  });
});

describe('bot', () => {
  it('answers within the profile window at roughly the profile accuracy', () => {
    const s = join(join(createDuel('m7', qs(), 0), 'kid', 0), 'bot', 0, true);
    const rand = rng(1);
    let right = 0;
    for (let i = 0; i < 400; i++) {
      const plan = planBotAnswer(s, BOT_PROFILES['9-11'], rand);
      expect(plan.atMs).toBeGreaterThanOrEqual(3000); expect(plan.atMs).toBeLessThanOrEqual(9000);
      if (plan.chosen === s.questions[0].answer) right++;
    }
    expect(right / 400).toBeGreaterThan(0.55); expect(right / 400).toBeLessThan(0.75);
  });
});

describe('rating', () => {
  it('is zero-sum-ish and rewards upsets more', () => {
    expect(ratingDelta(1000, 1000, 1)).toBe(12);
    expect(ratingDelta(1000, 1200, 1)).toBeGreaterThan(12);
    expect(ratingDelta(1000, 1000, 0)).toBe(-12);
  });
});
