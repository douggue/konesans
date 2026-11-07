/**
 * Cloud save + recovery code (server: server/nakama/src/account.ts, merge rules: @konesans/core sync/save.ts).
 *
 * - The kid's progress (main store, Kat Ewo, Vwayaj, prefs — not the downloaded content) is saved on the server under
 *   this phone's anonymous account, part by part, only the parts that changed: 20 s after the last change (at most
 *   2 min while playing non-stop) and when the app goes to the background. Offline-first: failures are silent and
 *   retried later; the phone never waits for the server.
 * - The server answers with the parts where it knows more (another phone on the same account): they are merged in.
 * - The first sync gives the account its recovery code ("MANGO-4821"). On a new phone, `recoverWithCode` links this
 *   phone to the kid's account and brings the save back.
 * Nothing here needs a native module (ships over the air).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import {
  SAVE_PARTS, SAVE_MAX_BYTES, mergePart, stableJson, hashText, trimProgress, savePreview, normalizeRecoveryCode, localDay,
  emptyProgress, emptyCourseProgress, emptyMissionLog, emptyVwayaj, DEFAULT_SETTINGS,
  type CloudSave, type SavePart, type SaveParts, type SavePreview,
} from '@konesans/core';
import { useStore, KID_TZ, onResetAll } from './store';
import { useCards } from './cards';
import { useVwayaj } from './vwayaj';
import { usePrefs } from './prefs';
import { callRpc, onlineFailure, newDeviceId, switchDevice } from './online';
import { serverConfigured } from './remote';

const DEBOUNCE_MS = 20_000;
const MAX_WAIT_MS = 120_000;
/** With nothing new to send, still ask the server now and then (another phone on the account may have played). */
const PULL_EVERY_MS = 30 * 60_000;

type Status = 'idle' | 'ok' | 'offline' | 'error' | 'too_big';
interface CloudMeta {
  /** per part: what this phone and the server last agreed on (hash of the data + its `at`) */
  synced: Partial<Record<SavePart, { h: string; at: number }>>;
  /** local changes not uploaded yet: when the part last changed */
  changedAt: Partial<Record<SavePart, number>>;
  /** the kid (profile id) whose save this phone last synced; another id here means the phone was reset */
  profileId: string | null;
  /** this account's recovery code, once the server gave one */
  code: string | null;
  /** a Google account is linked to this account (server says so) */
  google: boolean;
  /** last successful sync (ms) */
  lastSync: number;
  status: Status;
  /** local days the kid earned XP (the Google offer waits for 3) */
  playDays: string[];
  /** last time the "save with Google" card was closed (ms) */
  offerClosedAt: number;
  /** "Rekòmanse a zewo" was used: the next upload replaces the account's save whole (never merges the old kid back) */
  forceNext?: boolean;
}
const emptyMeta = (): CloudMeta => ({ synced: {}, changedAt: {}, profileId: null, code: null, google: false, lastSync: 0, status: 'idle', playDays: [], offerClosedAt: 0, forceNext: false });

export const useCloud = create<CloudMeta>()(persist(() => emptyMeta(), { name: 'konesans-cloud', storage: createJSONStorage(() => AsyncStorage), version: 1 }));

/**
 * "Rekòmanse a zewo": forget what this phone synced (the new kid's parts are all "changed") and replace the
 * account's save on the next upload. The account link (code, Google, device) stays: it is the same phone.
 */
onResetAll('cloud', () => {
  if (timer) { clearTimeout(timer); timer = null; firstPendingAt = 0; }
  for (const k of Object.keys(changed)) delete changed[k as SavePart];
  useCloud.setState({ synced: {}, changedAt: {}, status: 'idle', playDays: [], offerClosedAt: 0, forceNext: true });
});

// ---------- reading / writing the stores ----------

type Data = Record<string, any>;
/** The save parts as they are on this phone now. */
export function readParts(): Record<SavePart, Data> {
  const s = useStore.getState(), c = useCards.getState(), v = useVwayaj.getState(), p = usePrefs.getState();
  return {
    profile: s.profile, progress: trimProgress(s.progress), courses: s.courses, stats: s.stats, missions: s.missions ?? emptyMissionLog(),
    settings: s.settings, kidSettings: s.kidSettings, coding: s.coding,
    extra: { rankSeen: s.rankSeen, unlocked: s.unlocked ?? [], seenUnlocks: s.seenUnlocks ?? [], bought: s.bought ?? [], onboarded: s.onboarded, courseLang: s.courseLang, peyi: s.peyi },
    cards: { owned: c.owned, fresh: c.fresh, read: c.read },
    vwayaj: { done: v.done, best: v.best, eventsPlayed: v.eventsPlayed, selected: v.selected },
    prefs: { difficulty: p.difficulty },
  };
}
const hashOf = (d: unknown) => hashText(stableJson(d));

let applying = false;
/** Put parts into the stores. `replace`: the phone becomes exactly this save (restore); otherwise merge into local. */
function writeParts(parts: SaveParts, replace: boolean) {
  applying = true;
  try {
    if (replace) {
      useStore.getState().resetAll();
      useCards.getState().reset();
      useVwayaj.getState().reset();
    }
    const local = readParts();
    const meta = useCloud.getState();
    const val = (k: SavePart): Data | undefined => {
      const r = parts[k];
      if (!r) return undefined;
      if (replace) return r.data;
      return mergePart(k, { at: meta.changedAt[k] ?? meta.synced[k]?.at ?? 0, data: local[k] }, r)!.data;
    };
    const s = useStore.getState();
    const main: Data = {};
    const pr = val('profile'); if (pr) main.profile = { ...s.profile, ...pr };
    const pg = val('progress'); if (pg) main.progress = { ...emptyProgress(), ...pg };
    const co = val('courses'); if (co) main.courses = { en: emptyCourseProgress(), es: emptyCourseProgress(), ...co };
    const st = val('stats'); if (st) main.stats = { ...s.stats, ...st, perCategoryCorrect: { ...(st.perCategoryCorrect ?? {}) } };
    const mi = val('missions'); if (mi) main.missions = { ...emptyMissionLog(), ...mi };
    const se = val('settings'); if (se) main.settings = { ...s.settings, ...se };
    const ks = val('kidSettings'); if (ks) main.kidSettings = { ...DEFAULT_SETTINGS, ...ks };
    const cd = val('coding'); if (cd) main.coding = cd;
    const ex = val('extra');
    if (ex) for (const k of ['rankSeen', 'unlocked', 'seenUnlocks', 'bought', 'onboarded', 'courseLang', 'peyi'] as const) if (ex[k] !== undefined) main[k] = ex[k];
    if (replace) Object.assign(main, { onboarded: true, changeReq: null, newBadges: [], badgeQueue: [], seen: [], recentPeyi: [] });
    useStore.setState(main as never);
    const ca = val('cards'); if (ca) useCards.setState({ owned: ca.owned ?? [], fresh: ca.fresh ?? [], read: ca.read ?? [], ...(replace ? { draws: {} } : {}) });
    const vw = val('vwayaj'); if (vw) useVwayaj.setState({ ...(replace ? emptyVwayaj() : {}), done: vw.done ?? {}, best: vw.best ?? {}, eventsPlayed: vw.eventsPlayed ?? [], ...(vw.selected !== undefined ? { selected: vw.selected } : {}) });
    const pf = val('prefs'); if (pf && (pf.difficulty === 1 || pf.difficulty === 2 || pf.difficulty === 3)) usePrefs.setState({ difficulty: pf.difficulty });

    // remember what the server holds: a part equal to the server's is in sync, one that kept local changes is not
    const now = readParts();
    const synced = { ...(replace ? {} : meta.synced) };
    const changedAt = { ...(replace ? {} : meta.changedAt) };
    for (const k of SAVE_PARTS) {
      const r = parts[k];
      if (!r) continue;
      const same = replace || stableJson(val(k)) === stableJson(r.data);
      synced[k] = { h: same ? hashOf(now[k]) : 'server:' + hashOf(r.data), at: r.at };
      if (same) delete changedAt[k]; else changedAt[k] = Date.now();
    }
    // a restore is not a reset: the phone now equals the account's save, nothing to force
    useCloud.setState({ synced, changedAt, ...(replace ? { forceNext: false } : {}) });
  } finally { applying = false; }
}

// ---------- sync ----------

let started = false, busy = false, firstDone = false;
let timer: ReturnType<typeof setTimeout> | null = null, firstPendingAt = 0, retryMs = 60_000;
const changed: Partial<Record<SavePart, number>> = {};

function mark(k: SavePart) { if (!applying) { changed[k] = Date.now(); schedule(); } }
function schedule(ms?: number) {
  if (!firstPendingAt) firstPendingAt = Date.now();
  if (timer) clearTimeout(timer);
  const wait = ms ?? Math.max(0, Math.min(DEBOUNCE_MS, firstPendingAt + MAX_WAIT_MS - Date.now()));
  timer = setTimeout(() => { timer = null; firstPendingAt = 0; syncNow().catch(() => {}); }, wait);
}

interface PutResult { ok?: boolean; conflict?: boolean; profileId?: string; updatedAt: number; code: string; pull?: SaveParts }

/**
 * Upload what changed and take what the server knows more. Never throws; returns true when the phone and the server
 * agree. `force`: replace the account's save with this phone's (the kid chose this phone's progress). `pull`: ask the
 * server even when nothing changed here.
 */
export async function syncNow(opts: { force?: boolean; pull?: boolean } = {}): Promise<boolean> {
  if (!serverConfigured() || !allHydrated() || !useStore.getState().onboarded) return false;
  if (busy) { schedule(5_000); return false; } // one at a time; look again right after
  busy = true;
  try {
    // changes seen while the app ran go into the persisted list (so a failed upload keeps their time)
    const meta0 = useCloud.getState();
    if (Object.keys(changed).length) { useCloud.setState({ changedAt: { ...meta0.changedAt, ...changed } }); for (const k of Object.keys(changed)) delete changed[k as SavePart]; }
    const meta = useCloud.getState();
    const local = readParts();
    const profileId: string = local.profile.id;
    // a reset made a new kid on this phone: replace the account's save (forceNext also covers a reset before the first sync)
    const force = !!opts.force || !!meta.forceNext || (!!meta.profileId && meta.profileId !== profileId);
    const send: SaveParts = {}; const hashes: Partial<Record<SavePart, string>> = {};
    for (const k of SAVE_PARTS) {
      const h = (hashes[k] = hashOf(local[k]));
      if (force || meta.synced[k]?.h !== h) send[k] = { at: meta.changedAt[k] ?? Date.now(), data: local[k] };
    }
    if (!Object.keys(send).length && firstDone && !opts.pull && Date.now() - meta.lastSync < PULL_EVERY_MS) { useCloud.setState({ status: 'ok', changedAt: {} }); return true; }
    const body = { profileId, parts: send, have: force ? {} : Object.fromEntries(Object.entries(meta.synced).map(([k, v]) => [k, v!.at])), ...(force ? { force: true } : {}) };
    if (JSON.stringify(body).length > SAVE_MAX_BYTES) { useCloud.setState({ status: 'too_big' }); return false; }

    const r = await callRpc<PutResult>('save_put', body);
    if (r.conflict) {
      // another phone chose its own progress for this account: this phone takes the account's save
      const g = await callRpc<{ save: CloudSave | null; code: string }>('save_get', {});
      if (g.save) writeParts(g.save.parts, true);
      useCloud.setState({ profileId: g.save?.profileId ?? profileId, code: g.code, lastSync: Date.now(), status: 'ok', forceNext: false });
      firstDone = true; retryMs = 60_000;
      return true;
    }
    // the parts sent are in sync, unless the kid changed them again while we were waiting
    const after = readParts();
    const m = useCloud.getState();
    const synced = { ...m.synced }; const changedAt = { ...m.changedAt };
    for (const k of Object.keys(send) as SavePart[]) {
      synced[k] = { h: hashes[k]!, at: send[k]!.at };
      if (hashOf(after[k]) === hashes[k] && !changed[k]) delete changedAt[k];
    }
    for (const k of SAVE_PARTS) if (!send[k] && synced[k]?.h === hashOf(after[k])) delete changedAt[k];
    useCloud.setState({ synced, changedAt, profileId, code: r.code ?? m.code, lastSync: Date.now(), status: 'ok', ...(force ? { forceNext: false } : {}) });
    if (r.pull && Object.keys(r.pull).length) writeParts(r.pull, false);
    firstDone = true; retryMs = 60_000;
    return true;
  } catch (e) {
    useCloud.setState({ status: onlineFailure(e) ? 'error' : 'offline' });
    schedule(retryMs); retryMs = Math.min(retryMs * 2, 10 * 60_000); // try again later, quietly
    return false;
  } finally { busy = false; }
}

function allHydrated() {
  return [useStore, useCards, useVwayaj, usePrefs, useCloud].every((s) => s.persist.hasHydrated());
}
function whenHydrated(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => { if (allHydrated()) { resolve(); return true; } return false; };
    if (check()) return;
    const offs = [useStore, useCards, useVwayaj, usePrefs, useCloud].map((s) => s.persist.onFinishHydration(() => { if (check()) offs.forEach((o) => o()); }));
  });
}

/** Start watching the stores and syncing (idempotent; call it from any screen). */
export function startCloudSync() {
  if (started) return;
  started = true;
  whenHydrated().then(() => {
    const MAIN: SavePart[] = ['profile', 'progress', 'courses', 'stats', 'missions', 'settings', 'kidSettings', 'coding'];
    useStore.subscribe((s, p) => {
      for (const k of MAIN) if ((s as any)[k] !== (p as any)[k]) mark(k);
      if (s.rankSeen !== p.rankSeen || s.unlocked !== p.unlocked || s.bought !== p.bought || s.seenUnlocks !== p.seenUnlocks || s.onboarded !== p.onboarded || s.courseLang !== p.courseLang || s.peyi !== p.peyi) mark('extra');
      if (!applying && s.progress.xp > p.progress.xp) notePlayDay();
    });
    useCards.subscribe((s, p) => { if (s.owned !== p.owned || s.fresh !== p.fresh || s.read !== p.read) mark('cards'); });
    useVwayaj.subscribe((s, p) => { if (s.done !== p.done || s.best !== p.best || s.eventsPlayed !== p.eventsPlayed || s.selected !== p.selected) mark('vwayaj'); });
    usePrefs.subscribe((s, p) => { if (s.difficulty !== p.difficulty) mark('prefs'); });
    AppState.addEventListener('change', (st) => {
      if (st === 'background' || st === 'inactive') { if (timer) { clearTimeout(timer); timer = null; firstPendingAt = 0; syncNow().catch(() => {}); } }
      else if (st === 'active' && Date.now() - useCloud.getState().lastSync > PULL_EVERY_MS) schedule(2_000);
    });
    schedule(3_000); // first sync shortly after start (content download goes first)
  });
}

function notePlayDay() {
  const day = localDay(Date.now(), KID_TZ);
  const days = useCloud.getState().playDays ?? [];
  if (!days.includes(day)) useCloud.setState({ playDays: [...days, day].slice(-10) });
}

// ---------- account info + recovery ----------

/** Ask the server for this account's code (it makes one on the first call) and Google link. Throws when offline. */
export async function fetchAccountInfo(): Promise<{ code: string; google: boolean }> {
  const r = await callRpc<{ code: string; google: boolean }>('account_info', {});
  useCloud.setState({ code: r.code, google: !!r.google });
  return r;
}

export type RecoverError = 'format' | 'bad_code' | 'rate_limited' | 'same_account' | 'offline' | 'server';
export class RecoverFailure extends Error { constructor(public kind: RecoverError) { super(kind); } }
function recoverError(e: unknown): RecoverFailure {
  if (e instanceof RecoverFailure) return e;
  const f = onlineFailure(e);
  if (!f) return new RecoverFailure('offline');
  if (f.status === 429 || /rate_limited/.test(f.message)) return new RecoverFailure('rate_limited');
  if (f.status === 404 || /bad_code/.test(f.message)) return new RecoverFailure('bad_code');
  if (/same_account/.test(f.message)) return new RecoverFailure('same_account');
  return new RecoverFailure('server');
}

/** Whose progress is behind this code (nothing changes yet). Throws RecoverFailure. */
export async function previewCode(input: string): Promise<{ code: string; preview: SavePreview | null }> {
  const code = normalizeRecoveryCode(input);
  if (!code) throw new RecoverFailure('format');
  try {
    const r = await callRpc<{ preview: SavePreview | null }>('account_recover', { code, preview: true });
    return { code, preview: r.preview };
  } catch (e) { throw recoverError(e); }
}

/** Does this phone already hold progress worth asking about before a restore? */
export function localProgress(): SavePreview | null {
  const s = useStore.getState();
  if (!s.onboarded) return null;
  const p = savePreview({ v: 1, profileId: s.profile.id, updatedAt: Date.now(), parts: Object.fromEntries(Object.entries(readParts()).map(([k, d]) => [k, { at: 0, data: d }])) });
  return p && (p.xp > 0 || p.cards > 0 || p.lessons > 0) ? p : null;
}

/**
 * Make this phone the code's account: the server links a new device id to it, the phone logs in with that id from
 * now on, and the save replaces what is on the phone. Throws RecoverFailure.
 */
export async function recoverWithCode(code: string): Promise<SavePreview | null> {
  const dev = newDeviceId();
  let r: { save: CloudSave | null; code: string };
  try { r = await callRpc('account_recover', { code, deviceId: dev }); } catch (e) { throw recoverError(e); }
  await switchDevice(dev);
  return adoptSave(r.save, r.code);
}

/** This phone is now logged into the kid's account: take its save (or, if it has none yet, upload this phone's). */
export async function adoptSave(save: CloudSave | null, code: string | null): Promise<SavePreview | null> {
  if (timer) { clearTimeout(timer); timer = null; firstPendingAt = 0; }
  if (save) writeParts(save.parts, true);
  useCloud.setState({ profileId: save ? save.profileId : null, code, lastSync: save ? Date.now() : 0, status: 'ok', ...(save ? {} : { synced: {}, changedAt: {} }) });
  firstDone = false;
  startCloudSync();
  syncNow().catch(() => {});
  fetchAccountInfo().catch(() => {});
  return savePreview(save);
}
