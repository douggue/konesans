/// <reference types="nakama-runtime" />
/**
 * Age / class change requests. A parent asks from the kid's phone (Paramèt → Espas Paran), an admin
 * approves or refuses in the admin panel ("Demann"), and the phone applies an approved change by itself.
 * Age band drives the questions a kid gets and who they meet in online duels, so it only changes this way.
 *
 * Storage (system user, not readable by clients): change_req/<id> = ChangeReq.
 * Kid-safe data only: device user id, the kid's game username, current + requested values, a short reason.
 * Contract: docs/API.md.
 */
import { SYSTEM_USER, fail, rpc, audit } from './admin';

const COLL = 'change_req';
const CODES = { INVALID: 3, NOT_FOUND: 5, EXISTS: 6, UNAUTH: 16, LIMIT: 8 } as const;
const AGES = ['6-8', '9-11', '12-14'];
/** Haitian school levels (école fondamentale 1–9) + not in school / other. Same ids as the app (src/lib/strings/requests.ts). */
const GRADES = ['af1', 'af2', 'af3', 'af4', 'af5', 'af6', 'af7', 'af8', 'af9', 'none', 'other'];
const MAX_PER_DAY = 3;
const REASON_MAX = 140;

type ReqStatus = 'pending' | 'approved' | 'refused';
export interface ChangeReq {
  id: string; userId: string; username: string;
  current: { age: string | null; grade: string | null };
  requested: { age?: string; grade?: string };
  reason: string; status: ReqStatus; createdAt: string;
  resolvedAt?: string; resolvedBy?: string; note?: string;
}

const now = () => new Date().toISOString();
const out = (v: unknown) => JSON.stringify(v);
function body(payload: string): any {
  if (!payload) return {};
  try { const b = JSON.parse(payload); return b && typeof b === 'object' ? b : {}; } catch { return fail('Body is not valid JSON', CODES.INVALID); }
}
/** Plain one-line text: no control characters, collapsed spaces, at most `max` characters. */
function cleanText(v: unknown, max: number): string {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
const age = (v: unknown) => (typeof v === 'string' && AGES.indexOf(v) >= 0 ? v : undefined);
const grade = (v: unknown) => (typeof v === 'string' && GRADES.indexOf(v) >= 0 ? v : undefined);

function rows(nk: nkruntime.Nakama, sql: string, args: unknown[]): ChangeReq[] {
  return nk.sqlQuery(sql, args).map((r) => JSON.parse(r.v as string) as ChangeReq);
}
function latestFor(nk: nkruntime.Nakama, userId: string): ChangeReq | null {
  return rows(nk, `SELECT value::text AS v FROM storage WHERE collection = $1 AND user_id = $2 AND value->>'userId' = $3 ORDER BY value->>'createdAt' DESC LIMIT 1`, [COLL, SYSTEM_USER, userId])[0] ?? null;
}
function save(nk: nkruntime.Nakama, r: ChangeReq) {
  nk.storageWrite([{ collection: COLL, key: r.id, userId: SYSTEM_USER, value: r, permissionRead: 0, permissionWrite: 0 }]);
}
/** What the kid's phone may see (no admin email). */
function kidView(r: ChangeReq | null) {
  if (!r) return null;
  const v: Record<string, unknown> = { id: r.id, status: r.status, current: r.current, requested: r.requested, reason: r.reason, createdAt: r.createdAt };
  if (r.resolvedAt) v.resolvedAt = r.resolvedAt;
  if (r.note) v.note = r.note;
  return v;
}
function kidName(nk: nkruntime.Nakama, userId: string, sent: unknown): string {
  const u = nk.usersGetId([userId])[0];
  const fromClient = String(sent == null ? '' : sent).replace(/[^A-Za-z0-9 àâäçéèêëîïôöùûüÿñæœÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸÑÆŒòÒ]/g, '').trim().slice(0, 24);
  return (u && u.displayName) || fromClient || (u && u.username) || 'Jwè';
}

// ---------- kid RPCs (device session) ----------

/** Body: { age?, grade?, reason?, current?: { age, grade }, name? } → { request }. */
export const changeRequestSubmit: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  const b = body(payload);
  const cur = { age: age(b.current && b.current.age) ?? null, grade: grade(b.current && b.current.grade) ?? null };
  if (b.age != null && !age(b.age)) fail('bad age band', CODES.INVALID);
  if (b.grade != null && !grade(b.grade)) fail('bad grade', CODES.INVALID);
  const requested: { age?: string; grade?: string } = {};
  if (b.age != null && b.age !== cur.age) requested.age = b.age;
  if (b.grade != null && b.grade !== cur.grade) requested.grade = b.grade;
  if (!requested.age && !requested.grade) fail('nothing_to_change', CODES.INVALID);

  const last = latestFor(nk, ctx.userId);
  if (last && last.status === 'pending') fail('pending_exists', CODES.EXISTS);
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const today = Number(nk.sqlQuery(`SELECT count(*) AS n FROM storage WHERE collection = $1 AND user_id = $2 AND value->>'userId' = $3 AND value->>'createdAt' > $4`, [COLL, SYSTEM_USER, ctx.userId, since])[0]?.n ?? 0);
  if (today >= MAX_PER_DAY) fail('rate_limited', CODES.LIMIT);

  const r: ChangeReq = {
    id: nk.uuidv4(), userId: ctx.userId, username: kidName(nk, ctx.userId, b.name),
    current: cur, requested, reason: cleanText(b.reason, REASON_MAX), status: 'pending', createdAt: now(),
  };
  save(nk, r);
  logger.info('change request %s from %s', r.id, ctx.userId);
  return out({ request: kidView(r) });
};

/** Body: {} → { request } (the kid's latest request, or null). */
export const changeRequestStatus: nkruntime.RpcFunction = (ctx, logger, nk) => {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  return out({ request: kidView(latestFor(nk, ctx.userId)) });
};

// ---------- admin RPCs (Bearer token of an admin account) ----------

/** Body: { status?: 'pending' | 'approved' | 'refused' | 'all' } → { requests, pending } (newest first, max 200). */
export const adminChangeRequests = rpc((ctx, nk, b) => {
  const st = ['pending', 'approved', 'refused'].indexOf(b.status) >= 0 ? (b.status as ReqStatus) : null;
  const requests = st
    ? rows(nk, `SELECT value::text AS v FROM storage WHERE collection = $1 AND user_id = $2 AND value->>'status' = $3 ORDER BY value->>'createdAt' DESC LIMIT 200`, [COLL, SYSTEM_USER, st])
    : rows(nk, `SELECT value::text AS v FROM storage WHERE collection = $1 AND user_id = $2 ORDER BY value->>'createdAt' DESC LIMIT 200`, [COLL, SYSTEM_USER]);
  const pending = Number(nk.sqlQuery(`SELECT count(*) AS n FROM storage WHERE collection = $1 AND user_id = $2 AND value->>'status' = 'pending'`, [COLL, SYSTEM_USER])[0]?.n ?? 0);
  return { requests, pending };
});

/**
 * Body: { id, approve: boolean, note? } → { request }.
 * Approving also updates the kid's server-side settings (age used for duel matching, see online_set in main.ts).
 */
export const adminChangeRequestResolve = rpc((ctx, nk, b, email) => {
  const id = String(b.id ?? '');
  if (!/^[0-9a-f-]{36}$/.test(id)) fail('id required', CODES.INVALID);
  if (typeof b.approve !== 'boolean') fail('approve must be true or false', CODES.INVALID);
  const o = nk.storageRead([{ collection: COLL, key: id, userId: SYSTEM_USER }])[0];
  if (!o) fail('request not found', CODES.NOT_FOUND);
  const r = o.value as ChangeReq;
  if (r.status !== 'pending') fail('Demann sa a deja regle.', CODES.INVALID);
  r.status = b.approve ? 'approved' : 'refused';
  r.resolvedAt = now();
  r.resolvedBy = email;
  const note = cleanText(b.note, REASON_MAX);
  if (note) r.note = note;
  if (b.approve) {
    const prev = (nk.storageRead([{ collection: 'settings', key: 'kid', userId: r.userId }])[0]?.value ?? {}) as Record<string, unknown>;
    const next: Record<string, unknown> = { ...prev, updatedAt: r.resolvedAt };
    if (r.requested.age) next.age = r.requested.age;
    if (r.requested.grade) next.grade = r.requested.grade;
    if (!('randomDuelsAllowed' in next)) next.randomDuelsAllowed = false;
    nk.storageWrite([{ collection: 'settings', key: 'kid', userId: r.userId, value: next, permissionRead: 1, permissionWrite: 0 }]);
  }
  save(nk, r);
  audit(nk, email, b.approve ? 'request:approve' : 'request:refuse', r.username + ' · ' + [r.requested.age, r.requested.grade].filter(Boolean).join(' / '));
  return { request: r };
});
