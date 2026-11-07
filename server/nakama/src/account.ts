/// <reference types="nakama-runtime" />
/**
 * Kid accounts without sign-up: cloud save + recovery code (+ optional Google link, see docs/GOOGLE-SIGNIN.md).
 *
 * Every phone has an anonymous device account (apps/mobile/src/lib/online.ts). This file adds:
 *  - a cloud save of the kid's progress under that account (`save_put` / `save_get`), merged part by part with
 *    @konesans/core `mergePart` (newest part wins, earned things — XP, trophies, cards, lessons… — never go down);
 *  - a short readable recovery code per account ("MANGO-4821"), issued on the first sync (`account_info`);
 *  - `account_recover`: a new phone types the code → that account gets this phone's new device id linked, so the
 *    phone logs into the kid's account from then on, and gets the save back. 5 wrong codes per hour per phone,
 *    30 per hour per network address, 600 per hour for the whole server.
 *
 * Storage:
 *   cloud/save           (user)   CloudSave — owner can read, only the server writes
 *   account/code         (user)   { code, at }
 *   account/tries        (user)   { t: number[] } wrong recovery codes typed on this phone (last hour)
 *   recovery/<CODE>      (system) { userId, at } — the code index (unique: written with version '*')
 *   recovery_ip/<ip>     (system) { t: number[] }  ('_all' = every wrong try, for the server-wide brake)
 * Kid-safe: no personal data. The username in a save must be one of the generated ones (core isValidUsername).
 * Contract: docs/API.md ("Accounts: cloud save + recovery code").
 */
import {
  mergePart, stableJson, savePreview, makeRecoveryCode, normalizeRecoveryCode, isValidUsername, generateUsername,
  SAVE_PARTS, SAVE_MAX_BYTES, type CloudSave, type SavePart, type SavePartRec,
} from '@konesans/core';
import { SYSTEM_USER, fail } from './admin';

const CODES = { INVALID: 3, NOT_FOUND: 5, EXISTS: 6, LIMIT: 8, UNAUTH: 16 } as const;
const C = { SAVE: 'cloud', ACCOUNT: 'account', INDEX: 'recovery', IP: 'recovery_ip' } as const;
const HOUR = 3600 * 1000;
const TRIES_PER_DEVICE = 5;
const TRIES_PER_IP = 30;
/** All phones together: a brake on mass guessing with throw-away device accounts (codes are short on purpose). */
const TRIES_GLOBAL = 600;
/** Stored save cap (a little over one upload: merged data can be slightly bigger). */
const STORED_MAX_BYTES = 900 * 1024;
const PROFILE_KEYS = ['id', 'username', 'age', 'lang', 'avatarColor', 'avatar', 'createdAt', 'grade'];

const out = (v: unknown) => JSON.stringify(v);
function body(payload: string): any {
  if (!payload) return {};
  if (payload.length > SAVE_MAX_BYTES + 4096) fail('too_big', CODES.INVALID);
  try { const b = JSON.parse(payload); return b && typeof b === 'object' ? b : {}; } catch { return fail('Body is not valid JSON', CODES.INVALID); }
}
const isObj = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
const isPart = (k: string): k is SavePart => (SAVE_PARTS as readonly string[]).indexOf(k) >= 0;

// ---------- storage helpers ----------
function readSave(nk: nkruntime.Nakama, userId: string): CloudSave | null {
  const o = nk.storageRead([{ collection: C.SAVE, key: 'save', userId }])[0];
  return o && isObj(o.value) && isObj(o.value.parts) ? (o.value as CloudSave) : null;
}
function writeSave(nk: nkruntime.Nakama, userId: string, s: CloudSave) {
  if (JSON.stringify(s).length > STORED_MAX_BYTES) fail('too_big', CODES.INVALID);
  nk.storageWrite([{ collection: C.SAVE, key: 'save', userId, value: s, permissionRead: 1, permissionWrite: 0 }]);
}

/** The account's recovery code; made (unique) on first call. */
export function ensureCode(nk: nkruntime.Nakama, logger: nkruntime.Logger, userId: string): string {
  const mine = nk.storageRead([{ collection: C.ACCOUNT, key: 'code', userId }])[0];
  if (mine && mine.value && typeof mine.value.code === 'string') return mine.value.code;
  for (let i = 0; i < 12; i++) {
    const code = makeRecoveryCode(Math.random);
    try {
      // version '*' = only if this code is not taken yet (unique across all accounts)
      nk.storageWrite([{ collection: C.INDEX, key: code, userId: SYSTEM_USER, value: { userId, at: new Date().toISOString() }, version: '*', permissionRead: 0, permissionWrite: 0 }]);
    } catch (e) { continue; }
    nk.storageWrite([{ collection: C.ACCOUNT, key: 'code', userId, value: { code, at: new Date().toISOString() }, permissionRead: 1, permissionWrite: 0 }]);
    logger.info('recovery code issued for %s', userId);
    return code;
  }
  return fail('could not make a code', 13);
}

function codeOwner(nk: nkruntime.Nakama, code: string): string | null {
  const o = nk.storageRead([{ collection: C.INDEX, key: code, userId: SYSTEM_USER }])[0];
  return o && o.value && typeof o.value.userId === 'string' ? o.value.userId : null;
}

/** Wrong-try timestamps of the last hour at (collection, key, owner). */
function recentTries(nk: nkruntime.Nakama, collection: string, key: string, userId: string): number[] {
  const o = nk.storageRead([{ collection, key, userId }])[0];
  const since = Date.now() - HOUR;
  const t: number[] = o && o.value && Array.isArray(o.value.t) ? o.value.t : [];
  return t.filter((x) => typeof x === 'number' && x > since);
}
function noteTry(nk: nkruntime.Nakama, collection: string, key: string, userId: string, keep = 50) {
  const t = recentTries(nk, collection, key, userId).concat([Date.now()]).slice(-keep);
  nk.storageWrite([{ collection, key, userId, value: { t }, permissionRead: 0, permissionWrite: 0 }]);
}
const ipKey = (ctx: nkruntime.Context) => String(ctx.clientIp || 'unknown').replace(/[^0-9A-Za-z.:]/g, '').slice(0, 64) || 'unknown';

// ---------- validation ----------
/** Profile part: only known fields; the username must be a generated one (never typed by a kid). */
function cleanProfile(d: Record<string, any>): Record<string, any> {
  const p: Record<string, any> = {};
  for (let i = 0; i < PROFILE_KEYS.length; i++) if (d[PROFILE_KEYS[i]] !== undefined) p[PROFILE_KEYS[i]] = d[PROFILE_KEYS[i]];
  if (typeof p.username !== 'string' || !isValidUsername(p.username)) p.username = generateUsername(Date.now());
  if (p.avatar !== undefined && (!isObj(p.avatar) || JSON.stringify(p.avatar).length > 400)) delete p.avatar;
  return p;
}
function cleanParts(raw: unknown): Partial<Record<SavePart, SavePartRec>> {
  const parts: Partial<Record<SavePart, SavePartRec>> = {};
  if (!isObj(raw)) return parts;
  const now = Date.now();
  for (const k in raw) {
    if (!isPart(k)) fail('unknown part ' + String(k).slice(0, 20), CODES.INVALID);
    const r = raw[k];
    if (!isObj(r) || !isObj(r.data) || typeof r.at !== 'number' || !isFinite(r.at)) fail('bad part ' + k, CODES.INVALID);
    // a phone clock in the future must not win every merge from now on
    parts[k] = { at: Math.max(0, Math.min(r.at, now)), data: k === 'profile' ? cleanProfile(r.data) : r.data };
  }
  return parts;
}

// ---------- RPCs (kid device session) ----------

/**
 * Upload changed parts of the save. Body: { profileId, parts: { <part>: { at, data } }, have?: { <part>: at }, force? }.
 * → { ok, updatedAt, code, pull: { <part>: { at, data } } } — `pull` = parts where the server has more than the phone
 *   (merged data that differs from what was sent, or a newer part the phone didn't send: `have[part]` < its `at`).
 * → { conflict: true, profileId, updatedAt, code } when the account holds another kid's save (another phone chose to
 *   keep its own progress on this account) and `force` is not set: nothing is written, the phone should take the save.
 * `force: true` (the phone was reset, or the kid chose this phone's progress): replaces the whole save.
 */
export const savePut: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  const b = body(payload);
  const profileId = typeof b.profileId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(b.profileId) ? b.profileId : fail('profileId required', CODES.INVALID);
  const parts = cleanParts(b.parts);
  const sent: Record<string, any> = isObj(b.parts) ? b.parts : {};
  const have = isObj(b.have) ? b.have : {};
  const code = ensureCode(nk, logger, ctx.userId);
  const stored = readSave(nk, ctx.userId);
  if (stored && stored.profileId !== profileId && !b.force) return out({ conflict: true, profileId: stored.profileId, updatedAt: stored.updatedAt, code });

  const base: CloudSave = stored && !b.force ? stored : { v: 1, profileId, updatedAt: 0, parts: {} };
  const pull: Partial<Record<SavePart, SavePartRec>> = {};
  let changed = !stored || !!b.force;
  for (let i = 0; i < SAVE_PARTS.length; i++) {
    const k = SAVE_PARTS[i];
    const mine = parts[k], theirs = base.parts[k];
    if (mine) {
      const m = mergePart(k, theirs, mine)!;
      if (!theirs || stableJson(m) !== stableJson(theirs)) { base.parts[k] = m; changed = true; }
      if (stableJson(m.data) !== stableJson(sent[k].data)) pull[k] = m; // compare with what the phone sent (before cleaning)
    } else if (theirs && (typeof have[k] !== 'number' || have[k] < theirs.at)) pull[k] = theirs;
  }
  if (changed) {
    base.profileId = profileId;
    base.updatedAt = Date.now();
    writeSave(nk, ctx.userId, base);
  }
  return out({ ok: true, updatedAt: base.updatedAt, code, pull });
};

/** Body: {} → { save: CloudSave | null, code }. */
export const saveGet: nkruntime.RpcFunction = (ctx, logger, nk) => {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  return out({ save: readSave(nk, ctx.userId), code: ensureCode(nk, logger, ctx.userId) });
};

/** Body: {} → { code, google: boolean (a Google account is linked), hasSave, updatedAt }. */
export const accountInfo: nkruntime.RpcFunction = (ctx, logger, nk) => {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  const s = readSave(nk, ctx.userId);
  const a = nk.accountGetId(ctx.userId);
  return out({ code: ensureCode(nk, logger, ctx.userId), google: !!(a && a.user && a.user.googleId), hasSave: !!s, updatedAt: s ? s.updatedAt : null });
};

/**
 * A new phone types a recovery code. Body: { code, preview?: true, deviceId? }.
 *  - preview: → { preview: { username, avatar, xp, cards, badges, lessons, updatedAt } | null, hasSave } (nothing changes)
 *  - else (deviceId = a fresh 'kns-' + 32 hex id made by the phone): links that device id to the code's account, so the
 *    phone authenticates as that account from now on → { ok, save, code }.
 * Errors: 404 bad_code (counts as a wrong try), 429 rate_limited (5 wrong per hour per phone, 30 per network address, 600 in all),
 *         409 same_account (the code is this phone's own), 400 bad deviceId.
 */
export const accountRecover: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  if (!ctx.userId) fail('login required', CODES.UNAUTH);
  const b = body(payload);
  const ip = ipKey(ctx);
  if (recentTries(nk, C.ACCOUNT, 'tries', ctx.userId).length >= TRIES_PER_DEVICE || recentTries(nk, C.IP, ip, SYSTEM_USER).length >= TRIES_PER_IP
    || recentTries(nk, C.IP, '_all', SYSTEM_USER).length >= TRIES_GLOBAL) fail('rate_limited', CODES.LIMIT);
  const code = normalizeRecoveryCode(String(b.code == null ? '' : b.code));
  const owner = code ? codeOwner(nk, code) : null;
  if (!code || !owner) {
    noteTry(nk, C.ACCOUNT, 'tries', ctx.userId);
    noteTry(nk, C.IP, ip, SYSTEM_USER);
    noteTry(nk, C.IP, '_all', SYSTEM_USER, TRIES_GLOBAL + 10);
    logger.info('wrong recovery code from %s', ctx.userId);
    return fail('bad_code', CODES.NOT_FOUND);
  }
  if (owner === ctx.userId) fail('same_account', CODES.EXISTS);
  const save = readSave(nk, owner);
  if (b.preview) return out({ preview: savePreview(save), hasSave: !!save });
  const deviceId = typeof b.deviceId === 'string' && /^kns-[0-9a-f]{32}$/.test(b.deviceId) ? b.deviceId : fail('bad deviceId', CODES.INVALID);
  try { nk.linkDevice(owner, deviceId); } catch (e) { fail('device already linked', CODES.EXISTS); }
  logger.info('account %s recovered on a new device (from %s)', owner, ctx.userId);
  return out({ ok: true, save, code });
};
