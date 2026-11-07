/// <reference types="nakama-runtime" />
/**
 * Defi Jodi a — the daily challenge (docs/API.md "Daily challenge").
 *  - One set of questions per (Haiti calendar day, age band), the same for every kid. Built the first time it is
 *    asked for from the published packs (approved + review if the admin serves review; the bundled bank before
 *    the first publish) with core `pickDaily`, then frozen in storage for the day. Count = published dailyCount.
 *  - One scored attempt per account per day. The server scores the answers against its own key (core `scoreDaily`);
 *    the client's score is never read. Replays on the phone are practice and are not sent.
 *  - Ranking per (day, age band): a Nakama leaderboard. A kid appears in it only when a parent allowed online play
 *    (server-side consent record + settings/kid.randomDuelsAllowed, written by `online_set`). Usernames + avatars only.
 * Storage:
 *   daily_set/<day>_<age>   (system user)  { day, age, count, questions, createdAt }
 *   daily/<day>             (kid)          { day, age, startedAt, result? }
 * Leaderboards: daily_<day>_<age>  (authoritative, best, ranks on; old ones removed after 8 days)
 */
import {
  BANK, pickDaily, scoreDaily, haitiDay, addDays, isDay, isAgeBand, clampDailyCount, dailyRankScore, dailyRankSubscore,
  DAILY_TOP, DAILY_MIN_ANSWER_MS, type AgeBand, type Question,
} from '@konesans/core';
import { SYSTEM_USER, fail, readSys, getManifest, publishedQuestions } from './admin';

const CODES = { INVALID: 3, PRECONDITION: 9, UNAUTH: 16 } as const;
const C = { SET: 'daily_set', USER: 'daily' } as const;
/** A run may be sent this long after the day's set was first opened (a kid who starts at 23:55 can still finish). */
const LATE_GRACE_MS = 60 * 60 * 1000;
/** Old leaderboards are removed when a new day starts. */
const KEEP_DAYS = 8;

interface DailySet { day: string; age: AgeBand; count: number; questions: Question[]; createdAt: string }
interface DailyResult { correct: number; total: number; score: number; ms: number; perQuestion: boolean[]; at: string; ranked: boolean }
interface DailyUser { day: string; age: AgeBand; startedAt: number; result?: DailyResult }

const out = (v: unknown) => JSON.stringify(v);
function body(payload: string): any {
  if (!payload) return {};
  try { return JSON.parse(payload); } catch { fail('Body is not valid JSON', CODES.INVALID); }
}
const boardId = (day: string, age: AgeBand) => `daily_${day}_${age}`;

/** A parent allowed online play: consent record confirmed and the kid setting on (both written by `online_set`). */
export function onlineAllowed(nk: nkruntime.Nakama, userId: string): boolean {
  const r = nk.storageRead([{ collection: 'consent', key: 'record', userId }, { collection: 'settings', key: 'kid', userId }]);
  const consent = r.find((o) => o.collection === 'consent')?.value;
  const kid = r.find((o) => o.collection === 'settings')?.value;
  return !!consent?.confirmedAt && !!kid?.randomDuelsAllowed;
}

function dailyCount(nk: nkruntime.Nakama): number {
  const man = getManifest(nk);
  if (man?.config?.dailyCount) return clampDailyCount(man.config.dailyCount);
  return clampDailyCount(readSys<{ dailyCount?: number }>(nk, 'admin', 'config')?.value?.dailyCount);
}

/** Only what the app needs to show a question (answer included: the phone shows right/wrong after each tap). */
const publicQ = (q: Question): Question => {
  const p: Question = { id: q.id, category: q.category, difficulty: q.difficulty, ages: q.ages, prompt: q.prompt, options: q.options, answer: q.answer, status: 'approved' };
  if (q.explain) p.explain = q.explain;
  if (q.media) p.media = q.media;
  return p;
};

function readSet(nk: nkruntime.Nakama, day: string, age: AgeBand): DailySet | null {
  return readSys<DailySet>(nk, C.SET, `${day}_${age}`)?.value ?? null;
}

/** The day's set, created (and frozen) on first use. */
function getOrCreateSet(nk: nkruntime.Nakama, logger: nkruntime.Logger, day: string, age: AgeBand): DailySet {
  const have = readSet(nk, day, age);
  if (have) return have;
  const published = publishedQuestions(nk) as Question[];
  const pool = published.length ? published : (BANK as Question[]);
  const count = dailyCount(nk);
  const set: DailySet = { day, age, count, questions: pickDaily(pool, age, day, count).map(publicQ), createdAt: new Date().toISOString() };
  try {
    // version '*' = only if nobody created it in the meantime (two kids opening it at the same moment get the same set)
    nk.storageWrite([{ collection: C.SET, key: `${day}_${age}`, userId: SYSTEM_USER, value: set, version: '*', permissionRead: 0, permissionWrite: 0 }]);
    logger.info('daily set %s %s: %d questions (%s)', day, age, set.questions.length, published.length ? 'published' : 'bundled bank');
    cleanup(nk, day, age);
  } catch {
    return readSet(nk, day, age) ?? set;
  }
  return set;
}

function cleanup(nk: nkruntime.Nakama, day: string, age: AgeBand) {
  const old = addDays(day, -KEEP_DAYS);
  try { nk.leaderboardDelete(boardId(old, age)); } catch { /* never existed */ }
  try { nk.storageDelete([{ collection: C.SET, key: `${old}_${age}`, userId: SYSTEM_USER }]); } catch { /* fine */ }
}

function readUser(nk: nkruntime.Nakama, userId: string, day: string): { value: DailyUser; version: string } | null {
  const o = nk.storageRead([{ collection: C.USER, key: day, userId }])[0];
  return o ? { value: o.value as DailyUser, version: o.version } : null;
}

function ensureBoard(nk: nkruntime.Nakama, day: string, age: AgeBand) {
  try { nk.leaderboardCreate(boardId(day, age), true, 'descending' as nkruntime.SortOrder, 'best' as nkruntime.Operator, null, { day, age }, true); } catch { /* exists */ }
}

/** A kid whose parent switched online play off disappears from the boards. */
function dropFromBoard(nk: nkruntime.Nakama, day: string, age: AgeBand, userId: string) {
  try { nk.leaderboardRecordDelete(boardId(day, age), userId); } catch { /* not there */ }
}

interface TopRow { rank: number; name: string; avatar?: unknown; correct: number; total: number; score: number; me: boolean }
function top(nk: nkruntime.Nakama, day: string, age: AgeBand, userId: string): { top: TopRow[]; me: TopRow | null } {
  let list: nkruntime.LeaderboardRecordList;
  try { list = nk.leaderboardRecordsList(boardId(day, age), [userId], DAILY_TOP + 5); } catch { return { top: [], me: null }; }
  const row = (r: nkruntime.LeaderboardRecord): TopRow => ({
    rank: r.rank, name: String(r.username || 'Jwè'), avatar: r.metadata?.avatar, correct: Number(r.metadata?.correct ?? Math.floor(r.score / 1000)),
    total: Number(r.metadata?.total ?? 0), score: Number(r.metadata?.score ?? r.score % 1000), me: r.ownerId === userId,
  });
  const records = list.records ?? [];
  // only kids whose parent still allows online play (a few extra rows were read for this)
  const owners = records.map((r) => r.ownerId);
  const ok = new Set<string>();
  if (owners.length) {
    const objs = nk.storageRead(owners.flatMap((id) => [{ collection: 'consent', key: 'record', userId: id }, { collection: 'settings', key: 'kid', userId: id }]));
    for (const id of owners) {
      const c = objs.find((o) => o.userId === id && o.collection === 'consent')?.value;
      const s = objs.find((o) => o.userId === id && o.collection === 'settings')?.value;
      if (c?.confirmedAt && s?.randomDuelsAllowed) ok.add(id);
    }
  }
  const rows = records.filter((r) => ok.has(r.ownerId)).slice(0, DAILY_TOP).map(row);
  rows.forEach((r, i) => { r.rank = i + 1; }); // dense places 1…10 after the filter
  const mine = (list.ownerRecords ?? []).find((r) => r.ownerId === userId);
  const me = rows.find((r) => r.me) ?? (mine ? row(mine) : null);
  return { top: rows, me };
}

function displayName(nk: nkruntime.Nakama, userId: string): { name: string; avatar?: unknown } {
  const u = nk.usersGetId([userId])[0];
  return { name: (u?.displayName || u?.username || 'Jwè').slice(0, 24), avatar: (u?.metadata as any)?.avatar };
}

// ---------- RPCs ----------

/** Body { age }. → { day, age, count, questions, result | null, allowed }. No parent permission needed (content, like packs). */
export const dailyGet: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  const b = body(payload);
  if (!isAgeBand(b.age)) fail('age must be 6-8, 9-11 or 12-14', CODES.INVALID);
  const day = haitiDay(Date.now());
  const set = getOrCreateSet(nk, logger, day, b.age);
  let u = readUser(nk, ctx.userId, day);
  if (!u) {
    const value: DailyUser = { day, age: b.age, startedAt: Date.now() };
    try { nk.storageWrite([{ collection: C.USER, key: day, userId: ctx.userId, value, version: '*', permissionRead: 1, permissionWrite: 0 }]); } catch { /* opened twice at once */ }
    u = readUser(nk, ctx.userId, day);
  }
  const allowed = onlineAllowed(nk, ctx.userId);
  const result = u?.value.result ?? null;
  if (!allowed && result?.ranked) dropFromBoard(nk, day, u!.value.age, ctx.userId);
  return out({ day, age: b.age, count: set.questions.length, questions: set.questions, result, playedAge: result ? u!.value.age : null, allowed });
};

/**
 * Body { day, age, answers: [{ i: number|null, ms }], ms }. The one scored attempt of the day.
 * → { day, age, correct, total, score, ms, perQuestion, allowed, already, top, me }.
 * A second call returns the first result unchanged with already: true.
 */
export const dailySubmit: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  const b = body(payload);
  if (!isDay(b.day)) fail('day required (YYYY-MM-DD)', CODES.INVALID);
  if (!isAgeBand(b.age)) fail('age must be 6-8, 9-11 or 12-14', CODES.INVALID);
  if (!Array.isArray(b.answers)) fail('answers required', CODES.INVALID);
  const now = Date.now();
  const today = haitiDay(now);
  const u = readUser(nk, ctx.userId, b.day);
  if (!u) fail('daily_not_started', CODES.PRECONDITION); // daily_get first
  const allowed = onlineAllowed(nk, ctx.userId);
  if (u!.value.result) {
    const r = u!.value.result;
    return out({ day: b.day, age: u!.value.age, ...r, allowed, already: true, ...(allowed && r.ranked ? top(nk, b.day, u!.value.age, ctx.userId) : { top: [], me: null }) });
  }
  if (b.day !== today && !(b.day === addDays(today, -1) && now - u!.value.startedAt < LATE_GRACE_MS)) fail('daily_closed', CODES.PRECONDITION);
  const set = readSet(nk, b.day, b.age);
  if (!set) fail('daily_not_started', CODES.PRECONDITION);
  const answers = (b.answers as any[]).slice(0, set!.questions.length).map((a) => (a && typeof a === 'object' ? { i: a.i === null || a.i === undefined ? null : Number(a.i), ms: Number(a.ms) } : null));
  // sane time: the whole run cannot be shorter than the minimum reading time per answered question
  const answered = answers.filter((a) => a && a.i !== null).length;
  if (now - u!.value.startedAt < answered * DAILY_MIN_ANSWER_MS) fail('too_fast', CODES.INVALID);
  const s = scoreDaily(set!.questions, answers);
  const result: DailyResult = { correct: s.correct, total: s.total, score: s.score, ms: s.ms, perQuestion: s.perQuestion, at: new Date(now).toISOString(), ranked: allowed };
  try {
    // the stored version must still be the one we read: two submits at the same moment → only one is scored
    nk.storageWrite([{ collection: C.USER, key: b.day, userId: ctx.userId, value: { ...u!.value, age: b.age, result }, version: u!.version, permissionRead: 1, permissionWrite: 0 }]);
  } catch {
    const again = readUser(nk, ctx.userId, b.day)?.value;
    const r = again?.result ?? result;
    return out({ day: b.day, age: b.age, ...r, allowed, already: true, top: [], me: null });
  }
  if (allowed) {
    ensureBoard(nk, b.day, b.age);
    const who = displayName(nk, ctx.userId);
    nk.leaderboardRecordWrite(boardId(b.day, b.age), ctx.userId, who.name, dailyRankScore(s), dailyRankSubscore(s),
      { avatar: who.avatar ?? null, correct: s.correct, total: s.total, score: s.score });
  }
  logger.info('daily %s %s user=%s %d/%d ranked=%s', b.day, b.age, ctx.userId, s.correct, s.total, allowed);
  return out({ day: b.day, age: b.age, ...result, allowed, already: false, ...(allowed ? top(nk, b.day, b.age, ctx.userId) : { top: [], me: null }) });
};

/** Body { age, day? }. → { day, age, allowed, top: TopRow[], me: TopRow | null }. Empty unless online play is allowed. */
export const dailyTop: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  const b = body(payload);
  if (!isAgeBand(b.age)) fail('age must be 6-8, 9-11 or 12-14', CODES.INVALID);
  const day = isDay(b.day) ? b.day : haitiDay(Date.now());
  if (!onlineAllowed(nk, ctx.userId)) { dropFromBoard(nk, day, b.age, ctx.userId); return out({ day, age: b.age, allowed: false, top: [], me: null }); }
  return out({ day, age: b.age, allowed: true, ...top(nk, day, b.age, ctx.userId) });
};
