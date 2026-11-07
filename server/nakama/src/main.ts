/// <reference types="nakama-runtime" />
/**
 * Konesans Nakama module (TypeScript runtime).
 * - RPC `find_duel`: matchmaking by age band + category, bot fallback after 10s.
 * - Match handler `duel`: authoritative loop driven by @konesans/core `reduce`.
 * - RPC `sync_progress`: idempotent event-log upload, server folds progress.
 * - RPC `consent_confirm`: parent clicked the confirmation link.
 * - Admin + content RPCs: see admin.ts and docs/API.md.
 * - Age / class change requests (kid asks, admin approves): requests.ts.
 * Clients never see the answer key during a question (see core `publicView`).
 */
import {
  createDuel, reduce, publicView, selectQuestions, SAMPLE_QUESTIONS, planBotAnswer, BOT_PROFILES, BOT_NAMES,
  rng, ratingDelta, mergeLogs, foldProgress, canMatch, PRESET_REACTIONS,
  type DuelState, type AgeBand, type CategoryId, type SyncEvent,
} from '@konesans/core';
import * as A from './admin';
import * as R from './requests';
import * as K from './account';

const TICK_RATE = 5; // 5 ticks/s is plenty for a quiz
const OP = { STATE: 1, ANSWER: 2, REACT: 3 } as const;
const COLL = { PROGRESS: 'progress', LOG: 'eventlog', CONSENT: 'consent', MOD: 'moderation', RATING: 'rating' } as const;

interface MatchLabel { age: AgeBand; category: CategoryId | 'mix'; open: boolean; creator?: string }
/** "VS" pause on both phones before question 1 (the app's Matchmaking reveal takes ~1.7 s). */
const INTRO_MS = 3000;
interface MatchState { duel: DuelState; botPlan?: { atMs: number; chosen: number }; botId?: string; seed: number; presences: Record<string, nkruntime.Presence> }

// ---------- Match handler ----------

const matchInit: nkruntime.MatchInitFunction<MatchState> = (ctx, logger, nk, params) => {
  const age = (params.age as AgeBand) ?? '9-11';
  const category = (params.category as CategoryId | 'mix') ?? 'mix';
  const seed = Math.floor(Math.random() * 2 ** 31);
  const questions = selectQuestions(loadBank(nk), { age, category, count: 10, seed });
  const duel = createDuel(ctx.matchId, questions, Date.now(), { introMs: INTRO_MS });
  const label: MatchLabel = { age, category, open: true, creator: params.creator ? String(params.creator) : undefined };
  return { state: { duel, seed, presences: {} }, tickRate: TICK_RATE, label: JSON.stringify(label) };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, presence) => {
  if (state.duel.phase !== 'lobby' || state.duel.players.length >= 2) return { state, accept: false, rejectMessage: 'full' };
  return { state, accept: true };
};

const matchJoin: nkruntime.MatchJoinFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, presences) => {
  for (const p of presences) {
    state.presences[p.userId] = p;
    const u = nk.usersGetId([p.userId])[0];
    const username = u?.displayName || u?.username || 'Jwè';
    const avatar = (u?.metadata as { avatar?: unknown } | undefined)?.avatar;
    state.duel = reduce(state.duel, { type: 'join', player: { id: p.userId, username, avatar, isBot: false } }, Date.now());
  }
  if (state.duel.players.length === 2) dispatcher.matchLabelUpdate(JSON.stringify({ ...JSON.parse(ctx.matchLabel ?? '{}'), open: false }));
  broadcast(dispatcher, state);
  return { state };
};

const matchLeave: nkruntime.MatchLeaveFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, presences) => {
  for (const p of presences) {
    delete state.presences[p.userId];
    state.duel = reduce(state.duel, { type: 'leave', playerId: p.userId }, Date.now());
  }
  broadcast(dispatcher, state);
  return { state };
};

const matchLoop: nkruntime.MatchLoopFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, messages) => {
  const now = Date.now();
  let d = state.duel;

  // 1. player messages
  for (const m of messages) {
    const data = safeJson(m.data);
    if (m.opCode === OP.ANSWER && typeof data?.chosen === 'number') d = reduce(d, { type: 'answer', playerId: m.sender.userId, chosen: data.chosen }, now);
    else if (m.opCode === OP.REACT && typeof data?.reaction === 'string') d = reduce(d, { type: 'react', playerId: m.sender.userId, reaction: data.reaction }, now);
  }

  // 2. bot fallback: nobody joined within the lobby timeout → add a bot instead of ending
  if (d.phase === 'lobby' && d.players.length === 1 && now - d.phaseStartedAt >= d.lobbyTimeoutMs - 500 && !state.botId) {
    const rand = rng(state.seed);
    state.botId = 'bot:' + ctx.matchId;
    d = reduce(d, { type: 'join', player: { id: state.botId, username: BOT_NAMES[Math.floor(rand() * BOT_NAMES.length)], isBot: true } }, now);
  }

  // 3. bot answers at its planned time
  if (state.botId && d.phase === 'question') {
    const label = JSON.parse(ctx.matchLabel ?? '{}') as MatchLabel;
    if (!state.botPlan) state.botPlan = planBotAnswer(d, BOT_PROFILES[label.age ?? '9-11'], rng(state.seed + d.index));
    if (now - d.phaseStartedAt >= state.botPlan.atMs) {
      d = reduce(d, { type: 'answer', playerId: state.botId, chosen: state.botPlan.chosen }, now);
    }
  }
  if (d.phase !== 'question') state.botPlan = undefined;

  // 4. timers
  const before = d;
  d = reduce(d, { type: 'tick' }, now);

  const changed = d !== state.duel;
  state.duel = d;
  if (changed) broadcast(dispatcher, state);

  if (d.phase === 'ended' && before.phase !== 'ended') {
    settle(nk, logger, d);
  }
  if (d.phase === 'ended' && now - d.phaseStartedAt > 10_000) return null; // close match
  if (d.phase === 'lobby' && Object.keys(state.presences).length === 0 && !state.botId && tick > TICK_RATE) return null; // everyone left the waiting room
  return { state };
};

const matchTerminate: nkruntime.MatchTerminateFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state) => ({ state });
const matchSignal: nkruntime.MatchSignalFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, data) => ({ state, data });

function broadcast(dispatcher: nkruntime.MatchDispatcher, state: MatchState) {
  // Each player gets their own projection (their own choice visible, opponent's hidden until reveal).
  for (const p of state.duel.players) {
    const pres = state.presences[p.id];
    if (!pres) continue;
    dispatcher.broadcastMessage(OP.STATE, JSON.stringify({ ...publicView(state.duel, p.id), serverNow: Date.now() }), [pres]); // serverNow: phones correct their clock
  }
}

/** Persist results: ratings, XP events, and a match record for the parent report. */
function settle(nk: nkruntime.Nakama, logger: nkruntime.Logger, d: DuelState) {
  const humans = d.players.filter((p) => !p.isBot);
  for (const p of humans) {
    const opp = d.players.find((x) => x.id !== p.id)!;
    const result: 1 | 0.5 | 0 = d.winnerId === null ? 0.5 : d.winnerId === p.id ? 1 : 0;
    if (!opp.isBot) {
      const mine = readRating(nk, p.id), theirs = readRating(nk, opp.id);
      nk.storageWrite([{ collection: COLL.RATING, key: 'elo', userId: p.id, value: { elo: mine + ratingDelta(mine, theirs, result) }, permissionRead: 1, permissionWrite: 0 }]);
    }
    const xp = result === 1 ? 40 : result === 0.5 ? 25 : 15;
    appendEvents(nk, p.id, [{ id: `${d.matchId}:${p.id}:xp`, at: Date.now(), type: 'xp', payload: { amount: xp, matchId: d.matchId } }]);
    logger.info('duel settled %s user=%s result=%s', d.matchId, p.id, result);
  }
}

// ---------- RPCs ----------

/** Find or create an open duel for this kid. Body: { age, category }. Returns { matchId }. */
const rpcFindDuel: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  // waitingIn: the kid is already waiting alone in that game and only wants to know about another waiting game
  const { age = '9-11', category = 'mix', waitingIn } = safeJson(payload) ?? {};
  requireOnlineAllowed(nk, ctx.userId);
  // Tested on Nakama 3.22: quoted values and boolean fields never match in label queries, so we search on
  // age + category and check `open` ourselves below.
  const query = `+label.age:${age} +label.category:${category}`;
  const open = nk.matchList(10, true, undefined, 1, 1, query);
  const mod = readModeration(nk);
  for (const m of open) {
    const label = JSON.parse((m.label as unknown as string) || '{}');
    if (!label.open) continue;
    // the match creator's id is stored in the label by rpc below; skip blocked pairs
    if (label.creator === ctx.userId || m.matchId === waitingIn) continue; // your own waiting game
    if (label.creator && !canMatch(mod, candidate(nk, ctx.userId, age), candidate(nk, label.creator, age))) continue;
    return JSON.stringify({ matchId: m.matchId });
  }
  if (waitingIn) return JSON.stringify({ matchId: null });
  const matchId = nk.matchCreate('duel', { age, category, creator: ctx.userId });
  return JSON.stringify({ matchId });
};

/** Upload the device event log. Body: { events: SyncEvent[] }. Returns { acked: string[], progress }. */
const rpcSyncProgress: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  const { events = [] } = safeJson(payload) ?? {};
  const log = appendEvents(nk, ctx.userId, events as SyncEvent[]);
  const progress = foldProgress(log);
  nk.storageWrite([{ collection: COLL.PROGRESS, key: 'current', userId: ctx.userId, value: progress, permissionRead: 1, permissionWrite: 0 }]);
  return JSON.stringify({ acked: (events as SyncEvent[]).map((e) => e.id), progress });
};

/** Parent clicked the confirmation link (token validated by the web endpoint before calling this). */
const rpcConsentConfirm: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  const { kidId } = safeJson(payload) ?? {};
  if (!kidId) throw Error('kidId required');
  const rec = nk.storageRead([{ collection: COLL.CONSENT, key: 'record', userId: kidId }])[0]?.value ?? {};
  nk.storageWrite([{ collection: COLL.CONSENT, key: 'record', userId: kidId, value: { ...rec, confirmedAt: new Date().toISOString() }, permissionRead: 1, permissionWrite: 0 }]);
  return JSON.stringify({ ok: true });
};

/**
 * Parent turned online duels on or off in Espas Paran (the app asks the parent-gate question first).
 * Body: { on: boolean, age }. Stores the consent record and the kid's setting used by matchmaking.
 */
const rpcOnlineSet: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  if (!ctx.userId) throw Error('login required');
  const { on = false, age } = safeJson(payload) ?? {};
  const now = new Date().toISOString();
  nk.storageWrite([
    { collection: COLL.CONSENT, key: 'record', userId: ctx.userId, value: on ? { confirmedAt: now, method: 'parent_gate' } : { revokedAt: now }, permissionRead: 1, permissionWrite: 0 },
    { collection: 'settings', key: 'kid', userId: ctx.userId, value: { randomDuelsAllowed: !!on, age: age ?? null, updatedAt: now }, permissionRead: 1, permissionWrite: 0 },
  ]);
  return JSON.stringify({ ok: true, on: !!on });
};

/** The kid's public duel identity: display name (their kid-safe username) and avatar config. Body: { name, avatar }. */
const rpcProfileSet: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  if (!ctx.userId) throw Error('login required');
  const { name, avatar } = safeJson(payload) ?? {};
  const displayName = String(name ?? '').replace(/[^A-Za-z0-9 àâäçéèêëîïôöùûüÿñæœÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸÑÆŒòÒ]/g, '').trim().slice(0, 24) || null;
  const safeAvatar = avatar && typeof avatar === 'object' && JSON.stringify(avatar).length < 400 ? avatar : undefined;
  nk.accountUpdateId(ctx.userId, null, displayName, null, null, null, null, safeAvatar ? { avatar: safeAvatar } : null);
  return JSON.stringify({ ok: true });
};

/** Report + block. Body: { targetId, reason, matchId }. */
const rpcReport: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  const { targetId, reason, matchId } = safeJson(payload) ?? {};
  const mod = readModeration(nk);
  mod.reports.push({ reporterId: ctx.userId, targetId, reason, matchId, at: new Date().toISOString() });
  (mod.blocked[ctx.userId] ??= []).push(targetId);
  nk.storageWrite([{ collection: COLL.MOD, key: 'state', userId: SYSTEM_USER, value: mod, permissionRead: 0, permissionWrite: 0 }]);
  return JSON.stringify({ ok: true, blocked: true });
};

// ---------- helpers ----------

const SYSTEM_USER = A.SYSTEM_USER;

function loadBank(nk: nkruntime.Nakama) {
  // The last published content (admin panel → Publish). Before the first publish, the small sample bank.
  const pub = A.publishedQuestions(nk);
  return (pub.length ? pub : SAMPLE_QUESTIONS) as typeof SAMPLE_QUESTIONS;
}

function requireOnlineAllowed(nk: nkruntime.Nakama, userId: string) {
  const c = nk.storageRead([{ collection: COLL.CONSENT, key: 'record', userId }])[0]?.value;
  if (!c?.confirmedAt) throw { message: 'online_not_allowed', code: 7 } as nkruntime.Error;
}

function candidate(nk: nkruntime.Nakama, id: string, age: string) {
  const c = nk.storageRead([{ collection: COLL.CONSENT, key: 'record', userId: id }])[0]?.value;
  const s = nk.storageRead([{ collection: 'settings', key: 'kid', userId: id }])[0]?.value;
  return { id, age, randomDuelsAllowed: !!s?.randomDuelsAllowed, consentConfirmed: !!c?.confirmedAt };
}

function readRating(nk: nkruntime.Nakama, userId: string): number {
  return Number(nk.storageRead([{ collection: COLL.RATING, key: 'elo', userId }])[0]?.value?.elo ?? 1000);
}

function readModeration(nk: nkruntime.Nakama) {
  return (nk.storageRead([{ collection: COLL.MOD, key: 'state', userId: SYSTEM_USER }])[0]?.value as { blocked: Record<string, string[]>; reports: any[] }) ?? { blocked: {}, reports: [] };
}

function appendEvents(nk: nkruntime.Nakama, userId: string, events: SyncEvent[]): SyncEvent[] {
  const prev = (nk.storageRead([{ collection: COLL.LOG, key: 'log', userId }])[0]?.value?.events as SyncEvent[]) ?? [];
  const log = mergeLogs(prev, events.map((e) => ({ ...e, synced: true })));
  nk.storageWrite([{ collection: COLL.LOG, key: 'log', userId, value: { events: log }, permissionRead: 1, permissionWrite: 0 }]);
  return log;
}

function safeJson(s: string | ArrayBuffer | undefined): any {
  try { return typeof s === 'string' ? JSON.parse(s) : s ? JSON.parse(String.fromCharCode(...new Uint8Array(s))) : undefined; } catch { return undefined; }
}


// ---------- admin/content RPC entry points (one plain function per RPC, see admin.ts) ----------
function rpc_admin_me(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminMe(ctx, logger, nk, payload); }
function rpc_admin_stats(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminStats(ctx, logger, nk, payload); }
function rpc_admin_questions(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminQuestions(ctx, logger, nk, payload); }
function rpc_admin_question_save(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminQuestionSave(ctx, logger, nk, payload); }
function rpc_admin_question_delete(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminQuestionDelete(ctx, logger, nk, payload); }
function rpc_admin_question_status(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminQuestionStatus(ctx, logger, nk, payload); }
function rpc_admin_next_id(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminNextId(ctx, logger, nk, payload); }
function rpc_admin_import(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminImport(ctx, logger, nk, payload); }
function rpc_admin_categories(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminCategories(ctx, logger, nk, payload); }
function rpc_admin_categories_save(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminCategoriesSave(ctx, logger, nk, payload); }
function rpc_admin_config(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminConfig(ctx, logger, nk, payload); }
function rpc_admin_config_save(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminConfigSave(ctx, logger, nk, payload); }
function rpc_admin_strings(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminStrings(ctx, logger, nk, payload); }
function rpc_admin_strings_save(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminStringsSave(ctx, logger, nk, payload); }
function rpc_admin_publish(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminPublish(ctx, logger, nk, payload); }
function rpc_admin_reports(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminReports(ctx, logger, nk, payload); }
function rpc_admin_report_resolve(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminReportResolve(ctx, logger, nk, payload); }
function rpc_admin_change_password(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminChangePassword(ctx, logger, nk, payload); }
function rpc_admin_audit(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.adminAudit(ctx, logger, nk, payload); }
function rpc_change_request_submit(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return R.changeRequestSubmit(ctx, logger, nk, payload); }
function rpc_change_request_status(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return R.changeRequestStatus(ctx, logger, nk, payload); }
function rpc_admin_change_requests_list(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return R.adminChangeRequests(ctx, logger, nk, payload); }
function rpc_admin_change_request_resolve(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return R.adminChangeRequestResolve(ctx, logger, nk, payload); }
function rpc_content_manifest(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.contentManifest(ctx, logger, nk, payload); }
function rpc_content_pack(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return A.contentPack(ctx, logger, nk, payload); }
// kid accounts: cloud save + recovery code (account.ts)
function rpc_save_put(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return K.savePut(ctx, logger, nk, payload); }
function rpc_save_get(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return K.saveGet(ctx, logger, nk, payload); }
function rpc_account_info(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return K.accountInfo(ctx, logger, nk, payload); }
function rpc_account_recover(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) { return K.accountRecover(ctx, logger, nk, payload); }
function before_authenticate_google(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.AuthenticateGoogleRequest) { return K.beforeAuthenticateGoogle(ctx, logger, nk, data); }
function before_link_google(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.LinkGoogleRequest) { return K.beforeLinkGoogle(ctx, logger, nk, data); }
function after_authenticate_google(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.Session, req: nkruntime.AuthenticateGoogleRequest) { return K.afterAuthenticateGoogle(ctx, logger, nk, data, req); }
function after_link_google(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: void, req: nkruntime.LinkGoogleRequest) { return K.afterLinkGoogle(ctx, logger, nk, data, req); }

// ---------- module entry ----------

const InitModule: nkruntime.InitModule = (ctx, logger, nk, initializer) => {
  initializer.registerMatch('duel', { matchInit, matchJoinAttempt, matchJoin, matchLeave, matchLoop, matchTerminate, matchSignal });
  initializer.registerRpc('find_duel', rpcFindDuel);
  initializer.registerRpc('sync_progress', rpcSyncProgress);
  initializer.registerRpc('consent_confirm', rpcConsentConfirm);
  initializer.registerRpc('report_player', rpcReport);
  initializer.registerRpc('online_set', rpcOnlineSet);
  initializer.registerRpc('profile_set', rpcProfileSet);
  // public content (http_key) + admin RPCs (bearer token of an admin account). Nakama needs plain top-level function names here.
  initializer.registerRpc('admin_me', rpc_admin_me);
  initializer.registerRpc('admin_stats', rpc_admin_stats);
  initializer.registerRpc('admin_questions', rpc_admin_questions);
  initializer.registerRpc('admin_question_save', rpc_admin_question_save);
  initializer.registerRpc('admin_question_delete', rpc_admin_question_delete);
  initializer.registerRpc('admin_question_status', rpc_admin_question_status);
  initializer.registerRpc('admin_next_id', rpc_admin_next_id);
  initializer.registerRpc('admin_import', rpc_admin_import);
  initializer.registerRpc('admin_categories', rpc_admin_categories);
  initializer.registerRpc('admin_categories_save', rpc_admin_categories_save);
  initializer.registerRpc('admin_config', rpc_admin_config);
  initializer.registerRpc('admin_config_save', rpc_admin_config_save);
  initializer.registerRpc('admin_strings', rpc_admin_strings);
  initializer.registerRpc('admin_strings_save', rpc_admin_strings_save);
  initializer.registerRpc('admin_publish', rpc_admin_publish);
  initializer.registerRpc('admin_reports', rpc_admin_reports);
  initializer.registerRpc('admin_report_resolve', rpc_admin_report_resolve);
  initializer.registerRpc('admin_audit', rpc_admin_audit);
  initializer.registerRpc('admin_change_password', rpc_admin_change_password);
  // age / class change requests (kid device session; admin approves) — see requests.ts
  initializer.registerRpc('change_request_submit', rpc_change_request_submit);
  initializer.registerRpc('change_request_status', rpc_change_request_status);
  initializer.registerRpc('admin_change_requests_list', rpc_admin_change_requests_list);
  initializer.registerRpc('admin_change_request_resolve', rpc_admin_change_request_resolve);
  initializer.registerRpc('content_manifest', rpc_content_manifest);
  initializer.registerRpc('content_pack', rpc_content_pack);
  // kid accounts: cloud save + recovery code — see account.ts
  initializer.registerRpc('save_put', rpc_save_put);
  initializer.registerRpc('save_get', rpc_save_get);
  initializer.registerRpc('account_info', rpc_account_info);
  initializer.registerRpc('account_recover', rpc_account_recover);
  // optional Google link / login: only ID tokens made for our client id (runtime env GOOGLE_CLIENT_IDS)
  initializer.registerBeforeAuthenticateGoogle(before_authenticate_google);
  initializer.registerBeforeLinkGoogle(before_link_google);
  initializer.registerAfterLinkGoogle(after_link_google);
  initializer.registerAfterAuthenticateGoogle(after_authenticate_google);
  A.bootstrapAdmins(ctx, logger, nk);
  logger.info('Konesans module loaded. Reactions allowed: %s', PRESET_REACTIONS.join(','));
};
// Nakama looks for a global named InitModule.
// @ts-ignore
!InitModule && InitModule.bind(null);
