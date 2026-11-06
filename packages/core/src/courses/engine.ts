/**
 * Language-course engine (Duolingo-style, Kreyòl → English / Spanish).
 *
 * - A lesson is generated from the shared content (concepts + sentences) for an age band,
 *   so the same lesson plays differently every time and younger kids get picture/listen
 *   exercises while older kids build and complete sentences.
 * - Wrong answers are re-queued once at the end of the lesson (no hearts: kids keep going).
 * - XP/stars feed the same Progress/quests/badges as the quiz side (`lesson_done` event).
 */
import type { AgeBand, LocalizedText } from '../types.js';
import { CONCEPTS, SENTENCES, UNITS, conceptById, sentenceById, type Concept, type LessonDef, type Sentence, type TargetLang, type UnitDef } from './content.js';

export type CourseId = TargetLang;
import type { Rand } from '../modules/base.js';


export interface Course { id: CourseId; name: LocalizedText; tagline: LocalizedText; units: UnitDef[] }

export const COURSES: Course[] = [
  { id: 'en', name: { ht: 'Angle', en: 'English', fr: 'Anglais' }, tagline: { ht: 'Aprann angle an Kreyòl', fr: "Apprendre l'anglais en français" }, units: UNITS },
  { id: 'es', name: { ht: 'Panyòl', en: 'Spanish', fr: 'Espagnol' }, tagline: { ht: 'Aprann panyòl an Kreyòl', fr: "Apprendre l'espagnol en français" }, units: UNITS },
];
export const courseById = (id: CourseId): Course => COURSES.find(c => c.id === id)!;

/** Audio reference the app resolves with device TTS (expo-speech) in the target language. */
export const tts = (lang: CourseId, text: string) => `tts:${lang}:${text}`;

// ─── Exercise shapes ─────────────────────────────────────────────────────────

interface Base { id: string; kind: string; /** concept or sentence this exercise drills (for SRS) */ ref: string }

/** Read/hear a target word, pick its Kreyòl meaning (pictures for 6–8). */
export interface PickMeaning extends Base { kind: 'pick_meaning'; prompt: { target: string; audio: string }; options: { ht: string; fr: string; img?: string }[]; answer: number }
/** See Kreyòl (and picture), pick the target word. */
export interface PickWord extends Base { kind: 'pick_word'; prompt: { ht: string; fr: string; img?: string }; options: { target: string; audio: string }[]; answer: number }
/** Hear a target word, pick the written form. */
export interface ListenPick extends Base { kind: 'listen_pick'; audio: string; options: { target: string }[]; answer: number }
/** Match Kreyòl words to target words. `pairs[i]` = index in `right` that matches `left[i]`. */
export interface MatchPairs extends Base { kind: 'match_pairs'; /** every concept in the grid */ refs: string[]; left: { ht: string; fr: string }[]; right: { target: string; audio: string }[]; pairs: number[] }
/** Read/hear a target sentence, pick the Kreyòl translation. */
export interface TranslatePick extends Base { kind: 'translate_pick'; prompt: { target: string; audio: string }; options: { ht: string; fr: string }[]; answer: number }
/** Kreyòl sentence shown; assemble the target sentence from word tiles (with distractors). */
export interface BuildSentence extends Base { kind: 'build_sentence'; prompt: { ht: string; fr: string }; tiles: string[]; /** tile indices in order */ answer: number[] }
/** Target sentence with one word missing; pick the word. */
export interface FillBlank extends Base { kind: 'fill_blank'; text: string; translation: { ht: string; fr: string }; options: string[]; answer: number; audio: string }

export type Exercise = PickMeaning | PickWord | ListenPick | MatchPairs | TranslatePick | BuildSentence | FillBlank;
export type ExerciseKind = Exercise['kind'];

/** What the UI sends back: option index, tile indices in order, or the pair mapping. */
export type Response = number | number[];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pick = <T>(rand: Rand, arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
function shuffle<T>(a: readonly T[], rand: Rand): T[] { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const target = (c: Concept, lang: CourseId) => c[lang];
const sText = (s: Sentence, lang: CourseId) => s[lang];

export const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿¡?!.,;:"'…]/g, '').replace(/\s+/g, ' ').trim();
export const tokenize = (s: string) => s.replace(/[¿¡?!.,;:"…]/g, ' ').split(/\s+/).filter(Boolean);

function findLesson(lessonId: string): { unit: UnitDef; lesson: LessonDef; index: number } {
  let index = 0;
  for (const unit of UNITS) for (const lesson of unit.lessons) { if (lesson.id === lessonId) return { unit, lesson, index }; index++; }
  throw new Error(`unknown lesson ${lessonId}`);
}

/** Distractor concepts: same lesson first, then same unit, then anything — never the answer, never a duplicate target form. */
function distractors(lang: CourseId, answer: Concept, lesson: LessonDef, unit: UnitDef, rand: Rand, n: number, field: 'ht' | 'target' = 'target'): Concept[] {
  const val = (c: Concept) => normalize(field === 'ht' ? c.ht : target(c, lang));
  const seen = new Set<string>([val(answer)]);
  const out: Concept[] = [];
  const pools = [lesson.concepts, unit.lessons.flatMap(l => l.concepts), CONCEPTS.map(c => c.id)];
  for (const pool of pools) {
    for (const id of shuffle(pool, rand)) {
      const c = conceptById[id];
      if (out.length >= n) return out;
      if (c.id === answer.id || seen.has(val(c))) continue;
      seen.add(val(c)); out.push(c);
    }
  }
  return out;
}

const eid = (lang: CourseId, kind: string, ref: string, rand: Rand) => `course:${lang}:${kind}:${ref}:${Math.floor(rand() * 1e6).toString(36)}`;

// ─── Exercise generators ─────────────────────────────────────────────────────

function genPickMeaning(lang: CourseId, c: Concept, lesson: LessonDef, unit: UnitDef, age: AgeBand, rand: Rand): PickMeaning {
  const ds = distractors(lang, c, lesson, unit, rand, age === '6-8' ? 2 : 3, 'ht');
  const opts = shuffle([c, ...ds], rand);
  const pics = age === '6-8' && opts.every(o => o.img);
  return { id: eid(lang, 'pm', c.id, rand), kind: 'pick_meaning', ref: c.id, prompt: { target: target(c, lang), audio: tts(lang, target(c, lang)) }, options: opts.map(o => ({ ht: o.ht, fr: o.fr, img: pics ? o.img : undefined })), answer: opts.indexOf(c) };
}

function genPickWord(lang: CourseId, c: Concept, lesson: LessonDef, unit: UnitDef, age: AgeBand, rand: Rand): PickWord {
  const ds = distractors(lang, c, lesson, unit, rand, age === '6-8' ? 2 : 3);
  const opts = shuffle([c, ...ds], rand);
  return { id: eid(lang, 'pw', c.id, rand), kind: 'pick_word', ref: c.id, prompt: { ht: c.ht, fr: c.fr, img: c.img }, options: opts.map(o => ({ target: target(o, lang), audio: tts(lang, target(o, lang)) })), answer: opts.indexOf(c) };
}

function genListenPick(lang: CourseId, c: Concept, lesson: LessonDef, unit: UnitDef, age: AgeBand, rand: Rand): ListenPick {
  const ds = distractors(lang, c, lesson, unit, rand, age === '6-8' ? 2 : 3);
  const opts = shuffle([c, ...ds], rand);
  return { id: eid(lang, 'lp', c.id, rand), kind: 'listen_pick', ref: c.id, audio: tts(lang, target(c, lang)), options: opts.map(o => ({ target: target(o, lang) })), answer: opts.indexOf(c) };
}

function genMatchPairs(lang: CourseId, pool: Concept[], age: AgeBand, rand: Rand): MatchPairs {
  const n = age === '6-8' ? 3 : 4;
  // unique on both sides
  const chosen: Concept[] = []; const seenHt = new Set<string>(); const seenT = new Set<string>();
  for (const c of shuffle(pool, rand)) {
    const h = normalize(c.ht), t = normalize(target(c, lang));
    if (seenHt.has(h) || seenT.has(t)) continue;
    seenHt.add(h); seenT.add(t); chosen.push(c);
    if (chosen.length === n) break;
  }
  const right = shuffle(chosen, rand);
  return { id: eid(lang, 'mp', chosen.map(c => c.id).join('+'), rand), kind: 'match_pairs', ref: chosen[0].id, refs: chosen.map(c => c.id), left: chosen.map(c => ({ ht: c.ht, fr: c.fr })), right: right.map(c => ({ target: target(c, lang), audio: tts(lang, target(c, lang)) })), pairs: chosen.map(c => right.indexOf(c)) };
}

function genTranslatePick(lang: CourseId, s: Sentence, rand: Rand): TranslatePick {
  const others = shuffle(SENTENCES.filter(o => o.id !== s.id && normalize(o.ht) !== normalize(s.ht)), rand).slice(0, 3);
  const opts = shuffle([s, ...others], rand);
  return { id: eid(lang, 'tp', s.id, rand), kind: 'translate_pick', ref: s.id, prompt: { target: sText(s, lang), audio: tts(lang, sText(s, lang)) }, options: opts.map(o => ({ ht: o.ht, fr: o.fr })), answer: opts.indexOf(s) };
}

function genBuildSentence(lang: CourseId, s: Sentence, age: AgeBand, rand: Rand): BuildSentence {
  const words = tokenize(sText(s, lang));
  const have = new Set(words.map(normalize));
  const extra = age === '6-8' ? 1 : age === '9-11' ? 2 : 3;
  const bank = shuffle(SENTENCES.filter(o => o.id !== s.id).flatMap(o => tokenize(sText(o, lang))), rand).filter(w => !have.has(normalize(w)));
  const ds: string[] = [];
  for (const w of bank) { if (ds.length >= extra) break; if (!ds.some(d => normalize(d) === normalize(w))) ds.push(w); }
  const tiles = shuffle([...words, ...ds], rand);
  // answer = indices of tiles matching each word, in order (tiles are unique per text, duplicates resolved left-to-right)
  const used = new Set<number>();
  const answer = words.map(w => { const i = tiles.findIndex((t, k) => !used.has(k) && t === w); used.add(i); return i; });
  return { id: eid(lang, 'bs', s.id, rand), kind: 'build_sentence', ref: s.id, prompt: { ht: s.ht, fr: s.fr }, tiles, answer };
}

function genFillBlank(lang: CourseId, s: Sentence, lesson: LessonDef, unit: UnitDef, rand: Rand): FillBlank {
  const text = sText(s, lang);
  const words = tokenize(text);
  // blank a word that is one of the sentence's practised concepts if we can find it; else the longest word
  let blank: string | undefined; let concept: Concept | undefined;
  for (const id of shuffle(s.uses, rand)) {
    const c = conceptById[id]; const forms = [target(c, lang), ...(c.alt?.[lang] ?? [])].map(normalize);
    const w = words.find(w => forms.includes(normalize(w)));
    if (w) { blank = w; concept = c; break; }
  }
  if (!blank) blank = words.slice().sort((a, b) => b.length - a.length)[0];
  const ds = new Set<string>();
  const cand = concept ? distractors(lang, concept, lesson, unit, rand, 6).map(c => target(c, lang)) : [];
  const bank = [...cand, ...shuffle(SENTENCES.flatMap(o => tokenize(sText(o, lang))), rand)];
  // match the blank's casing so capitalisation never gives the answer away
  const cap = blank[0] === blank[0].toUpperCase() && blank[0] !== blank[0].toLowerCase();
  const caseLike = (w: string) => cap ? w[0].toUpperCase() + w.slice(1) : w[0].toLowerCase() + w.slice(1);
  for (const w of bank) { if (ds.size >= 3) break; if (normalize(w) !== normalize(blank)) ds.add(caseLike(w)); }
  const options = shuffle([blank, ...ds], rand);
  const re = new RegExp(`(^|[^\\p{L}])${blank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}])`, 'u');
  return { id: eid(lang, 'fb', s.id, rand), kind: 'fill_blank', ref: concept?.id ?? s.id, text: text.replace(re, '$1____'), translation: { ht: s.ht, fr: s.fr }, options, answer: options.indexOf(blank), audio: tts(lang, text) };
}

// ─── Lesson assembly ─────────────────────────────────────────────────────────

const MIX: Record<AgeBand, Partial<Record<ExerciseKind, number>>> = {
  '6-8':   { pick_meaning: 3, pick_word: 2, listen_pick: 2, match_pairs: 1, translate_pick: 1, build_sentence: 1 },
  '9-11':  { pick_meaning: 2, pick_word: 2, listen_pick: 1, match_pairs: 1, translate_pick: 1, build_sentence: 2, fill_blank: 1 },
  '12-14': { pick_meaning: 1, pick_word: 2, listen_pick: 1, match_pairs: 1, translate_pick: 1, build_sentence: 3, fill_blank: 1 },
};

export interface LessonOptions { count?: number; rand?: Rand }

/** Generate a fresh set of exercises for one lesson. Every concept of the lesson is drilled at least once. */
export function buildLesson(lang: CourseId, lessonId: string, age: AgeBand, opts: LessonOptions = {}): Exercise[] {
  const rand = opts.rand ?? Math.random;
  const { unit, lesson } = findLesson(lessonId);
  const concepts = lesson.concepts.map(id => conceptById[id]);
  const sentences = lesson.sentences.map(id => sentenceById[id]);
  const easy = (s: Sentence) => tokenize(sText(s, lang)).length <= 4;
  const mix = { ...MIX[age] };
  const total = opts.count ?? 10;

  const out: Exercise[] = [];
  // rotate through concepts so each is seen; the first pass covers them all
  const conceptQueue = shuffle(concepts, rand);
  let ci = 0; const nextConcept = () => conceptQueue[ci++ % conceptQueue.length];
  const sentQueue = shuffle(sentences, rand);
  let si = 0; const nextSentence = (pred?: (s: Sentence) => boolean) => {
    for (let k = 0; k < sentQueue.length; k++) { const s = sentQueue[(si + k) % sentQueue.length]; if (!pred || pred(s)) { si = si + k + 1; return s; } }
    return undefined;
  };

  const kinds: ExerciseKind[] = [];
  for (const [k, n] of Object.entries(mix) as [ExerciseKind, number][]) for (let i = 0; i < n; i++) kinds.push(k);
  // word exercises first (teach), sentence exercises after (use); keep a light shuffle inside each group
  const wordKinds = shuffle(kinds.filter(k => ['pick_meaning', 'pick_word', 'listen_pick', 'match_pairs'].includes(k)), rand);
  const sentKinds = shuffle(kinds.filter(k => !wordKinds.includes(k)), rand);
  // a lesson with no sentences (never in shipped content, but keep it safe) turns sentence slots into word slots
  const order = sentences.length ? [...wordKinds, ...sentKinds] : [...wordKinds, ...sentKinds.map(() => 'pick_word' as const)];

  for (const kind of order) {
    if (out.length >= total) break;
    switch (kind) {
      case 'pick_meaning': out.push(genPickMeaning(lang, nextConcept(), lesson, unit, age, rand)); break;
      case 'pick_word': out.push(genPickWord(lang, nextConcept(), lesson, unit, age, rand)); break;
      case 'listen_pick': out.push(genListenPick(lang, nextConcept(), lesson, unit, age, rand)); break;
      case 'match_pairs': out.push(genMatchPairs(lang, concepts.length >= 4 ? concepts : unit.lessons.flatMap(l => l.concepts).map(id => conceptById[id]), age, rand)); break;
      case 'translate_pick': { const s = nextSentence(); if (s) out.push(genTranslatePick(lang, s, rand)); break; }
      case 'build_sentence': { const s = age === '6-8' ? (nextSentence(easy) ?? undefined) : nextSentence(); if (s) out.push(genBuildSentence(lang, s, age, rand)); else out.push(genPickWord(lang, nextConcept(), lesson, unit, age, rand)); break; }
      case 'fill_blank': { const s = nextSentence(); if (s) out.push(genFillBlank(lang, s, lesson, unit, rand)); break; }
    }
  }
  // make sure every concept got at least one word exercise
  const covered = new Set(out.map(e => e.ref));
  for (const e of out) if (e.kind === 'match_pairs') e.left.forEach(l => { const c = concepts.find(c => c.ht === l.ht); if (c) covered.add(c.id); });
  // (a lesson may run a little longer than `count` so that no word is skipped)
  for (const c of concepts) if (!covered.has(c.id)) out.push(genPickWord(lang, c, lesson, unit, age, rand));
  return out;
}

// ─── Grading ─────────────────────────────────────────────────────────────────

export interface Grade { correct: boolean; /** what the kid should have picked, for the feedback card */ expected: string; /** same, for a kid using the app in French */ expectedFr: string }

export function gradeExercise(ex: Exercise, response: Response): Grade {
  const same = (correct: boolean, expected: string): Grade => ({ correct, expected, expectedFr: expected });
  switch (ex.kind) {
    case 'pick_meaning': return { correct: response === ex.answer, expected: ex.options[ex.answer].ht, expectedFr: ex.options[ex.answer].fr };
    case 'pick_word': return same(response === ex.answer, ex.options[ex.answer].target);
    case 'listen_pick': return same(response === ex.answer, ex.options[ex.answer].target);
    case 'translate_pick': return { correct: response === ex.answer, expected: ex.options[ex.answer].ht, expectedFr: ex.options[ex.answer].fr };
    case 'fill_blank': return same(response === ex.answer, ex.text.replace('____', ex.options[ex.answer]));
    case 'match_pairs': {
      const r = Array.isArray(response) ? response : [];
      const ok = r.length === ex.pairs.length && ex.pairs.every((p, i) => r[i] === p);
      return { correct: ok, expected: ex.left.map((l, i) => `${l.ht} = ${ex.right[ex.pairs[i]].target}`).join(', '), expectedFr: ex.left.map((l, i) => `${l.fr} = ${ex.right[ex.pairs[i]].target}`).join(', ') };
    }
    case 'build_sentence': {
      const r = Array.isArray(response) ? response : [];
      const got = r.map(i => ex.tiles[i] ?? '').map(normalize).join(' ');
      const want = ex.answer.map(i => ex.tiles[i]).map(normalize).join(' ');
      return same(got === want, ex.answer.map(i => ex.tiles[i]).join(' '));
    }
  }
}

// ─── Lesson session (requeue mistakes, score, XP) ────────────────────────────

export interface LessonSession {
  lang: CourseId; lessonId: string; age: AgeBand;
  queue: Exercise[]; i: number;
  /** first-try result per original exercise id */
  firstTry: Record<string, boolean>;
  requeued: Set<string>;
  startedAt: number;
}

export function startLesson(lang: CourseId, lessonId: string, age: AgeBand, opts: LessonOptions = {}, now = Date.now()): LessonSession {
  return { lang, lessonId, age, queue: buildLesson(lang, lessonId, age, opts), i: 0, firstTry: {}, requeued: new Set(), startedAt: now };
}

export const currentExercise = (s: LessonSession): Exercise | undefined => s.queue[s.i];
export const lessonProgressPct = (s: LessonSession) => Math.round((s.i / s.queue.length) * 100);

export function answerLesson(s: LessonSession, response: Response): { session: LessonSession; grade: Grade; done: boolean } {
  const ex = s.queue[s.i];
  if (!ex) throw new Error('lesson already finished');
  const grade = gradeExercise(ex, response);
  const firstTry = { ...s.firstTry };
  if (!(ex.id in firstTry)) firstTry[ex.id] = grade.correct;
  let queue = s.queue; const requeued = new Set(s.requeued);
  if (!grade.correct && !requeued.has(ex.id)) { requeued.add(ex.id); queue = [...queue, ex]; }
  const next: LessonSession = { ...s, queue, i: s.i + 1, firstTry, requeued };
  return { session: next, grade, done: next.i >= queue.length };
}

export interface LessonResult { total: number; firstTryCorrect: number; score: number; stars: 1 | 2 | 3; perfect: boolean; xp: number; coins: number; durationSec: number }

export function finishLesson(s: LessonSession, now = Date.now()): LessonResult {
  const ids = Object.keys(s.firstTry);
  const total = ids.length;
  const firstTryCorrect = ids.filter(id => s.firstTry[id]).length;
  const score = total ? firstTryCorrect / total : 0;
  const perfect = total > 0 && firstTryCorrect === total;
  const stars: 1 | 2 | 3 = score >= 0.9 ? 3 : score >= 0.6 ? 2 : 1;
  const xp = 10 + firstTryCorrect * 2 + (perfect ? 10 : 0);
  return { total, firstTryCorrect, score, stars, perfect, xp, coins: 5 + (perfect ? 5 : 0), durationSec: Math.max(0, Math.round((now - s.startedAt) / 1000)) };
}

// ─── Course progress / path ──────────────────────────────────────────────────

export interface LessonRecord { stars: 1 | 2 | 3; best: number; doneAt: string; times: number }
export interface CourseProgress { lessons: Record<string, LessonRecord> }
export const emptyCourseProgress = (): CourseProgress => ({ lessons: {} });

export function recordLesson(p: CourseProgress, lessonId: string, r: LessonResult, now = new Date()): CourseProgress {
  const prev = p.lessons[lessonId];
  const rec: LessonRecord = { stars: prev ? (Math.max(prev.stars, r.stars) as 1 | 2 | 3) : r.stars, best: Math.max(prev?.best ?? 0, r.score), doneAt: now.toISOString(), times: (prev?.times ?? 0) + 1 };
  return { lessons: { ...p.lessons, [lessonId]: rec } };
}

export type LessonState = 'done' | 'open' | 'locked';
export interface PathLesson { id: string; title: string; titleFr: string; state: LessonState; stars: 0 | 1 | 2 | 3 }
export interface PathUnit { id: string; title: string; titleFr: string; emoji: string; lessons: PathLesson[]; done: number; total: number }

/** The lesson path: linear — a lesson opens when the previous one is done; the first is always open. */
export function coursePath(lang: CourseId, p: CourseProgress): PathUnit[] {
  let prevDone = true;
  return courseById(lang).units.map(u => {
    const lessons = u.lessons.map(l => {
      const rec = p.lessons[l.id];
      const state: LessonState = rec ? 'done' : prevDone ? 'open' : 'locked';
      prevDone = !!rec;
      return { id: l.id, title: l.title, titleFr: l.titleFr, state, stars: (rec?.stars ?? 0) as 0 | 1 | 2 | 3 };
    });
    return { id: u.id, title: u.title, titleFr: u.titleFr, emoji: u.emoji, lessons, done: lessons.filter(l => l.state === 'done').length, total: lessons.length };
  });
}

export const nextLesson = (lang: CourseId, p: CourseProgress): PathLesson | undefined => coursePath(lang, p).flatMap(u => u.lessons).find(l => l.state === 'open');

export function courseSummary(lang: CourseId, p: CourseProgress) {
  const path = coursePath(lang, p);
  const all = path.flatMap(u => u.lessons);
  const done = all.filter(l => l.state === 'done').length;
  const words = new Set<string>();
  for (const u of courseById(lang).units) for (const l of u.lessons) if (p.lessons[l.id]) l.concepts.forEach(c => words.add(c));
  return { lessonsDone: done, lessonsTotal: all.length, wordsLearned: words.size, crowns: all.filter(l => l.stars === 3).length };
}

/** All vocabulary of a course, for the "Mo mwen konnen" list and the review deck. */
export const courseVocab = (lang: CourseId) => CONCEPTS.map(c => ({ id: c.id, ht: c.ht, fr: c.fr, target: c[lang], img: c.img, audio: tts(lang, c[lang]) }));
