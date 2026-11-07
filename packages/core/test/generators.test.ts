import { describe, it, expect } from 'vitest';
import {
  MODULES, generateSet, generateCountryQuiz, COUNTRIES, LOOKALIKE_FLAGS, flagsLookAlike, languagesOf, currencyClash, REGION_LABEL,
  type AgeBand, type Question,
} from '../src/index.js';

/** Every generated question of every module, many seeds: exactly one defensible answer, both languages consistent. */
const all: { mod: string; age: AgeBand; q: Question }[] = [];
for (const m of MODULES) for (const age of m.ages) for (const seed of [1, 2, 3, 4, 5, 6]) for (const q of generateSet(m.id, age, 60, seed)) all.push({ mod: m.id, age, q });
const byName = (ht: string) => COUNTRIES.find((c) => c.name === ht);

describe('generated questions (audit)', () => {
  it('have a French prompt and distinct options in both languages', () => {
    for (const { mod, q } of all) {
      expect(q.prompt.fr, mod).toBeTruthy();
      const fr = q.options.map((o) => o.fr ?? o.ht);
      expect(new Set(fr).size, `${mod}: ${q.prompt.ht} ${fr}`).toBe(fr.length);
      expect(q.options.length, `${mod}: ${q.prompt.ht}`).toBeGreaterThanOrEqual(2);
      expect(`${q.prompt.ht} ${q.prompt.fr} ${q.explain?.ht ?? ''} ${q.options.map((o) => o.ht).join(' ')}`).not.toMatch(/undefined|NaN/);
    }
  });

  it('region question: same question in Kreyòl and French, never Karayib next to an Amerik', () => {
    const qs = all.filter((x) => x.mod === 'kontinan').map((x) => x.q);
    expect(qs.length).toBeGreaterThan(50);
    for (const q of qs) {
      expect(q.prompt.ht).toMatch(/^Nan ki rejyon nan mond lan .+ ye\?$/);
      expect(q.prompt.fr).toMatch(/^Dans quelle région du monde se trouve .+ \?$/);
      const opts = q.options.map((o) => o.ht);
      const right = q.options[q.answer].ht;
      if (right === 'Karayib') { expect(opts).not.toContain('Amerik di Nò'); expect(opts).not.toContain('Amerik di Sid'); }
      if (right.startsWith('Amerik')) expect(opts).not.toContain('Karayib');
      const name = /lan (.+) ye\?$/.exec(q.prompt.ht)![1];
      expect(q.options[q.answer].ht).toBe(byName(name)!.continent);
      expect(q.options[q.answer].fr).toBe(REGION_LABEL[byName(name)!.continent].fr);
    }
    // the case from the QA report
    const cuba = qs.find((q) => q.prompt.ht.includes('Kiba'));
    if (cuba) expect(cuba.options.map((o) => o.ht)).not.toContain('Amerik di Nò');
  });

  it('language question never offers another language the country speaks (Ayiti: no Franse)', () => {
    for (const { q } of all.filter((x) => x.mod === 'lang-peyi')) {
      const c = byName(/nan (.+)\?$/.exec(q.prompt.ht)![1])!;
      const wrong = q.options.filter((_, i) => i !== q.answer).map((o) => o.ht);
      for (const w of wrong) expect(languagesOf(c), `${c.name}: ${w}`).not.toContain(w);
    }
    expect(languagesOf(COUNTRIES.find((c) => c.iso === 'HT')!)).toContain('Franse');
  });

  it('currency question: no "Dola" next to "Dola ameriken", no money that is also legal there', () => {
    for (const { q } of all.filter((x) => x.mod === 'lajan-peyi')) {
      const c = byName(/nan (.+)\?$/.exec(q.prompt.ht)![1])!;
      expect(q.options[q.answer].ht).toBe(c.currency);
      for (const [i, o] of q.options.entries()) if (i !== q.answer) expect(currencyClash(c, o.ht), `${c.name}: ${o.ht}`).toBe(false);
    }
    expect(currencyClash(COUNTRIES.find((c) => c.iso === 'PA')!, 'Dola ameriken')).toBe(true);
    expect(currencyClash(COUNTRIES.find((c) => c.iso === 'BB')!, 'Dola Karayib lès')).toBe(true);
  });

  it('flag questions never show two near-identical flags (Chad/Romania, Colombia/Ecuador…)', () => {
    const check = (isos: string[]) => { for (const a of isos) for (const b of isos) expect(flagsLookAlike(a, b), `${a}/${b}`).toBe(false); };
    for (const { q } of all.filter((x) => x.mod === 'drapo')) check(q.options.map((o) => byName(o.ht)!.iso));
    for (const level of [1, 2, 3] as const) for (const region of ['mond', 'Amerik di Sid', 'Afrik', 'Ewòp'] as const) for (const seed of [1, 2, 3]) {
      for (const q of generateCountryQuiz({ mode: 'drapo', level, region }, '12-14', 20, seed)) {
        const isos = q.media?.kind === 'flag' ? q.options.map((o) => byName(o.ht)!.iso)
          : q.options.map((o) => COUNTRIES.find((c) => [...c.iso.toUpperCase()].map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join('') === o.ht)!.iso);
        check(isos);
      }
    }
    expect(LOOKALIKE_FLAGS.flat().length).toBeGreaterThan(20);
  });

  it('times tables: nothing trivial from 9 years old', () => {
    for (const { age, q } of all.filter((x) => x.mod === 'tab')) {
      const m = /Konbyen (\d+) × (\d+) fè\?/.exec(q.prompt.ht);
      if (!m) continue;
      expect(Number(m[1]) * Number(m[2]), q.prompt.ht).toBeGreaterThanOrEqual(age === '9-11' ? 9 : 12);
      expect(q.options[q.answer].ht).toBe(String(Number(m[1]) * Number(m[2])));
    }
  });

  it('clock options are real times (1:00…12:45, never 0:30)', () => {
    for (const { q } of all.filter((x) => x.mod === 'le')) for (const o of q.options) expect(o.ht).toMatch(/^(1[0-2]|[1-9]):[0-5]\d$/);
  });

  it('number words always have 4 options, also for 100 ("san")', () => {
    for (const { q } of all.filter((x) => x.mod === 'nonb')) expect(q.options.length).toBe(4);
  });

  it('sequence explanation says "retire" for a decreasing step', () => {
    for (const { q } of all.filter((x) => x.mod === 'sekans')) {
      expect(q.explain?.ht ?? '').not.toMatch(/ajoute -/);
      expect(q.explain?.fr ?? '').not.toMatch(/ajoute -/);
    }
  });
});

describe('question pictures', () => {
  it('every media a generator, the Peyi quiz or the built-in questions emit has a renderer (parseMedia)', async () => {
    const { parseMedia, SAMPLE_QUESTIONS, BANK, REGIONS } = await import('../src/index.js');
    const seen = new Map<string, number>();
    const check = (where: string, q: Question) => {
      if (!q.media) return;
      const spec = parseMedia(q.media);
      expect(spec, `${where}: ${q.media.kind} ${q.media.ref}`).not.toBeNull();
      seen.set(spec!.type, (seen.get(spec!.type) ?? 0) + 1);
    };
    for (const { mod, q } of all) check(mod, q);
    for (const mode of ['drapo', 'kapital', 'fom'] as const) for (const level of [1, 2, 3] as const) for (const region of ['mond', ...REGIONS] as const)
      for (const q of generateCountryQuiz({ mode, level, region }, '9-11', 20, level * 7 + mode.length)) check(`peyi ${mode}`, q);
    for (const q of [...SAMPLE_QUESTIONS, ...BANK]) check(q.id, q);
    // the picture questions really are generated (so the renderer is exercised by the audit above)
    for (const t of ['flag', 'shape', 'shapes', 'fraction', 'clock', 'money', 'polygon']) expect(seen.get(t), t).toBeGreaterThan(0);
  });

  it('parses fraction and clock pictures', async () => {
    const { parseMedia } = await import('../src/index.js');
    expect(parseMedia({ kind: 'image', ref: 'fraction:3/8' })).toEqual({ type: 'fraction', n: 3, d: 8 });
    expect(parseMedia({ kind: 'image', ref: 'clock:12:45' })).toEqual({ type: 'clock', h: 12, m: 45 });
    expect(parseMedia({ kind: 'image', ref: 'nope:1' })).toBeNull();
  });
});
