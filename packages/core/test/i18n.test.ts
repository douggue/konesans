import { describe, it, expect } from 'vitest';
import {
  WORLD, MODULES, generateSet, generateCountryQuiz, makeProblem, kindsFor, KIND_LABEL, SAMPLE_QUESTIONS, BASICS_QUESTIONS, BADGES, LEVELS,
  CONCEPTS, SENTENCES, UNITS, COURSES, buildLesson, type AgeBand, type Question, type CountryMode, type CountryLevel,
} from '../src/index.js';

const AGES: AgeBand[] = ['6-8', '9-11', '12-14'];
const bilingual = (q: Question, where: string) => {
  expect(q.prompt.fr?.trim(), `${where} ${q.id} prompt.fr`).toBeTruthy();
  for (const o of q.options) expect(o.fr?.trim(), `${where} ${q.id} option ${o.ht}`).toBeTruthy();
  if (q.explain) expect(q.explain.fr?.trim(), `${where} ${q.id} explain.fr`).toBeTruthy();
};
/** French text must not leak Kreyòl question words. */
const KREYOL = /\b(Ki|Konbyen|Kisa|kapital|peyi|nan|fè)\b/;

describe('everything the kid sees exists in French too', () => {
  it('world table: French names and capitals for every country, names unique', () => {
    for (const c of WORLD) {
      expect(c.nameFr, c.iso).toBeTruthy();
      expect(c.capitalFr, c.iso).toBeTruthy();
      expect(c.currencyFr, c.iso).toBeTruthy();
      expect(c.langsFr[0], c.iso).toBeTruthy();
    }
    expect(new Set(WORLD.map((c) => c.nameFr)).size).toBe(WORLD.length);
  });

  it('every generated module', () => {
    for (const m of MODULES) for (const age of m.ages) for (const q of generateSet(m.id, age, 12, 99)) {
      bilingual(q, m.id);
      expect(q.prompt.fr, `${m.id} ${q.prompt.fr}`).not.toMatch(KREYOL);
    }
  });

  it('Peyi game: all modes, levels and regions', () => {
    const modes: CountryMode[] = ['drapo', 'kapital', 'fom']; const levels: CountryLevel[] = [1, 2, 3];
    for (const mode of modes) for (const level of levels) for (const region of ['mond', 'Karayib', 'Afrik', 'Oseyani'] as const) {
      for (const q of generateCountryQuiz({ mode, level, region }, '12-14', 10, 11)) {
        bilingual(q, `peyi ${mode}/${level}/${region}`);
        expect(q.prompt.fr).not.toMatch(KREYOL);
        // French options are French names, not the Kreyòl ones (except where both are the same word)
        const c = WORLD.find((x) => x.iso === q.id.split(':')[2])!;
        if (q.options.some((o) => o.ht === c.name)) expect(q.options.map((o) => o.fr)).toContain(c.nameFr);
      }
    }
  });

  it('Kalkil Mantal: every kind has French text, ask and label', () => {
    let seed = 1;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (const age of AGES) for (const kind of kindsFor(age)) for (let i = 0; i < 30; i++) {
      const p = makeProblem(age, rand, kind);
      expect(p.textFr, kind).toBeTruthy();
      expect(p.textFr, `${kind}: ${p.textFr}`).not.toMatch(/\b(nan|ak|minit|segonn|jou)\b/);
      if (p.ask !== undefined) expect(p.askFr, kind).toBeDefined();
      expect(KIND_LABEL[kind].fr).toBeTruthy();
    }
  });

  it('authored sample + informatics questions, trophies, coding levels', () => {
    for (const q of [...SAMPLE_QUESTIONS, ...BASICS_QUESTIONS]) bilingual(q, 'authored');
    for (const b of BADGES) { expect(b.nameFr).toBeTruthy(); expect(b.howFr).toBeTruthy(); }
    for (const l of LEVELS) { expect(l.titleFr, String(l.id)).toBeTruthy(); expect(l.hintFr, String(l.id)).toBeTruthy(); }
  });

  it('courses: French glosses for every word, sentence and title, and in the exercises', () => {
    for (const c of CONCEPTS) expect(c.fr, c.id).not.toBe('');
    for (const s of SENTENCES) expect(s.fr, s.id).not.toBe(s.ht);
    for (const u of UNITS) { expect(u.titleFr, u.id).toBeTruthy(); for (const l of u.lessons) expect(l.titleFr, l.id).toBeTruthy(); }
    for (const course of COURSES) {
      expect(course.tagline.fr).toBeTruthy();
      for (const ex of UNITS.flatMap((u) => u.lessons).flatMap((l) => buildLesson(course.id, l.id, '9-11'))) {
        const texts: unknown[] = [];
        // every Kreyòl text shown in an exercise has its French twin
        const walk = (v: unknown) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { const o = v as Record<string, unknown>; if (typeof o.ht === 'string') texts.push(o.fr); Object.values(o).forEach(walk); } };
        walk(ex);
        for (const t of texts) expect(t).toBeTruthy();
      }
    }
  });
});
