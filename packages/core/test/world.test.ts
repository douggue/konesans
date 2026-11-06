import { describe, it, expect } from 'vitest';
import { WORLD, REGIONS, SHAPES, hasShape, countryPool, generateCountryQuiz, flagEmoji, REGION_LABEL, type CountryMode, type CountryLevel } from '../src/index.js';

const MODES: CountryMode[] = ['drapo', 'kapital', 'fom'];
const LEVELS: CountryLevel[] = [1, 2, 3];

describe('world table', () => {
  it('has every UN member (193) plus 4 extras, unique codes and names, every region used', () => {
    expect(WORLD.length).toBe(197);
    expect(new Set(WORLD.map((c) => c.iso)).size).toBe(197);
    expect(new Set(WORLD.map((c) => c.name)).size).toBe(197);
    for (const c of WORLD) { expect(c.iso).toMatch(/^[A-Z]{2}$/); expect(c.name.trim().length).toBeGreaterThan(1); expect(c.capital.trim().length).toBeGreaterThan(1); expect(REGIONS).toContain(c.continent); expect([1, 2, 3]).toContain(c.tier); expect(c.areaKm2).toBeGreaterThan(0); }
    for (const r of REGIONS) expect(WORLD.filter((c) => c.continent === r).length).toBeGreaterThanOrEqual(10);
    expect(WORLD.filter((c) => c.tier === 1).length).toBeGreaterThanOrEqual(30);
  });

  it('shapes exist for most countries and only for known codes', () => {
    const isos = new Set(WORLD.map((c) => c.iso));
    for (const k of Object.keys(SHAPES)) { expect(isos.has(k), k).toBe(true); expect(SHAPES[k]).toMatch(/^M/); }
    expect(Object.keys(SHAPES).length).toBeGreaterThanOrEqual(175);
    expect(hasShape('HT')).toBe(true); expect(hasShape('CL')).toBe(true); expect(hasShape('VA')).toBe(false);
    for (const r of REGIONS) expect(WORLD.filter((c) => c.continent === r && hasShape(c.iso)).length).toBeGreaterThanOrEqual(4);
  });

  it('flag emoji is two regional indicators', () => { expect([...flagEmoji('HT')].length).toBe(2); });
});

describe('Peyi quiz options', () => {
  it('generates valid sets for every mode × level × region', () => {
    for (const mode of MODES) for (const level of LEVELS) for (const region of ['mond', ...REGIONS] as const) {
      const pool = countryPool({ mode, level, region });
      expect(pool.length, `${mode}/${level}/${region}`).toBeGreaterThanOrEqual(4);
      if (region !== 'mond') for (const c of pool) expect(c.continent).toBe(region);
      if (mode === 'fom') for (const c of pool) expect(hasShape(c.iso)).toBe(true);
      const qs = generateCountryQuiz({ mode, level, region }, '9-11', 8, 42);
      expect(qs.length, `${mode}/${level}/${region}`).toBeGreaterThanOrEqual(Math.min(8, pool.length));
      for (const q of qs) {
        expect(q.category).toBe('peyi');
        expect(new Set(q.options.map((o) => o.ht)).size).toBe(q.options.length);
        expect(q.options.length).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        if (mode === 'fom') expect(q.media?.kind).toBe('shape');
        if (mode === 'drapo' && q.media) expect(q.media.kind).toBe('flag');
      }
      // level 1 draws only famous countries
      if (level === 1 && region === 'mond') for (const c of pool) expect(c.tier).toBe(1);
    }
  });

  it('is deterministic per seed and gets harder with level', () => {
    const a = generateCountryQuiz({ mode: 'kapital', level: 3, region: 'mond' }, '12-14', 10, 7);
    const b = generateCountryQuiz({ mode: 'kapital', level: 3, region: 'mond' }, '12-14', 10, 7);
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    const easy = countryPool({ mode: 'kapital', level: 1, region: 'mond' }).length;
    const hard = countryPool({ mode: 'kapital', level: 3, region: 'mond' }).length;
    expect(hard).toBeGreaterThan(easy * 3);
    expect(Object.keys(REGION_LABEL).length).toBe(8);
  });
});
