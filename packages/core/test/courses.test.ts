import { describe, it, expect } from 'vitest';
import {
  CONCEPTS, SENTENCES, UNITS, COURSES, conceptById, sentenceById,
  buildLesson, gradeExercise, startLesson, answerLesson, finishLesson, currentExercise,
  emptyCourseProgress, recordLesson, coursePath, nextLesson, courseSummary, normalize, tokenize,
  type Exercise, type CourseId,
} from '../src/index.js';
import type { AgeBand } from '../src/types.js';

const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const AGES: AgeBand[] = ['6-8', '9-11', '12-14'];
const LANGS: CourseId[] = ['en', 'es'];
const allLessons = UNITS.flatMap(u => u.lessons);

describe('course content', () => {
  it('has unique concept and sentence ids, and every lesson reference resolves', () => {
    expect(new Set(CONCEPTS.map(c => c.id)).size).toBe(CONCEPTS.length);
    expect(new Set(SENTENCES.map(s => s.id)).size).toBe(SENTENCES.length);
    expect(new Set(allLessons.map(l => l.id)).size).toBe(allLessons.length);
    for (const l of allLessons) {
      for (const c of l.concepts) expect(conceptById[c], `${l.id} → concept ${c}`).toBeDefined();
      for (const s of l.sentences) expect(sentenceById[s], `${l.id} → sentence ${s}`).toBeDefined();
      expect(l.concepts.length).toBeGreaterThanOrEqual(4);
      expect(l.sentences.length).toBeGreaterThanOrEqual(1);
    }
    for (const s of SENTENCES) for (const u of s.uses) expect(conceptById[u], `${s.id} uses ${u}`).toBeDefined();
  });

  it('every concept has all three languages filled and is placed in some lesson', () => {
    const placed = new Set(allLessons.flatMap(l => l.concepts));
    for (const c of CONCEPTS) {
      expect(c.ht.trim() && c.en.trim() && c.es.trim(), c.id).toBeTruthy();
      expect(placed.has(c.id), `concept ${c.id} not in any lesson`).toBe(true);
    }
    const usedS = new Set(allLessons.flatMap(l => l.sentences));
    for (const s of SENTENCES) expect(usedS.has(s.id), `sentence ${s.id} not in any lesson`).toBe(true);
  });

  it('both courses exist with the same units', () => {
    expect(COURSES.map(c => c.id)).toEqual(['en', 'es']);
    expect(COURSES[0].units.length).toBe(11);
    expect(CONCEPTS.length).toBeGreaterThan(150);
    expect(SENTENCES.length).toBeGreaterThan(60);
  });
});

function checkExercise(ex: Exercise) {
  switch (ex.kind) {
    case 'pick_meaning': case 'pick_word': case 'listen_pick': case 'translate_pick': {
      const opts = ex.options.map(o => normalize('ht' in o ? o.ht : o.target));
      expect(new Set(opts).size, `${ex.id} duplicate options ${opts}`).toBe(opts.length);
      expect(ex.answer).toBeGreaterThanOrEqual(0); expect(ex.answer).toBeLessThan(opts.length);
      expect(opts.length).toBeGreaterThanOrEqual(3);
      break;
    }
    case 'match_pairs': {
      expect(ex.left.length).toBe(ex.right.length);
      expect(new Set(ex.pairs).size).toBe(ex.pairs.length);
      break;
    }
    case 'build_sentence': {
      expect(new Set(ex.answer).size).toBe(ex.answer.length);
      for (const i of ex.answer) expect(ex.tiles[i]).toBeDefined();
      expect(ex.tiles.length).toBeGreaterThan(ex.answer.length);
      break;
    }
    case 'fill_blank': {
      expect(ex.text.includes('____'), `${ex.id} no blank in "${ex.text}"`).toBe(true);
      expect(new Set(ex.options.map(normalize)).size).toBe(ex.options.length);
      expect(ex.options.length).toBe(4);
      break;
    }
  }
}

describe('lesson generation', () => {
  it('produces well-formed exercises for every lesson, language and age (3 seeds each)', () => {
    let n = 0;
    for (const lang of LANGS) for (const age of AGES) for (const l of allLessons) for (const seed of [1, 7, 42]) {
      const exs = buildLesson(lang, l.id, age, { rand: rng(seed * 1000 + n) });
      expect(exs.length).toBeGreaterThanOrEqual(10);
      exs.forEach(checkExercise);
      // every concept of the lesson is drilled
      const refs = new Set(exs.flatMap(e => e.kind === 'match_pairs' ? e.refs : [e.ref]));
      for (const c of l.concepts) expect(refs.has(c), `${lang}/${age}/${l.id}: ${c} never drilled`).toBe(true);
      expect(exs.length).toBeLessThanOrEqual(14);
      n++;
    }
  });

  it('6–8 never gets fill_blank and only short build_sentence', () => {
    for (const l of allLessons) {
      const exs = buildLesson('en', l.id, '6-8', { rand: rng(3) });
      expect(exs.some(e => e.kind === 'fill_blank')).toBe(false);
      for (const e of exs) if (e.kind === 'build_sentence') expect(e.answer.length).toBeLessThanOrEqual(4);
    }
  });

  it('12–14 gets several sentence builders with 3 distractor tiles', () => {
    const exs = buildLesson('es', 'u6l1', '12-14', { rand: rng(9) });
    const bs = exs.filter(e => e.kind === 'build_sentence');
    expect(bs.length).toBe(3);
    for (const e of bs) if (e.kind === 'build_sentence') expect(e.tiles.length - e.answer.length).toBe(3);
  });

  it('build_sentence tiles rebuild the exact target sentence', () => {
    for (const lang of LANGS) for (const l of allLessons) {
      for (const e of buildLesson(lang, l.id, '12-14', { rand: rng(5) })) if (e.kind === 'build_sentence') {
        const s = sentenceById[e.ref];
        expect(e.answer.map(i => e.tiles[i])).toEqual(tokenize(s[lang]));
      }
    }
  });
});

describe('grading', () => {
  it('grades every kind, order-sensitive for sentences, accent-insensitive on tiles', () => {
    const exs = buildLesson('es', 'u1l1', '12-14', { rand: rng(11) });
    for (const e of exs) {
      switch (e.kind) {
        case 'match_pairs': expect(gradeExercise(e, e.pairs).correct).toBe(true); expect(gradeExercise(e, e.pairs.slice().reverse()).correct).toBe(e.pairs.slice().reverse().every((p, i) => p === e.pairs[i])); break;
        case 'build_sentence': expect(gradeExercise(e, e.answer).correct).toBe(true); expect(gradeExercise(e, e.answer.slice().reverse()).correct).toBe(e.answer.length === 1); expect(gradeExercise(e, []).correct).toBe(false); break;
        default: expect(gradeExercise(e, e.answer).correct).toBe(true); expect(gradeExercise(e, (e.answer + 1) % e.options.length).correct).toBe(false);
      }
    }
    expect(normalize('¿Cómo estás?')).toBe('como estas');
  });
});

describe('lesson session', () => {
  const right = (e: Exercise) => (e.kind === 'match_pairs' ? e.pairs : e.kind === 'build_sentence' ? e.answer : e.answer);
  const wrong = (e: Exercise) => (e.kind === 'match_pairs' ? e.pairs.slice().reverse().map((_, i) => (e.pairs[i] + 1) % e.pairs.length) : e.kind === 'build_sentence' ? [] : (e.answer + 1) % e.options.length);

  it('perfect run: 3 stars, bonus xp, no requeue', () => {
    let s = startLesson('en', 'u2l1', '9-11', { rand: rng(2) }, 0);
    const n = s.queue.length;
    let done = false;
    while (!done) ({ session: s, done } = answerLesson(s, right(currentExercise(s)!)));
    expect(s.queue.length).toBe(n);
    const r = finishLesson(s, 90_000);
    expect(r.perfect).toBe(true); expect(r.stars).toBe(3); expect(r.xp).toBe(10 + n * 2 + 10); expect(r.durationSec).toBe(90);
  });

  it('a mistake is re-asked once at the end and counts against first-try score only once', () => {
    let s = startLesson('es', 'u3l1', '6-8', { rand: rng(4) });
    const n = s.queue.length;
    const first = currentExercise(s)!;
    let res = answerLesson(s, wrong(first)); s = res.session;
    expect(res.grade.correct).toBe(false);
    expect(s.queue.length).toBe(n + 1);
    expect(s.queue[s.queue.length - 1].id).toBe(first.id);
    let done = res.done;
    while (!done) {
      const e = currentExercise(s)!;
      // get the requeued one wrong again: it must NOT be requeued a second time
      ({ session: s, done } = answerLesson(s, e.id === first.id ? wrong(e) : right(e)));
    }
    expect(s.queue.length).toBe(n + 1);
    const r = finishLesson(s);
    expect(r.total).toBe(n); expect(r.firstTryCorrect).toBe(n - 1); expect(r.perfect).toBe(false);
    expect(r.stars).toBe(n - 1 >= 0.9 * n ? 3 : 2);
  });
});

describe('course path', () => {
  it('unlocks linearly and summarises words learned', () => {
    let p = emptyCourseProgress();
    let path = coursePath('en', p);
    expect(path[0].lessons[0].state).toBe('open');
    expect(path[0].lessons[1].state).toBe('locked');
    expect(path[1].lessons[0].state).toBe('locked');
    expect(nextLesson('en', p)?.id).toBe('u1l1');
    let s = startLesson('en', 'u1l1', '9-11', { rand: rng(1) });
    let done = false;
    while (!done) ({ session: s, done } = answerLesson(s, currentExercise(s)!.kind === 'match_pairs' ? (currentExercise(s) as any).pairs : (currentExercise(s) as any).answer));
    p = recordLesson(p, 'u1l1', finishLesson(s));
    path = coursePath('en', p);
    expect(path[0].lessons[0].state).toBe('done'); expect(path[0].lessons[0].stars).toBe(3);
    expect(path[0].lessons[1].state).toBe('open');
    expect(nextLesson('en', p)?.id).toBe('u1l2');
    const sum = courseSummary('en', p);
    expect(sum.lessonsDone).toBe(1); expect(sum.wordsLearned).toBe(6); expect(sum.crowns).toBe(1);
    // replaying keeps the best stars
    p = recordLesson(p, 'u1l1', { ...finishLesson(s), stars: 1, score: 0.3 });
    expect(p.lessons.u1l1.stars).toBe(3); expect(p.lessons.u1l1.times).toBe(2);
  });
});
