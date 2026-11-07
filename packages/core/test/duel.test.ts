import { describe, it, expect } from 'vitest';
import { SAMPLE_QUESTIONS, selectQuestions, createDuel, reduce, publicView, planBotAnswer, planBotReaction, BOT_PROFILES, PRESET_REACTIONS, REACT_COOLDOWN_MS, ratingDelta, rng, type DuelState } from '../src/index.js';

const qs = () => selectQuestions(SAMPLE_QUESTIONS, { age: '9-11', category: 'mix', count: 3, seed: 11 });
const join = (s: DuelState, id: string, now: number, isBot = false) => reduce(s, { type: 'join', player: { id, username: id, isBot } }, now);

describe('duel state machine', () => {
  it('waits introMs before the first question accepts answers', () => {
    let s = createDuel('m0', qs(), 0, { introMs: 3000 });
    s = join(join(s, 'a', 0), 'b', 1000);
    expect(s.phase).toBe('question'); expect(s.phaseStartedAt).toBe(4000);
    const early = reduce(s, { type: 'answer', playerId: 'a', chosen: 0 }, 2000);
    expect(early.players[0].answer).toBeUndefined();
    expect(reduce(s, { type: 'tick' }, 4000 + s.questionMs - 1).phase).toBe('question');
    const ok = reduce(s, { type: 'answer', playerId: 'a', chosen: 0 }, 5000);
    expect(ok.players[0].answer?.atMs).toBe(1000);
  });

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

  it('keeps the old reaction ids valid and accepts the new stickers', () => {
    for (const id of ['bravo', 'wow', 'byen_jwe', 'anko', 'bon_chans', 'mwen_pare']) expect(PRESET_REACTIONS).toContain(id);
    let s = join(join(createDuel('m5b', qs(), 0), 'a', 0), 'b', 0);
    for (const [i, id] of (['ri', 'ke', 'dife'] as const).entries()) {
      s = reduce(s, { type: 'react', playerId: 'b', reaction: id }, 10_000 * (i + 1));
      expect(s.reactions.b).toBe(id);
    }
    expect(s.reactSeq?.b).toBe(3);
  });

  it('drops reactions sent faster than the cooldown, and counts each accepted one', () => {
    let s = join(join(createDuel('m5c', qs(), 0), 'a', 0), 'b', 0);
    s = reduce(s, { type: 'react', playerId: 'a', reaction: 'wow' }, 1000);
    expect(reduce(s, { type: 'react', playerId: 'a', reaction: 'bravo' }, 1000 + REACT_COOLDOWN_MS - 1)).toBe(s);
    // the other player has their own cooldown
    expect(reduce(s, { type: 'react', playerId: 'b', reaction: 'bravo' }, 1001).reactions.b).toBe('bravo');
    // same sticker again after the cooldown: still a new reaction (seq goes up)
    s = reduce(s, { type: 'react', playerId: 'a', reaction: 'wow' }, 1000 + REACT_COOLDOWN_MS);
    expect(s.reactSeq?.a).toBe(2);
    expect(publicView(s, 'b').reactSeq).toEqual({ a: 2 });
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

  it('reacts now and then with friendly preset stickers only, and the reducer accepts them', () => {
    let s = join(join(createDuel('m8', qs(), 0), 'kid', 0), 'bot', 0, true);
    const q = s.questions[0];
    s = reduce(s, { type: 'answer', playerId: 'kid', chosen: q.answer }, 1000);
    s = reduce(s, { type: 'answer', playerId: 'bot', chosen: (q.answer + 1) % q.options.length }, 2000);
    expect(s.phase).toBe('reveal');
    const rand = rng(7);
    const seen = new Set<string>();
    let some = 0;
    for (let i = 0; i < 300; i++) {
      for (const moment of ['start', 'reveal'] as const) {
        const r = planBotReaction(moment, s, 'bot', rand);
        if (!r) continue;
        some++; seen.add(r.reaction);
        expect(PRESET_REACTIONS).toContain(r.reaction);
        expect(r.delayMs).toBeGreaterThanOrEqual(500); expect(r.delayMs).toBeLessThanOrEqual(1400);
        expect(reduce(s, { type: 'react', playerId: 'bot', reaction: r.reaction }, 9000).reactions.bot).toBe(r.reaction);
      }
    }
    expect(some).toBeGreaterThan(200); expect(some).toBeLessThan(500);
    // kid right, Robo wrong → Robo cheers the kid
    for (const id of seen) expect(['bon_chans', 'mwen_pare', 'bravo', 'byen_jwe', 'wow']).toContain(id);
  });
});

describe('rating', () => {
  it('is zero-sum-ish and rewards upsets more', () => {
    expect(ratingDelta(1000, 1000, 1)).toBe(12);
    expect(ratingDelta(1000, 1200, 1)).toBeGreaterThan(12);
    expect(ratingDelta(1000, 1000, 0)).toBe(-12);
  });
});

describe('duel clock per age band', () => {
  it('6–8 duels get the same 30 s as 6–8 quizzes; the reveal waits for it and Robo thinks proportionally', async () => {
    const { questionTimeMs, QUESTION_TIME_MS } = await import('../src/index.js');
    expect(questionTimeMs('6-8')).toBe(30_000);
    expect(questionTimeMs('9-11')).toBe(QUESTION_TIME_MS);
    expect(questionTimeMs('12-14')).toBe(QUESTION_TIME_MS);
    let s = createDuel('m68', qs(), 0, { questionMs: questionTimeMs('6-8') });
    s = join(join(s, 'a', 0), 'b', 0);
    expect(publicView(s, 'a').questionMs).toBe(30_000);  // what (old and new) apps draw the bar from
    expect(reduce(s, { type: 'tick' }, 20_000).phase).toBe('question'); // 15 s would already be over
    expect(reduce(s, { type: 'tick' }, 30_000).phase).toBe('reveal');
    // an answer at 20 s still scores
    const late = reduce(reduce(reduce(s, { type: 'answer', playerId: 'a', chosen: s.questions[0].answer }, 20_000), { type: 'answer', playerId: 'b', chosen: (s.questions[0].answer + 1) % s.questions[0].options.length }, 21_000), { type: 'tick' }, 21_000);
    expect(late.players.find((p) => p.id === 'a')!.score).toBeGreaterThan(0);
    const r = rng(5);
    for (let i = 0; i < 50; i++) {
      const plan = planBotAnswer(s, BOT_PROFILES['6-8'], r);
      expect(plan.atMs).toBeGreaterThanOrEqual(BOT_PROFILES['6-8'].minMs * 2);
      expect(plan.atMs).toBeLessThanOrEqual(BOT_PROFILES['6-8'].maxMs * 2);
    }
  });
});
