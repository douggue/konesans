/// <reference types="nakama-runtime" />
/**
 * "Batay ak yon zanmi" — a private duel joined with a 4-digit code.
 * - `friend_duel_create {age}` → { code, matchId, age, expiresAt }: opens a private `duel` match (label
 *   category 'friend', never listed by find_duel, no Robo) with the HOST's age band; the code lives 10 minutes.
 * - `friend_duel_join {code}` → { matchId, age, hostName }: lets this kid into that match (match signal) and
 *   marks the code used. Errors (message): bad_code, code_expired, own_code, host_not_allowed, online_not_allowed, rate_limited.
 * - `friend_duel_status {code}` (host) → { state: 'waiting' | 'joined' | 'expired' }: the host's phone polls it and
 *   goes into the match once the friend is in.
 * - `friend_duel_cancel {code}` (host) → { ok }: frees the code and closes the waiting match.
 * Both kids need the parent's online permission (same consent record as online duels). Rate limits per kid:
 * 6 codes / 10 min, 8 wrong codes / 10 min.
 */
import { SYSTEM_USER } from './admin';

export const FRIEND_CODE_TTL_MS = 10 * 60 * 1000;
const COLL_CODE = 'friend_code';
const COLL_RATE = 'friend_rate';
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CREATES = 6;
const MAX_FAILS = 8;
const AGES = ['6-8', '9-11', '12-14'];
const CODES = { INVALID: 3, NOT_FOUND: 5, LIMIT: 8, DENIED: 7, UNAUTH: 16 };

interface CodeRec { matchId: string; host: string; age: string; createdAt: number; expiresAt: number; usedBy?: string; usedAt?: number }
interface RateRec { creates: number[]; fails: number[]; code?: string }

function fail(message: string, code: number): never { throw { message: message, code: code } as nkruntime.Error; }
function body(payload: string): any {
  try { const b = payload ? JSON.parse(payload) : {}; return b && typeof b === 'object' ? b : {}; } catch (e) { return fail('bad_json', CODES.INVALID); }
}
function online(nk: nkruntime.Nakama, userId: string): boolean {
  const c = nk.storageRead([{ collection: 'consent', key: 'record', userId: userId }])[0];
  return !!(c && c.value && (c.value as any).confirmedAt);
}
function readRate(nk: nkruntime.Nakama, userId: string, now: number): RateRec {
  const r = nk.storageRead([{ collection: COLL_RATE, key: 'r', userId: userId }])[0];
  const v = (r && r.value ? r.value : {}) as any;
  const keep = (a: any) => (Array.isArray(a) ? a.filter((t: number) => typeof t === 'number' && now - t < WINDOW_MS) : []);
  return { creates: keep(v.creates), fails: keep(v.fails), code: typeof v.code === 'string' ? v.code : undefined };
}
function writeRate(nk: nkruntime.Nakama, userId: string, r: RateRec) {
  const value: { [k: string]: any } = { creates: r.creates, fails: r.fails };
  if (r.code) value.code = r.code;
  nk.storageWrite([{ collection: COLL_RATE, key: 'r', userId: userId, value: value, permissionRead: 0, permissionWrite: 0 }]);
}
function readCode(nk: nkruntime.Nakama, code: string): { rec: CodeRec; version: string } | null {
  const r = nk.storageRead([{ collection: COLL_CODE, key: code, userId: SYSTEM_USER }])[0];
  return r && r.value ? { rec: r.value as unknown as CodeRec, version: r.version } : null;
}
function deleteCode(nk: nkruntime.Nakama, code: string) {
  try { nk.storageDelete([{ collection: COLL_CODE, key: code, userId: SYSTEM_USER }]); } catch (e) { /* already gone */ }
}
function signal(nk: nkruntime.Nakama, matchId: string, data: object): string {
  try { return nk.matchSignal(matchId, JSON.stringify(data)) || ''; } catch (e) { return ''; }
}
function blockedPair(nk: nkruntime.Nakama, a: string, b: string): boolean {
  const r = nk.storageRead([{ collection: 'moderation', key: 'state', userId: SYSTEM_USER }])[0];
  const blocked = (r && r.value && (r.value as any).blocked) || {};
  return (Array.isArray(blocked[a]) && blocked[a].indexOf(b) >= 0) || (Array.isArray(blocked[b]) && blocked[b].indexOf(a) >= 0);
}
const validCode = (c: unknown): c is string => typeof c === 'string' && /^[0-9]{4}$/.test(c);

export function friendDuelCreate(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  const b = body(payload);
  const age = AGES.indexOf(b.age) >= 0 ? b.age : '9-11';
  if (!online(nk, ctx.userId)) fail('online_not_allowed', CODES.DENIED);
  const now = Date.now();
  const rate = readRate(nk, ctx.userId, now);
  if (rate.creates.length >= MAX_CREATES) fail('rate_limited', CODES.LIMIT);
  // one waiting code per kid: a new one replaces the last
  if (rate.code) {
    const old = readCode(nk, rate.code);
    if (old && old.rec.host === ctx.userId && !old.rec.usedBy) { deleteCode(nk, rate.code); signal(nk, old.rec.matchId, { cancel: true }); }
  }
  const expiresAt = now + FRIEND_CODE_TTL_MS;
  const matchId = nk.matchCreate('duel', { age: age, category: 'mix', creator: ctx.userId, private: true });
  let code = '';
  for (let i = 0; i < 40 && !code; i++) {
    const c = String(1000 + Math.floor(Math.random() * 9000));
    const cur = readCode(nk, c);
    if (cur && cur.rec.expiresAt > now) continue; // in use
    const rec: CodeRec = { matchId: matchId, host: ctx.userId, age: age, createdAt: now, expiresAt: expiresAt };
    try {
      // version '*' = only if it doesn't exist; an expired one is replaced at its own version (two phones can't take one code)
      nk.storageWrite([{ collection: COLL_CODE, key: c, userId: SYSTEM_USER, value: rec as unknown as { [k: string]: any }, version: cur ? cur.version : '*', permissionRead: 0, permissionWrite: 0 }]);
      code = c;
    } catch (e) { /* taken at the same moment: next */ }
  }
  if (!code) { signal(nk, matchId, { cancel: true }); fail('no_code', CODES.LIMIT); }
  rate.creates.push(now); rate.code = code;
  writeRate(nk, ctx.userId, rate);
  logger.info('friend duel %s code=%s host=%s age=%s', matchId, code, ctx.userId, age);
  return JSON.stringify({ code: code, matchId: matchId, age: age, expiresAt: expiresAt });
}

export function friendDuelJoin(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  const b = body(payload);
  if (!online(nk, ctx.userId)) fail('online_not_allowed', CODES.DENIED);
  const now = Date.now();
  const rate = readRate(nk, ctx.userId, now);
  if (rate.fails.length >= MAX_FAILS) fail('rate_limited', CODES.LIMIT);
  const wrong = (msg: string): never => { rate.fails.push(now); writeRate(nk, ctx.userId, rate); return fail(msg, CODES.NOT_FOUND); };
  const code = typeof b.code === 'number' ? String(b.code) : String(b.code || '').replace(/\s/g, '');
  if (!validCode(code)) return wrong('bad_code');
  const found = readCode(nk, code);
  if (!found) return wrong('bad_code');
  const rec = found.rec;
  if (rec.host === ctx.userId) fail('own_code', CODES.INVALID);
  if (rec.usedBy || rec.expiresAt <= now) return wrong('code_expired');
  if (blockedPair(nk, rec.host, ctx.userId)) return wrong('bad_code');
  if (!online(nk, rec.host)) fail('host_not_allowed', CODES.DENIED);
  // let this kid into the private match (the match refuses anybody else)
  if (signal(nk, rec.matchId, { allow: ctx.userId }) !== 'ok') return wrong('code_expired');
  try {
    nk.storageWrite([{ collection: COLL_CODE, key: code, userId: SYSTEM_USER, value: { ...rec, usedBy: ctx.userId, usedAt: now } as unknown as { [k: string]: any }, version: found.version, permissionRead: 0, permissionWrite: 0 }]);
  } catch (e) { return wrong('code_expired'); } // another kid used it at the same moment
  const host = nk.usersGetId([rec.host])[0];
  logger.info('friend duel %s joined by %s', rec.matchId, ctx.userId);
  return JSON.stringify({ matchId: rec.matchId, age: rec.age, hostName: (host && (host.displayName || host.username)) || '' });
}

export function friendDuelStatus(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  const b = body(payload);
  if (!validCode(b.code)) fail('bad_code', CODES.INVALID);
  const found = readCode(nk, b.code);
  if (!found || found.rec.host !== ctx.userId) return JSON.stringify({ state: 'expired' });
  if (found.rec.usedBy) return JSON.stringify({ state: 'joined', matchId: found.rec.matchId });
  return JSON.stringify({ state: found.rec.expiresAt > Date.now() ? 'waiting' : 'expired', expiresAt: found.rec.expiresAt });
}

export function friendDuelCancel(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  const b = body(payload);
  if (!validCode(b.code)) fail('bad_code', CODES.INVALID);
  const found = readCode(nk, b.code);
  if (found && found.rec.host === ctx.userId && !found.rec.usedBy) { deleteCode(nk, b.code); signal(nk, found.rec.matchId, { cancel: true }); }
  return JSON.stringify({ ok: true });
}
