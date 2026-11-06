import { describe, it, expect } from 'vitest';
import { BANK, validatePack, selectQuestions } from '../src/index.js';

describe('authored bank', () => {
  it('passes pack validation', () => {
    expect(validatePack(BANK)).toEqual([]);
  });
  it('is bilingual with explanations', () => {
    for (const q of BANK) {
      expect(q.prompt.fr, q.id).toBeTruthy();
      expect(q.options.every((o) => o.ht && o.fr), q.id).toBe(true);
      expect(q.explain?.ht, q.id).toBeTruthy();
    }
  });
  it('has no duplicate prompts', () => {
    const seen = new Map<string, string>();
    for (const q of BANK) {
      const k = q.prompt.ht.toLowerCase().replace(/\s+/g, ' ').trim();
      expect(seen.get(k), `${q.id} duplicates ${seen.get(k)}`).toBeUndefined();
      seen.set(k, q.id);
    }
  });
  it('serves review questions only when asked', () => {
    const review = BANK.filter((q) => q.status === 'review' && q.ages.includes('9-11'));
    if (!review.length) return;
    const without = selectQuestions(review, { age: '9-11', count: 5, seed: 1 });
    const withR = selectQuestions(review, { age: '9-11', count: 5, seed: 1, includeReview: true });
    expect(without).toHaveLength(0);
    expect(withR.length).toBeGreaterThan(0);
  });
});
