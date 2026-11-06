import { describe, it, expect } from 'vitest';
import {
  DEPARTMENTS, DEPARTMENT_ORDER, EVENT_QUESTIONS, VWAYAJ_EVENTS, emptyVwayaj, isUnlocked, departmentStatus, currentDepartment,
  departmentsDone, pickDepartmentRun, recordRun, eventOn, nextEvent, pointsMultiplier, runStars, checkBadges, emptyProgress,
  type AgeBand, type Question, type VwayajProgress,
} from '../src/index.js';

const AGES: AgeBand[] = ['6-8', '9-11', '12-14'];

function validQuestion(q: Question) {
  expect(q.prompt.ht.trim().endsWith('?'), q.id).toBe(true);
  expect(q.prompt.fr && / \?$/.test(q.prompt.fr.trim()), `${q.id} fr prompt`).toBe(true);
  expect(q.options.length >= 3 && q.options.length <= 4, `${q.id} options`).toBe(true);
  for (const o of q.options) { expect(o.ht.trim(), q.id).not.toBe(''); expect(o.fr?.trim(), q.id).toBeTruthy(); }
  expect(new Set(q.options.map((o) => o.ht.toLowerCase())).size, `${q.id} duplicate options`).toBe(q.options.length);
  expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${q.id} answer in range`).toBe(true);
  expect(q.explain?.ht && q.explain.fr, `${q.id} explanation`).toBeTruthy();
  expect([1, 2, 3]).toContain(q.difficulty);
  expect(q.ages.length).toBeGreaterThan(0);
  for (const a of q.ages) expect(AGES).toContain(a);
  // Kreyòl orthography: no c (outside ch), q, x; no apostrophe short forms
  const ht = [q.prompt.ht, q.explain!.ht, ...q.options.map((o) => o.ht)].join(' ').replace(/\b(UNESCO|FIFA|NASA|Santa Maria|La Navidad|Mayflower|Santo Domingo|Santiago|Les Cayes|Cap-Haïtien)\b/g, '');
  expect(ht.match(/\b[a-zàèòù]*(?:c(?!h)|q|x)[a-zàèòù]*\b/gi), `${q.id} non-Kreyòl letters`).toBeNull();
  expect(/\b(m|l|n|w|y|t)'/i.test(ht), `${q.id} apostrophe short form`).toBe(false);
}

describe('department pack', () => {
  it('has the 10 departments in the map order', () => {
    expect(DEPARTMENT_ORDER).toEqual(['lwes', 'sides', 'sid', 'grandans', 'nip', 'sant', 'latibonit', 'nodwes', 'no', 'nodes']);
    for (const d of DEPARTMENTS) {
      expect(d.name.ht && d.name.fr && d.chefLieu.ht && d.chefLieu.fr).toBeTruthy();
      expect(d.facts.length).toBeGreaterThanOrEqual(3);
      for (const f of d.facts) expect(f.ht && f.fr).toBeTruthy();
    }
  });

  it('every department has ≥ 12 valid questions with answers in range', () => {
    for (const d of DEPARTMENTS) {
      expect(d.questions.length, d.id).toBeGreaterThanOrEqual(12);
      d.questions.forEach(validQuestion);
      // every age band has some questions of its own
      for (const a of AGES) expect(d.questions.filter((q) => q.ages.includes(a)).length, `${d.id} ${a}`).toBeGreaterThanOrEqual(5);
    }
  });

  it('ids and prompts are unique across the pack', () => {
    const all = [...DEPARTMENTS.flatMap((d) => d.questions), ...Object.values(EVENT_QUESTIONS).flat()];
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
    expect(new Set(all.map((q) => q.prompt.ht.toLowerCase())).size).toBe(all.length);
  });

  it('every event has valid special questions', () => {
    for (const e of VWAYAJ_EVENTS) {
      const qs = EVENT_QUESTIONS[e.id];
      expect(qs?.length, e.id).toBeGreaterThanOrEqual(3);
      qs.forEach(validQuestion);
    }
  });

  it('answer positions are spread out', () => {
    const counts = [0, 0, 0, 0];
    for (const q of DEPARTMENTS.flatMap((d) => d.questions)) counts[q.answer]++;
    expect(Math.max(counts[0], counts[1], counts[2]) / (counts[0] + counts[1] + counts[2] + counts[3])).toBeLessThan(0.45);
  });
});

describe('unlock order', () => {
  it('starts with Lwès open and the rest locked', () => {
    const p = emptyVwayaj();
    expect(departmentStatus(p, 'lwes')).toBe('current');
    expect(departmentStatus(p, 'sides')).toBe('locked');
    expect(currentDepartment(p)).toBe('lwes');
    expect(departmentsDone(p)).toBe(0);
  });

  it('≥ 7/10 finishes a department and unlocks the next; < 7 does not', () => {
    let p = emptyVwayaj();
    const ids = Array.from({ length: 10 }, (_, i) => `x${i}`);
    let r = recordRun(p, 'lwes', 6, ids, '2026-11-06');
    expect(r.passed).toBe(false);
    expect(r.unlocked).toBeNull();
    expect(isUnlocked(r.progress, 'sides')).toBe(false);
    expect(r.progress.best.lwes).toBe(6);
    r = recordRun(r.progress, 'lwes', 7, ids, '2026-11-06');
    expect(r.passed && r.firstClear).toBe(true);
    expect(r.unlocked).toBe('sides');
    p = r.progress;
    expect(departmentStatus(p, 'lwes')).toBe('done');
    expect(departmentStatus(p, 'sides')).toBe('current');
    expect(departmentStatus(p, 'sid')).toBe('locked');
    // replaying a done department: still done, no new unlock, best kept
    r = recordRun(p, 'lwes', 3, ids, '2026-11-07');
    expect(r.firstClear).toBe(false);
    expect(r.unlocked).toBeNull();
    expect(r.progress.done.lwes).toEqual({ best: 7, day: '2026-11-06' });
  });

  it('a locked department cannot be recorded', () => {
    const p = emptyVwayaj();
    const r = recordRun(p, 'nodes', 10, [], '2026-11-06');
    expect(r.progress).toBe(p);
    expect(r.passed).toBe(false);
  });

  it('walks the whole journey in order', () => {
    let p: VwayajProgress = emptyVwayaj();
    for (const id of DEPARTMENT_ORDER) {
      expect(currentDepartment(p)).toBe(id);
      p = recordRun(p, id, 9, [], '2026-11-06').progress;
    }
    expect(currentDepartment(p)).toBeNull();
    expect(departmentsDone(p)).toBe(10);
  });

  it('3 departments done makes the vwayaj3 trophy earnable', () => {
    let p = emptyVwayaj();
    for (const id of DEPARTMENT_ORDER.slice(0, 3)) p = recordRun(p, id, 8, [], '2026-11-06').progress;
    const { awarded } = checkBadges({ p: emptyProgress(), duelWins: 0, lessonsDone: 0, wordsLearned: 0, departmentsUnlocked: departmentsDone(p), eventsPlayed: p.eventsPlayed }, '2026-11-06T12:00:00Z');
    expect(awarded).toContain('vwayaj3');
  });
});

describe('question picking', () => {
  it('gives 10 distinct questions for every department and age', () => {
    for (const d of DEPARTMENTS) for (const age of AGES) {
      const qs = pickDepartmentRun(d.id, age, 42);
      expect(qs.length, `${d.id} ${age}`).toBe(10);
      expect(new Set(qs.map((q) => q.id)).size).toBe(10);
      for (const q of qs) expect(q.answer).toBeLessThan(q.options.length);
    }
  });

  it('prefers questions of the kid’s age band', () => {
    for (const d of DEPARTMENTS) for (const age of AGES) {
      const own = d.questions.filter((q) => q.ages.includes(age)).length;
      const qs = pickDepartmentRun(d.id, age, 7);
      expect(qs.filter((q) => q.ages.includes(age)).length).toBe(Math.min(10, own));
    }
  });

  it('prefers unseen questions', () => {
    const dep = DEPARTMENTS.find((d) => d.id === 'no')!;
    const first = pickDepartmentRun('no', '12-14', 1);
    const second = pickDepartmentRun('no', '12-14', 2, first.map((q) => q.id));
    const pool = dep.questions.filter((q) => q.ages.includes('12-14')).length;
    const repeats = second.filter((q) => first.some((f) => f.id === q.id)).length;
    expect(repeats).toBe(Math.max(0, 10 - (pool - 10)));
  });

  it('keeps the correct answer when options are shuffled', () => {
    const qs = pickDepartmentRun('sant', '9-11', 99);
    for (const q of qs) {
      const orig = [...DEPARTMENTS.flatMap((d) => d.questions)].find((o) => o.id === q.id)!;
      expect(q.options[q.answer].ht).toBe(orig.options[orig.answer].ht);
    }
  });

  it('is deterministic for a seed', () => {
    expect(pickDepartmentRun('sid', '6-8', 5).map((q) => q.id)).toEqual(pickDepartmentRun('sid', '6-8', 5).map((q) => q.id));
  });

  it('adds event specials on an event day only', () => {
    const special = new Set(EVENT_QUESTIONS.vetye.map((q) => q.id));
    const onDay = pickDepartmentRun('lwes', '9-11', 3, [], '2026-11-18');
    expect(onDay.length).toBe(10);
    expect(onDay.filter((q) => special.has(q.id)).length).toBe(2);
    const otherDay = pickDepartmentRun('lwes', '9-11', 3, [], '2026-11-17');
    expect(otherDay.some((q) => special.has(q.id))).toBe(false);
  });
});

describe('events', () => {
  it('uses real Haitian dates', () => {
    const byId = Object.fromEntries(VWAYAJ_EVENTS.map((e) => [e.id, [e.month, e.day]]));
    expect(byId).toEqual({ endepandans: [1, 1], zanset: [1, 2], 'jou-drapo': [5, 18], vetye: [11, 18] });
  });

  it('finds the event of the day and doubles points only then', () => {
    expect(eventOn('2026-11-18')?.id).toBe('vetye');
    expect(eventOn('2027-05-18')?.id).toBe('jou-drapo');
    expect(eventOn('2026-11-06')).toBeNull();
    expect(pointsMultiplier('2026-11-18')).toBe(2);
    expect(pointsMultiplier('2026-11-19')).toBe(1);
  });

  it('shows the current or next event, wrapping into next year', () => {
    expect(nextEvent('2026-11-06')).toMatchObject({ date: '2026-11-18', inDays: 12, today: false, event: { id: 'vetye' } });
    expect(nextEvent('2026-11-18')).toMatchObject({ inDays: 0, today: true, event: { id: 'vetye' } });
    expect(nextEvent('2026-11-19')).toMatchObject({ date: '2027-01-01', inDays: 43, event: { id: 'endepandans' } });
    expect(nextEvent('2027-01-02')).toMatchObject({ today: true, event: { id: 'zanset' } });
    expect(nextEvent('2027-01-03')).toMatchObject({ date: '2027-05-18', event: { id: 'jou-drapo' } });
  });

  it('records events played once (feeds the vetye trophy)', () => {
    let r = recordRun(emptyVwayaj(), 'lwes', 4, [], '2026-11-18');
    expect(r.newEvent).toBe('vetye');
    r = recordRun(r.progress, 'lwes', 4, [], '2026-11-18');
    expect(r.newEvent).toBeNull();
    expect(r.progress.eventsPlayed).toEqual(['vetye']);
    const { awarded } = checkBadges({ p: emptyProgress(), duelWins: 0, lessonsDone: 0, wordsLearned: 0, departmentsUnlocked: 0, eventsPlayed: r.progress.eventsPlayed }, '2026-11-18T12:00:00Z');
    expect(awarded).toContain('vetye');
  });

  it('stars follow the quiz thresholds', () => {
    expect([runStars(10, 10), runStars(9, 10), runStars(7, 10), runStars(6, 10), runStars(1, 10), runStars(0, 10)]).toEqual([3, 3, 2, 2, 1, 0]);
  });
});
