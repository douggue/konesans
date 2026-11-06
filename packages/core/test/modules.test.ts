import { describe, it, expect } from 'vitest';
import { MODULES, generateSet, generateMixed, modulesForAge, validatePack, kreyolNumber, COUNTRIES, rng, type AgeBand } from '../src/index.js';

const AGES: AgeBand[] = ['6-8', '9-11', '12-14'];

describe('generated modules', () => {
  it('registry has the expected modules', () => {
    expect(new Set(MODULES.map((m) => m.id))).toEqual(new Set([
      'bine', 'drapo', 'enf', 'fom', 'frak', 'jeo', 'kapital', 'kontinan', 'konpare', 'konv', 'lajan', 'lajan-peyi', 'lang-peyi', 'le', 'nonb', 'pi-gwo', 'sekans', 'tab',
    ]));
    expect(modulesForAge('6-8').length).toBeGreaterThanOrEqual(8);
  });

  for (const mod of MODULES) {
    for (const age of mod.ages) {
      it(`${mod.id} @ ${age}: 150 valid questions, answer always present, options unique`, () => {
        const qs = generateSet(mod.id, age, 150, 7);
        expect(qs.length).toBeGreaterThanOrEqual(6); // tiny pools (6 shapes, 2 clock times) are fine
        expect(validatePack(qs)).toEqual([]);
        for (const q of qs) {
          const opts = q.options.map((o) => o.ht);
          expect(new Set(opts).size).toBe(opts.length);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(opts.length);
          expect(q.ages).toEqual([age]);
          expect(q.status).toBe('approved');
        }
      });
    }
  }

  it('is deterministic for a seed', () => {
    const a = generateSet('tab', '9-11', 10, 99), b = generateSet('tab', '9-11', 10, 99);
    expect(a.map((q) => q.prompt.ht)).toEqual(b.map((q) => q.prompt.ht));
    expect(a.map((q) => q.answer)).toEqual(b.map((q) => q.answer));
  });

  it('math answers are actually correct', () => {
    const rand = rng(3);
    for (const q of generateSet('tab', '9-11', 50, 5)) {
      const m = /Konbyen (\d+) × (\d+) fè\?/.exec(q.prompt.ht);
      if (m) expect(Number(q.options[q.answer].ht)).toBe(Number(m[1]) * Number(m[2]));
    }
    for (const q of generateSet('lajan', '12-14', 50, 5)) {
      const m = /koute (\d+) G\. Ou bay (\d+) G/.exec(q.prompt.ht);
      if (m) expect(q.options[q.answer].ht).toBe(`${Number(m[2]) - Number(m[1])} G`);
    }
    for (const q of generateSet('jeo', '12-14', 50, 5)) {
      const m = /rektang (\d+) cm sou (\d+) cm\. Ki (perimèt|sipèfisi)/.exec(q.prompt.ht);
      if (m) expect(q.options[q.answer].ht).toBe(m[3] === 'perimèt' ? `${2 * (+m[1] + +m[2])} cm` : `${+m[1] * +m[2]} cm²`);
    }
    for (const q of generateSet('bine', '12-14', 40, 5)) {
      const m = /^(\d+) an binè = ki nonb\?/.exec(q.prompt.ht);
      if (m) expect(Number(q.options[q.answer].ht)).toBe(parseInt(m[1], 2));
    }
    expect(rand()).toBeLessThan(1);
  });

  it('country facts are consistent with the table', () => {
    for (const q of generateSet('kapital', '12-14', 80, 1)) {
      const m = /Ki kapital (.+)\?/.exec(q.prompt.ht);
      if (m) expect(q.options[q.answer].ht).toBe(COUNTRIES.find((c) => c.name === m[1])!.capital);
    }
    for (const q of generateSet('pi-gwo', '12-14', 60, 1)) {
      const m = /pi gwo: (.+) oswa (.+)\?/.exec(q.prompt.ht)!;
      const a = COUNTRIES.find((c) => c.name === m[1])!, b = COUNTRIES.find((c) => c.name === m[2])!;
      expect(q.options[q.answer].ht).toBe(a.areaKm2 > b.areaKm2 ? a.name : b.name);
    }
    // 6-8 only sees Caribbean + North America
    for (const q of generateSet('fom', '6-8', 60, 2)) {
      const c = COUNTRIES.find((x) => x.iso === q.media!.ref)!;
      expect(['Karayib', 'Amerik di Nò']).toContain(c.continent);
    }
  });

  it('Kreyòl number words follow the pattern', () => {
    expect(kreyolNumber(0)).toBe('zewo'); expect(kreyolNumber(15)).toBe('kenz');
    expect(kreyolNumber(21)).toBe('venteyen'); expect(kreyolNumber(22)).toBe('vennde');
    expect(kreyolNumber(1)).toBe('youn'); expect(kreyolNumber(28)).toBe('ventuit'); expect(kreyolNumber(35)).toBe('trannsenk'); expect(kreyolNumber(39)).toBe('trantnèf'); expect(kreyolNumber(41)).toBe('karanteyen'); expect(kreyolNumber(48)).toBe('karantuit');
    expect(kreyolNumber(70)).toBe('swasanndis'); expect(kreyolNumber(71)).toBe('swasannonz');
    expect(kreyolNumber(78)).toBe('swasanndizuit'); expect(kreyolNumber(80)).toBe('katreven'); expect(kreyolNumber(88)).toBe('katrevenuit'); expect(kreyolNumber(95)).toBe('katrevenkenz');
    expect(kreyolNumber(100)).toBe('san');
  });

  it('mixed sets interleave modules and respect age', () => {
    const qs = generateMixed(['tab', 'frak', 'bine', 'konpare'], '9-11', 8, 4);
    expect(qs.length).toBe(8);
    expect(qs.every((q) => q.ages[0] === '9-11')).toBe(true);
    expect(new Set(qs.map((q) => q.id.split(':')[0]))).toEqual(new Set(['tab', 'frak'])); // bine/konpare not for 9-11
  });
});
