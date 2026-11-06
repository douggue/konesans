/**
 * Online 1-vs-1 duels on your Nakama server (server/nakama/src/main.ts, test: server/test/duel-smoke.mjs).
 * - Each phone gets an anonymous account (random device id, nothing personal) shown under the kid's
 *   username + avatar.
 * - A parent turns online duels on in Espas Paran (`setOnlineAllowed`); the server refuses otherwise.
 * - `findDuel` joins a waiting kid of the same age or opens a game; while alone it keeps looking so two kids
 *   who searched at the same moment still meet. After 10 s alone the server sends Robo.
 * The server is authoritative: the phone only sends its answer and receives what it may see (`publicView`).
 *
 * Talks to Nakama directly (fetch + one WebSocket in JSON mode) — the same plain calls the content sync uses,
 * so nothing depends on browser-only APIs that a phone may lack.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AgeBand } from '@konesans/core';
import { SERVER } from './server-config';

export const OP = { STATE: 1, ANSWER: 2, REACT: 3 } as const;

/** What the server sends each player (core `publicView`). */
export interface OnlineView {
  matchId: string; phase: 'lobby' | 'question' | 'reveal' | 'ended'; index: number; total: number;
  phaseStartedAt: number; questionMs: number; serverNow?: number;
  question?: { id: string; prompt: { ht: string; fr?: string }; options: { ht: string; fr?: string }[]; media?: unknown; answer?: number; explain?: { ht: string; fr?: string } };
  players: { id: string; username: string; avatar?: unknown; isBot: boolean; score: number; connected: boolean; answered: boolean; chosen?: number }[];
  reactions: Record<string, string>; endReason?: 'completed' | 'forfeit' | 'timeout'; winnerId?: string | null;
}

const API = SERVER.apiUrl.replace(/\/$/, '');
const WS = API.replace(/^http/, 'ws');
/** Last reason an online call failed (shown small, for support). */
export let lastOnlineError = '';

// ---------- base64 + UTF-8 by hand (no btoa/atob/TextDecoder needed) ----------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function utf8(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}
function fromUtf8(b: number[]): string {
  let o = '';
  for (let i = 0; i < b.length;) {
    const c = b[i++];
    if (c < 0x80) o += String.fromCharCode(c);
    else if (c < 0xe0) o += String.fromCharCode(((c & 31) << 6) | (b[i++] & 63));
    else if (c < 0xf0) o += String.fromCharCode(((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63));
    else o += String.fromCodePoint(((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63));
  }
  return o;
}
function b64encode(s: string): string {
  const b = utf8(s); let o = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    o += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return o;
}
function b64decode(s: string): string {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, ''); const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2]) & 63) << 6) | (B64.indexOf(clean[i + 3]) & 63);
    bytes.push((n >> 16) & 255);
    if (i + 2 < clean.length) bytes.push((n >> 8) & 255);
    if (i + 3 < clean.length) bytes.push(n & 255);
  }
  return fromUtf8(bytes);
}

// ---------- session ----------
const DEVICE_KEY = 'konesans-device-id';
async function deviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = 'kns-' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

class OnlineFailure extends Error { constructor(public status: number, msg: string) { super(msg); } }

async function http<T>(path: string, init: { method?: string; auth: string; body?: unknown }): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(API + path, {
      method: init.method ?? 'POST', signal: ctl.signal,
      headers: { Authorization: init.auth, 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await r.text();
    if (!r.ok) throw new OnlineFailure(r.status, text.slice(0, 300));
    return (text ? JSON.parse(text) : null) as T;
  } catch (e: any) {
    lastOnlineError = e instanceof OnlineFailure ? `${e.status} ${e.message}`.slice(0, 160) : `net ${String(e?.message ?? e)}`.slice(0, 160);
    throw e;
  } finally { clearTimeout(timer); }
}

let session: { token: string; userId: string; at: number } | null = null;
async function getSession() {
  if (session && Date.now() - session.at < 30 * 60 * 1000) return session; // server tokens last longer
  const r = await http<{ token: string }>('/v2/account/authenticate/device?create=true', { auth: 'Basic ' + b64encode(SERVER.serverKey + ':'), body: { id: await deviceId() } });
  const payload = JSON.parse(b64decode(r.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  session = { token: r.token, userId: payload.uid, at: Date.now() };
  return session;
}
async function rpc<T>(id: string, body: object): Promise<T> {
  const s = await getSession();
  return http<T>(`/v2/rpc/${id}?unwrap`, { auth: 'Bearer ' + s.token, body });
}

/** Kid's public identity for duels (their kid-safe username and avatar). */
export async function setProfile(name: string, avatar: unknown) { await rpc('profile_set', { name, avatar }); }

/** Parent switch in Espas Paran. */
export async function setOnlineAllowed(on: boolean, age: AgeBand) { await rpc('online_set', { on, age }); }

// ---------- realtime ----------
interface Sock { send: (msg: object) => Promise<any>; close: () => void }
function openSocket(token: string, onData: (matchId: string, op: number, data: string) => void, onClose: () => void): Promise<Sock> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS}/ws?lang=en&status=true&format=json&token=${encodeURIComponent(token)}`);
    let cid = 0; let open = false;
    const pending: Record<string, { ok: (v: any) => void; fail: (e: Error) => void }> = {};
    const timer = setTimeout(() => { if (!open) { lastOnlineError = 'ws timeout'; try { ws.close(); } catch { /* */ } reject(new Error('ws timeout')); } }, 10000);
    ws.onopen = () => {
      open = true; clearTimeout(timer);
      resolve({
        send: (msg) => new Promise((ok, fail) => { const c = String(++cid); pending[c] = { ok, fail }; ws.send(JSON.stringify({ cid: c, ...msg })); }),
        close: () => { try { ws.close(); } catch { /* */ } },
      });
    };
    ws.onerror = (e: any) => { if (!open) { clearTimeout(timer); lastOnlineError = `ws ${e?.message ?? 'error'}`; reject(new Error('ws error')); } };
    ws.onclose = () => { Object.values(pending).forEach((p) => p.fail(new Error('closed'))); if (open) onClose(); };
    ws.onmessage = (m) => {
      let j: any; try { j = JSON.parse(String(m.data)); } catch { return; }
      if (j.cid && pending[j.cid]) { const p = pending[j.cid]; delete pending[j.cid]; if (j.error) p.fail(new Error(JSON.stringify(j.error))); else p.ok(j); return; }
      if (j.match_data) { try { onData(j.match_data.match_id, Number(j.match_data.op_code), b64decode(j.match_data.data ?? '')); } catch { /* bad frame */ } }
    };
  });
}

export interface OnlineDuel {
  myId: string;
  answer: (chosen: number) => void;
  react: (reaction: string) => void;
  report: (targetId: string, reason: string) => Promise<void>;
  leave: () => void;
}
export type OnlineError = 'not_allowed' | 'offline' | 'server';

/**
 * Find an opponent and play. `onView` gets every state update; `onError` is called once if it can't start
 * (or if the connection drops later).
 */
export async function findDuel(opts: { age: AgeBand; category?: string; onView: (v: OnlineView) => void; onError: (e: OnlineError) => void }): Promise<OnlineDuel | null> {
  const category = opts.category ?? 'mix';
  let sock: Sock | null = null;
  let current: string | null = null;
  let players = 0;
  let closed = false;
  const join = async (id: string) => { await sock!.send({ match_join: { match_id: id } }); };
  const leaveMatch = async (id: string) => { await sock!.send({ match_leave: { match_id: id } }).catch(() => {}); };
  const sendState = (op: number, data: object) => { if (current && sock) sock.send({ match_data_send: { match_id: current, op_code: String(op), data: b64encode(JSON.stringify(data)) } }).catch(() => {}); };
  try {
    const s = await getSession();
    sock = await openSocket(s.token, (matchId, op, data) => {
      if (op !== OP.STATE || matchId !== current) return;
      try { const v = JSON.parse(data) as OnlineView; players = v.players.length; opts.onView(v); } catch { /* ignore */ }
    }, () => { if (!closed) opts.onError('offline'); });
    const first = await rpc<{ matchId: string }>('find_duel', { age: opts.age, category });
    current = first.matchId;
    await join(current);
    // keep looking while alone: if another kid is waiting, the higher game id moves to the lower one
    (async () => {
      const t0 = Date.now();
      while (!closed && Date.now() - t0 < 8500) {
        await new Promise((r) => setTimeout(r, 900));
        if (closed || players >= 2 || !current) return;
        try {
          const r: { matchId: string | null } = await rpc<{ matchId: string | null }>('find_duel', { age: opts.age, category, waitingIn: current });
          if (r.matchId && r.matchId < current && players < 2) {
            const old: string = current; const next: string = r.matchId; current = next; players = 0;
            await leaveMatch(old);
            await join(next);
          }
        } catch { /* keep waiting; Robo comes at 10 s */ }
      }
    })();
    return {
      myId: s.userId,
      answer: (chosen) => sendState(OP.ANSWER, { chosen }),
      react: (reaction) => sendState(OP.REACT, { reaction }),
      report: async (targetId, reason) => { await rpc('report_player', { targetId, reason, matchId: current }); },
      leave: () => { closed = true; const m = current; current = null; if (m) leaveMatch(m); setTimeout(() => sock?.close(), 300); },
    };
  } catch (e: any) {
    closed = true; sock?.close();
    const detail = lastOnlineError + ' ' + String(e?.message ?? '');
    if (/online_not_allowed|consent/i.test(detail)) opts.onError('not_allowed');
    else if (e instanceof OnlineFailure) opts.onError('server');
    else opts.onError('offline');
    return null;
  }
}
