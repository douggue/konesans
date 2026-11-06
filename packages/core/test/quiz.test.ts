import { describe, it, expect } from 'vitest';
import { SAMPLE_QUESTIONS, selectQuestions, scoreAnswer, startSolo, answerSolo, soloSummary, validatePack, startMath, answerMath } from '../src/index.js';

describe('selectQuestions', () => {
  it('serves only approved questions for the age band and category', () => {
    const qs = selectQuestions(SAMPLE_QUESTIONS, { age: '6-8', category: 'istwa', count: 10, seed: 1 });
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) { expect(q.status).toBe('approved'); expect(q.ages).toContain('6-8'); expect(q.category).toBe('istwa'); }
  });
  it('never serves questions in review', () => {
    const qs = selectQuestions(SAMPLE_QUESTIONS, { age: '12-14', category: 'kilti', count: 10, seed: 3 });
    expect(qs.map((q) => q.id)).not.toContain('kil-002');
  });
  it('is deterministic for a seed and shuffles options with answer remapped', () => {
    const a = selectQuestions(SAMPLE_QUESTIONS, { age: '9-11', category: 'mix', count: 5, seed: 42 });
    const b = selectQuestions(SAMPLE_QUESTIONS, { age: '9-11', category: 'mix', count: 5, seed: 42 });
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    for (const q of a) {
      const orig = SAMPLE_QUESTIONS.find((o) => o.id === q.id)!;
      expect(q.options[q.answer].ht).toBe(orig.options[orig.answer].ht);
    }
  });
  it('prefers review ids and avoids recently seen ones', () => {
    const qs = selectQuestions(SAMPLE_QUESTIONS, { age: '9-11', category: 'mix', count: 3, seed: 7, prefer: ['mat-002'], exclude: ['ist-001'] });
    expect(qs[0].id).toBe('mat-002');
    expect(qs.map((q) => q.id)).not.toContain('ist-001');
  });
});

describe('scoreAnswer', () => {
  it('gives 0 for wrong, 10–15 for right depending on speed, combo bonus, hint halves', () => {
    expect(scoreAnswer({ correct: false, elapsedMs: 100, combo: 0 })).toBe(0);
    expect(scoreAnswer({ correct: true, elapsedMs: 0, combo: 1 })).toBe(15);
    expect(scoreAnswer({ correct: true, elapsedMs: 15_000, combo: 1 })).toBe(10);
    expect(scoreAnswer({ correct: true, elapsedMs: 15_000, combo: 5 })).toBe(13);
    expect(scoreAnswer({ correct: true, elapsedMs: 0, combo: 1, usedHint: true })).toBe(8);
  });
});

describe('solo session', () => {
  it('walks through questions, tracks combo, times out at 15s', () => {
    const qs = selectQuestions(SAMPLE_QUESTIONS, { age: '9-11', category: 'mix', count: 3, seed: 5 });
    let s = startSolo(qs, 1000);
    s = answerSolo(s, qs[0].answer, 3000);           // right, 2s
    s = answerSolo(s, (qs[1].answer + 1) % qs[1].options.length, 4000); // wrong
    s = answerSolo(s, qs[2].answer, 4000 + 20_000);  // too slow → timeout
    expect(s.finished).toBe(true);
    const sum = soloSummary(s);
    expect(sum.correct).toBe(1);
    expect(sum.wrongIds).toEqual([qs[1].id, qs[2].id]);
    expect(s.answers[2].chosen).toBeNull();
  });
});

describe('validatePack', () => {
  it('accepts the sample bank and flags broken questions', () => {
    expect(validatePack(SAMPLE_QUESTIONS)).toEqual([]);
    const bad = [{ id: 'x', prompt: { fr: 'no kreyol' }, options: [{ ht: 'a' }], answer: 3, ages: [], status: 'nope' }];
    const errs = validatePack(bad);
    expect(errs.join()).toMatch(/Kreyòl/); expect(errs.join()).toMatch(/options/); expect(errs.join()).toMatch(/age/);
  });
});

describe('Kalkil Mantal', () => {
  it('generates age-appropriate problems and scores with combo', () => {
    let r = startMath('6-8', 9, 0);
    let expected = 0;
    for (let i = 0; i < 6; i++) { expect(['add', 'sub', 'double', 'half', 'missing', 'sequence']).toContain(r.current.kind); expected += r.current.points * (i + 1 >= 5 ? 2 : 1); r = answerMath(r, r.current.answer, 100 * i); }
    expect(r.score).toBe(expected); // combos 5 and 6 count double
    r = answerMath(r, -1, 700);
    expect(r.misses).toBe(1); expect(r.combo).toBe(0);
    expect(answerMath(r, r.current.answer, 70_000).score).toBe(r.score); // after time: ignored
  });
  it('division is always exact for 12-14', () => {
    let r = startMath('12-14', 3, 0);
    for (let i = 0; i < 40; i++) { if (r.current.kind === 'div') expect(r.current.a! % r.current.b!).toBe(0); r = answerMath(r, r.current.answer, i); }
  });
});
