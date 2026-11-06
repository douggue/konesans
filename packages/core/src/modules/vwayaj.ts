/**
 * Vwayaj Ayiti — the Haiti adventure map. Pure game logic (no framework imports):
 *  - the 10 departments unlock one after another; a department is "done" when the kid scores ≥ 7/10 in its run
 *  - a run = 10 questions for the kid's age, no repeats, unseen questions first
 *  - a small list of real Haitian dated events: on the day, runs carry special questions and points are doubled
 */
import type { AgeBand, LocalizedText, Question } from '../types.js';
import { rng, shuffle, shuffleOptions } from '../quiz/engine.js';
import { DEPARTMENTS, EVENT_QUESTIONS, departmentById, type DepartmentId } from '../content/departments.js';

export * from '../content/departments.js';

export const VWAYAJ_RUN_LENGTH = 10;
export const VWAYAJ_PASS = 7;
/** Bonus for clearing a department the first time (on top of the quiz XP). */
export const VWAYAJ_CLEAR_XP = 40;
export const VWAYAJ_CLEAR_COINS = 20;
/** How many event questions a run carries on an event day. */
export const VWAYAJ_EVENT_QUESTIONS = 2;

export const DEPARTMENT_ORDER: DepartmentId[] = DEPARTMENTS.map((d) => d.id);

export interface VwayajProgress {
  /** department id → best score (correct answers out of 10) once passed, with the day it was first passed */
  done: Partial<Record<DepartmentId, { best: number; day: string }>>;
  /** best score of every attempt, passed or not */
  best: Partial<Record<DepartmentId, number>>;
  /** question ids already asked (most recent last), so replays bring new questions */
  seen: string[];
  /** event ids the kid has played on their day (feeds the 'vetye' / 'drapo' trophies) */
  eventsPlayed: string[];
}

export const emptyVwayaj = (): VwayajProgress => ({ done: {}, best: {}, seen: [], eventsPlayed: [] });

export type DepartmentStatus = 'done' | 'current' | 'locked';

/** A department is open when it is the first one or the previous one is done. */
export function isUnlocked(p: VwayajProgress, id: DepartmentId): boolean {
  const i = DEPARTMENT_ORDER.indexOf(id);
  if (i < 0) return false;
  return i === 0 || !!p.done[DEPARTMENT_ORDER[i - 1]] || !!p.done[id];
}

export function departmentStatus(p: VwayajProgress, id: DepartmentId): DepartmentStatus {
  if (p.done[id]) return 'done';
  return isUnlocked(p, id) ? 'current' : 'locked';
}

/** The department the journey is at: the first one not done (null when all 10 are done). */
export function currentDepartment(p: VwayajProgress): DepartmentId | null {
  return DEPARTMENT_ORDER.find((id) => !p.done[id]) ?? null;
}

/** Departments finished (the "N / 10" on the map header and the 'vwayaj3' trophy). */
export const departmentsDone = (p: VwayajProgress): number => DEPARTMENT_ORDER.filter((id) => p.done[id]).length;

const BAND_LEVEL: Record<AgeBand, number> = { '6-8': 1, '9-11': 2, '12-14': 3 };

/** Order a pool: unseen first, then the least recently seen; shuffled inside each group. */
function freshFirst(pool: Question[], seen: string[], rand: () => number): Question[] {
  const lastSeen = new Map<string, number>();
  seen.forEach((id, i) => lastSeen.set(id, i));
  const unseen = shuffle(pool.filter((q) => !lastSeen.has(q.id)), rand);
  const old = shuffle(pool.filter((q) => lastSeen.has(q.id)), rand).sort((a, b) => lastSeen.get(a.id)! - lastSeen.get(b.id)!);
  return [...unseen, ...old];
}

/** Questions of a pool for an age: the kid's band first, then the closest difficulty when the band runs short. */
function byAge(pool: Question[], age: AgeBand, seen: string[], rand: () => number): Question[] {
  const servable = pool.filter((q) => q.status !== 'draft');
  const mine = freshFirst(servable.filter((q) => q.ages.includes(age)), seen, rand);
  const lvl = BAND_LEVEL[age];
  const others = freshFirst(servable.filter((q) => !q.ages.includes(age)), seen, rand)
    .sort((a, b) => Math.abs(a.difficulty - lvl) - Math.abs(b.difficulty - lvl)); // stable: keeps fresh-first inside a distance
  return [...mine, ...others];
}

export interface VwayajEvent {
  id: string;
  month: number; // 1–12
  day: number;
  name: LocalizedText;
  /** banner line ("Batay Vètyè: kesyon espesyal, pwen doub!") */
  tagline: LocalizedText;
  /** "18 novanm" */
  date: LocalizedText;
}

/** Real Haitian dates only. Ids 'vetye' and 'jou-drapo' match the trophies in progress/badges.ts. */
export const VWAYAJ_EVENTS: VwayajEvent[] = [
  { id: 'endepandans', month: 1, day: 1, name: { ht: 'Jou Endepandans', fr: "Fête de l'Indépendance" }, date: { ht: '1ye janvye', fr: '1er janvier' },
    tagline: { ht: 'Jou Endepandans: kesyon espesyal, pwen doub!', fr: "Fête de l'Indépendance : questions spéciales, points doublés !" } },
  { id: 'zanset', month: 1, day: 2, name: { ht: 'Jou Zansèt', fr: 'Jour des Aïeux' }, date: { ht: '2 janvye', fr: '2 janvier' },
    tagline: { ht: 'Jou Zansèt: kesyon espesyal, pwen doub!', fr: 'Jour des Aïeux : questions spéciales, points doublés !' } },
  { id: 'jou-drapo', month: 5, day: 18, name: { ht: 'Jou Drapo', fr: 'Fête du Drapeau' }, date: { ht: '18 me', fr: '18 mai' },
    tagline: { ht: 'Jou Drapo: kesyon espesyal, pwen doub!', fr: 'Fête du Drapeau : questions spéciales, points doublés !' } },
  { id: 'vetye', month: 11, day: 18, name: { ht: 'Batay Vètyè', fr: 'Bataille de Vertières' }, date: { ht: '18 novanm', fr: '18 novembre' },
    tagline: { ht: 'Batay Vètyè: kesyon espesyal, pwen doub!', fr: 'Bataille de Vertières : questions spéciales, points doublés !' } },
];

const parseDay = (day: string) => { const [y, m, d] = day.split('-').map(Number); return { y, m, d }; };
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);

/** The event happening on a local day ('YYYY-MM-DD'), if any. */
export function eventOn(day: string): VwayajEvent | null {
  const { m, d } = parseDay(day);
  return VWAYAJ_EVENTS.find((e) => e.month === m && e.day === d) ?? null;
}

/** Today's event, or the next one coming (wraps into next year). `inDays` = 0 on the day itself. */
export function nextEvent(day: string): { event: VwayajEvent; date: string; inDays: number; today: boolean } {
  const { y, m, d } = parseDay(day);
  const now = utc(y, m, d);
  let best: { event: VwayajEvent; at: number } | null = null;
  for (const e of VWAYAJ_EVENTS) {
    let at = utc(y, e.month, e.day);
    if (at < now) at = utc(y + 1, e.month, e.day);
    if (!best || at < best.at) best = { event: e, at };
  }
  const at = new Date(best!.at);
  const date = `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}-${String(at.getUTCDate()).padStart(2, '0')}`;
  const inDays = Math.round((best!.at - now) / 86_400_000);
  return { event: best!.event, date, inDays, today: inDays === 0 };
}

/** Points multiplier for a local day: ×2 on an event day. */
export const pointsMultiplier = (day: string): number => (eventOn(day) ? 2 : 1);

/**
 * The 10 questions of a department run. Matches the kid's age (closest difficulty if the band runs short),
 * never repeats a question inside the run, prefers questions not seen before; options shuffled.
 * On an event day (`day` given), up to VWAYAJ_EVENT_QUESTIONS of them are the event's special questions.
 */
export function pickDepartmentRun(id: DepartmentId, age: AgeBand, seed: number, seen: Iterable<string> = [], day?: string): Question[] {
  const dep = departmentById(id);
  if (!dep) return [];
  const rand = rng(seed);
  const seenList = [...seen];
  const ev = day ? eventOn(day) : null;
  const special = ev ? byAge(EVENT_QUESTIONS[ev.id] ?? [], age, seenList, rand).slice(0, VWAYAJ_EVENT_QUESTIONS) : [];
  const main = byAge(dep.questions, age, seenList, rand).slice(0, VWAYAJ_RUN_LENGTH - special.length);
  const out: Question[] = [];
  const used = new Set<string>();
  for (const q of [...main, ...special]) if (!used.has(q.id)) { used.add(q.id); out.push(q); }
  return shuffle(out, rand).map((q) => shuffleOptions(q, rand));
}

export interface VwayajRunResult {
  progress: VwayajProgress;
  passed: boolean;
  /** passed for the first time (the next department just unlocked) */
  firstClear: boolean;
  /** the department this run unlocked, if any */
  unlocked: DepartmentId | null;
  /** the event played today, if any (first time only) */
  newEvent: string | null;
}

/** Record a finished run. Locked departments are ignored (no progress). */
export function recordRun(p: VwayajProgress, id: DepartmentId, correct: number, questionIds: string[], day: string): VwayajRunResult {
  if (!isUnlocked(p, id)) return { progress: p, passed: false, firstClear: false, unlocked: null, newEvent: null };
  const passed = correct >= VWAYAJ_PASS;
  const firstClear = passed && !p.done[id];
  const done = { ...p.done };
  if (passed) done[id] = { best: Math.max(correct, p.done[id]?.best ?? 0), day: p.done[id]?.day ?? day };
  const best = { ...p.best, [id]: Math.max(correct, p.best[id] ?? 0) };
  const seen = [...p.seen.filter((x) => !questionIds.includes(x)), ...questionIds].slice(-300);
  const ev = eventOn(day);
  const newEvent = ev && !p.eventsPlayed.includes(ev.id) ? ev.id : null;
  const eventsPlayed = newEvent ? [...p.eventsPlayed, newEvent] : p.eventsPlayed;
  const i = DEPARTMENT_ORDER.indexOf(id);
  const unlocked = firstClear && i + 1 < DEPARTMENT_ORDER.length ? DEPARTMENT_ORDER[i + 1] : null;
  return { progress: { done, best, seen, eventsPlayed }, passed, firstClear, unlocked, newEvent };
}

/** Stars for a run (same thresholds as the quiz result screen). */
export const runStars = (correct: number, total: number): number => {
  const r = total ? correct / total : 0;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : r > 0 ? 1 : 0;
};
