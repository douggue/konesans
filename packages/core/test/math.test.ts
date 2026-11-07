import { describe, it, expect } from 'vitest';
import { makeProblem, kindsFor, startMath, answerMath, skipMath, mathXp, weakKinds, allowsNegative, KIND_LABEL, type MathKind, type MathProblem } from '../src/quiz/math.js';
import { rng } from '../src/quiz/engine.js';
import type { AgeBand } from '../src/types.js';

const AGES: AgeBand[] = ['6-8', '9-11', '12-14'];
const SUP: Record<string, number> = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };

/** Independently evaluate the displayed text to check the stored answer. */
function solve(p: MathProblem): number | undefined {
  const t = p.text.replace(/−/g, '-');
  switch (p.kind) {
    case 'add': case 'sub': case 'mul': case 'div': case 'double': case 'half': case 'neg': case 'order': {
      // plain arithmetic in the text
      let expr = t.replace(/×/g, '*').replace(/÷/g, '/').replace(/(\d+)²/g, '($1*$1)');
      if (!/^[\d\s+\-*/().]+$/.test(expr)) return undefined;
      return Function(`return (${expr})`)();
    }
    case 'missing': { const m = /^\? \+ (\d+) = (\d+)$/.exec(t) ?? /^(\d+) × \? = (\d+)$/.exec(p.text); if (!m) return undefined; return p.text.startsWith('?') ? +m[2] - +m[1] : +m[2] / +m[1]; }
    case 'sequence': { const n = t.replace(', ?', '').split(', ').map(Number); return n[2] + (n[1] - n[0]); }
    case 'square': return Number(t.replace('²', '')) ** 2;
    case 'percent': { const m = /^(\d+)% nan (\d+)$/.exec(t)!; return Math.round((+m[2] * +m[1]) / 100); }
    case 'remainder': { const m = /^(\d+) ÷ (\d+)$/.exec(p.text)!; return +m[1] % +m[2]; }
    case 'eq1': case 'eq2': {
      // substitute the answer for x and check both sides agree
      const [l, r] = t.split(' = ');
      const x = p.answer;
      const ev = (s: string) => Function('x', `return (${s.replace(/(\d)x/g, '$1*x').replace(/(\d)\(/g, '$1*(').replace(/×/g, '*').replace(/÷/g, '/')})`)(x);
      return Math.abs(ev(l) - ev(r)) < 1e-9 ? p.answer : NaN;
    }
    case 'power': { const m = /^(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹])$/.exec(p.text)!; return (+m[1]) ** SUP[m[2]]; }
    case 'sqrt': return Math.sqrt(Number(t.replace('√', '')));
    case 'fraction_of': { const m = /^(\d+)\/(\d+) nan (\d+)$/.exec(t)!; return (+m[3] * +m[1]) / +m[2]; }
    case 'average': { const n = t.split(', ').map(Number); return n.reduce((a, b) => a + b, 0) / n.length; }
    case 'compare_diff': { const m = /^(\d+) ak (\d+)$/.exec(t)!; return Math.abs(+m[1] - +m[2]); }
    case 'unit': { const m = /^(\d+) (km|m|è|minit|kg|jou) = \? (m|cm|minit|segonn|g|è)$/.exec(t)!; const f: Record<string, number> = { 'km>m': 1000, 'm>cm': 100, 'è>minit': 60, 'minit>segonn': 60, 'kg>g': 1000, 'jou>è': 24 }; return +m[1] * f[`${m[2]}>${m[3]}`]; }
  }
}

describe('Kalkil Mantal engine', () => {
  it('every kind for every age produces integer answers that match the text (200 seeds each)', () => {
    for (const age of AGES) for (const kind of kindsFor(age)) for (let seed = 1; seed <= 200; seed++) {
      const p = makeProblem(age, rng(seed * 31 + kind.length), kind);
      expect(p.kind).toBe(kind);
      expect(p.text.length, `${age}/${kind} empty text`).toBeGreaterThan(0);
      expect(Number.isInteger(p.answer), `${age}/${kind}: ${p.text} → ${p.answer}`).toBe(true);
      expect(Math.abs(p.answer)).toBeLessThan(100_000);
      const s = solve(p);
      expect(s, `${age}/${kind}: ${p.text} → ${p.answer} (solver ${s})`).toBe(p.answer);
      if (!allowsNegative(age)) expect(p.answer, `${age}/${kind}: negative answer ${p.text}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('age bands get the right difficulty', () => {
    expect(kindsFor('6-8')).not.toContain('mul');
    expect(kindsFor('6-8')).not.toContain('eq1');
    expect(kindsFor('9-11')).toContain('mul');
    expect(kindsFor('9-11')).not.toContain('eq2');
    expect(kindsFor('12-14')).toEqual(expect.arrayContaining(['eq1', 'eq2', 'neg', 'power', 'sqrt', 'percent', 'fraction_of']));
    for (let s = 0; s < 100; s++) { const p = makeProblem('6-8', rng(s)); expect(p.answer).toBeLessThanOrEqual(40); }
    expect(Object.keys(KIND_LABEL).sort()).toEqual([...new Set(AGES.flatMap(kindsFor))].sort());
  });

  it('run: deterministic problems, combo doubling, skip, weak kinds', () => {
    let r = startMath('12-14', 7, 0);
    const r2 = startMath('12-14', 7, 0);
    expect(r.current).toEqual(r2.current);
    // 6 correct in a row: 5th and 6th are doubled
    let expected = 0;
    for (let i = 0; i < 6; i++) { const pts = r.current.points * (i + 1 >= 5 ? 2 : 1); expected += pts; r = answerMath(r, r.current.answer, 1000); }
    expect(r.score).toBe(expected); expect(r.combo).toBe(6); expect(r.best).toBe(6); expect(r.i).toBe(6);
    // same seed replays to the same 7th problem
    let s = startMath('12-14', 7, 0); for (let i = 0; i < 6; i++) s = answerMath(s, s.current.answer, 1000);
    expect(s.current).toEqual(r.current);
    // a miss breaks the combo but keeps the problem
    const before = r.current; r = answerMath(r, r.current.answer + 1, 1000);
    expect(r.misses).toBe(1); expect(r.combo).toBe(0); expect(r.current).toEqual(before);
    // skip advances
    r = skipMath(r, 1000); expect(r.i).toBe(7); expect(r.misses).toBe(2); expect(r.current).not.toEqual(before);
    expect(weakKinds(r)[0]).toBe(before.kind);
    expect(mathXp(r)).toBe(Math.min(40, 10 + Math.round(r.score * 0.4)));
    // time over: nothing changes
    const frozen = answerMath(r, r.current.answer, 70_000); expect(frozen).toBe(r);
  });
});
