import { describe, it, expect } from 'vitest';
import { LEVELS, SOLUTIONS, DEBUG_PUZZLES, applyFix, run, scoreRun, validateProgram, countBlocks, turn, generateSet, validatePack, BASICS_QUESTIONS, type Block } from '../src/index.js';

describe('block interpreter', () => {
  it('every level is solvable by its reference solution within par', () => {
    for (const lv of LEVELS) {
      const sol = SOLUTIONS[lv.id];
      expect(validateProgram(lv, sol)).toEqual([]);
      const r = run(lv.maze, sol, { stopOnBump: lv.stopOnBump });
      expect(r.ok, `level ${lv.id} ${lv.title}: ${r.reason}`).toBe(true);
      expect(r.blocksUsed).toBeLessThanOrEqual(lv.par);
      expect(scoreRun(r, lv)).toBeGreaterThanOrEqual(15);
    }
  });

  it('turning is consistent', () => {
    expect(turn('N', true)).toBe('E'); expect(turn('N', false)).toBe('W'); expect(turn('W', true)).toBe('N');
  });

  it('a wrong program does not reach the star; bumping stops when the level says so', () => {
    const lv = LEVELS[2]; // Eskalye, stopOnBump
    const r = run(lv.maze, [{ type: 'avanse' }, { type: 'avanse' }, { type: 'avanse' }], { stopOnBump: true });
    expect(r.ok).toBe(false); expect(r.reason).toBe('bumped');
    expect(scoreRun(r, lv)).toBe(0);
    const r2 = run(LEVELS[0].maze, [{ type: 'avanse' }], {});
    expect(r2.reason).toBe('no_star');
  });

  it('loops cannot run forever', () => {
    const forever: Block[] = [{ type: 'jiska_zetwal', body: [{ type: 'vire_dwat' }] }];
    const r = run(LEVELS[7].maze, forever, {});
    expect(r.ok).toBe(false);
    expect(r.steps.length).toBeLessThanOrEqual(200);
  });

  it('gems are collected and scored; par bonus only when short enough', () => {
    const lv = LEVELS[4]; // Kare a, 2 gems
    const r = run(lv.maze, SOLUTIONS[5], { stopOnBump: true });
    expect(r.gems).toBe(2);
    expect(scoreRun(r, lv)).toBe(10 + 5 + 4);
    const long: Block[] = [...SOLUTIONS[5], { type: 'vire_dwat' }, { type: 'vire_dwat' }];
    const r2 = run(lv.maze, long, { stopOnBump: true });
    expect(r2.ok).toBe(true); expect(scoreRun(r2, lv)).toBe(10 + 4); // over par, star reached mid-program
  });

  it('validateProgram enforces the palette and loop bounds', () => {
    expect(validateProgram(LEVELS[0], [{ type: 'repete', times: 3, body: [{ type: 'avanse' }] }])).toHaveLength(1);
    expect(validateProgram(LEVELS[3], [{ type: 'repete', times: 999, body: [{ type: 'avanse' }] }])).toHaveLength(1);
    expect(countBlocks(SOLUTIONS[7])).toBe(4);
  });

  it('produces an animation trace the UI can replay', () => {
    const r = run(LEVELS[1].maze, SOLUTIONS[2], {});
    expect(r.steps.map((s) => s.kind)).toEqual(['move', 'move', 'turn', 'move', 'move', 'star']);
    expect(LEVELS.length).toBe(12);
    expect(r.robot).toEqual({ r: 2, c: 2, dir: 'E' });
  });
});

describe('debug puzzles', () => {
  it('each buggy program fails and its fix solves the level', () => {
    for (const d of DEBUG_PUZZLES) {
      const lv = LEVELS.find((l) => l.id === d.levelId)!;
      expect(run(lv.maze, d.program, { stopOnBump: lv.stopOnBump }).ok).toBe(false);
      expect(run(lv.maze, applyFix(d), { stopOnBump: lv.stopOnBump }).ok).toBe(true);
    }
  });
});

describe('Enfòmatik questions', () => {
  it('authored basics validate; generated ones are correct', () => {
    expect(validatePack(BASICS_QUESTIONS)).toEqual([]);
    const qs = generateSet('enf', '12-14', 60, 3);
    expect(validatePack(qs)).toEqual([]);
    for (const q of qs) {
      const m = /x = (\d+)\nrepete (\d+) fwa:/.exec(q.prompt.ht);
      if (m) expect(Number(q.options[q.answer].ht)).toBe(+m[1] + 2 * +m[2]);
      const s = /lòd, pi piti an premye: (.+)$/.exec(q.prompt.ht);
      if (s) expect(q.options[q.answer].ht).toBe(s[1].split(', ').map(Number).sort((a, b) => a - b).join(', '));
    }
  });
});
