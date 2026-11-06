/**
 * Online 1-vs-1 duels on your Nakama server (server/nakama/src/main.ts, test: server/test/duel-smoke.mjs).
 * - Each phone gets an anonymous account (random device id, nothing personal) shown under the kid's
 *   username + avatar.
 * - A parent turns online duels on in Espas Paran (`setOnlineAllowed`); the server refuses otherwise.
 * - `findDuel` joins a waiting kid of the same age or opens a game; while alone it keeps looking so two kids
 *   who searched at the same moment still meet. After 10 s alone the server sends Robo.
 * The server is authoritative: the phone only sends its answer and receives what it may see (`publicView`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, type Session, type Socket } from '@heroiclabs/nakama-js';
import type { AgeBand } from '@konesans/core';
import { SERVER } from './server-config';

export const OP = { STATE: 1, ANSWER: 2, REACT: 3 } as const;

/** What the server sends each player (core `publicView`). */
export interface OnlineView {
  matchId: string; phase: 'lobby' | 'question' | 'reveal' | 'ended'; index: number; total: number;
  phaseStartedAt: number; questionMs: number;
  question?: { id: string; prompt: { ht: string; fr?: string }; options: { ht: string; fr?: string }[]; media?: unknown; answer?: number; explain?: { ht: string; fr?: string } };
  players: { id: string; username: string; avatar?: unknown; isBot: boolean; score: number; connected: boolean; answered: boolean; chosen?: number }[];
  reactions: Record<string, string>; endReason?: 'completed' | 'forfeit' | 'timeout'; winnerId?: string | null;
}

const url = new URL(SERVER.apiUrl);
const client = new Client(SERVER.serverKey, url.hostname, url.port || (url.protocol === 'https:' ? '443' : '80'), url.protocol === 'https:', 10000);

const DEVICE_KEY = 'konesans-device-id';
async function deviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = 'kns-' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

let session: Session | null = null;
async function getSession(): Promise<Session> {
  const now = Date.now() / 1000;
  if (session && !session.isexpired(now + 60)) return session;
  if (session && session.refresh_token && !session.isrefreshexpired(now + 60)) {
    try { session = await client.sessionRefresh(session); return session; } catch { /* fall through */ }
  }
  session = await client.authenticateDevice(await deviceId(), true);
  return session;
}

/** Kid's public identity for duels (their kid-safe username and avatar). */
export async function setProfile(name: string, avatar: unknown) {
  await client.rpc(await getSession(), 'profile_set', { name, avatar });
}

/** Parent switch in Espas Paran. */
export async function setOnlineAllowed(on: boolean, age: AgeBand) {
  await client.rpc(await getSession(), 'online_set', { on, age });
}

function decode(data: unknown): any {
  if (typeof data === 'string') return JSON.parse(data);
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
  if (typeof TextDecoder !== 'undefined') return JSON.parse(new TextDecoder().decode(bytes));
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return JSON.parse(decodeURIComponent(escape(s)));
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
 * Find an opponent and play. `onView` gets every state update; `onError` is called once if it can't start.
 * Returns a controller as soon as the kid is in a game (waiting or playing).
 */
export async function findDuel(opts: { age: AgeBand; category?: string; onView: (v: OnlineView) => void; onError: (e: OnlineError) => void }): Promise<OnlineDuel | null> {
  const category = opts.category ?? 'mix';
  let sock: Socket | null = null;
  let current: string | null = null;
  let last: OnlineView | null = null;
  const full = () => ((last as OnlineView | null)?.players.length ?? 0) >= 2; // read through a function: `last` changes in callbacks
  let closed = false;
  try {
    const s = await getSession();
    sock = client.createSocket(url.protocol === 'https:', false);
    sock.onmatchdata = (md) => {
      if (md.op_code !== OP.STATE || md.match_id !== current) return;
      try { last = decode(md.data) as OnlineView; opts.onView(last); } catch { /* ignore a bad frame */ }
    };
    sock.ondisconnect = () => { if (!closed) opts.onError('offline'); };
    await sock.connect(s, true);
    const first = (await client.rpc(s, 'find_duel', { age: opts.age, category })).payload as { matchId: string };
    current = first.matchId;
    await sock.joinMatch(current);
    // keep looking while alone: if another kid is waiting, the higher game id moves to the lower one
    (async () => {
      const t0 = Date.now();
      while (!closed && Date.now() - t0 < 8500) {
        await new Promise((r) => setTimeout(r, 900));
        if (closed || full() || !current) return;
        try {
          const r = (await client.rpc(await getSession(), 'find_duel', { age: opts.age, category, waitingIn: current })).payload as { matchId: string | null };
          if (r.matchId && r.matchId < current && !full()) {
            const old = current; current = r.matchId; last = null;
            await sock!.leaveMatch(old);
            await sock!.joinMatch(current);
          }
        } catch { /* keep waiting; Robo comes at 10 s */ }
      }
    })();
    const myId = s.user_id!;
    return {
      myId,
      answer: (chosen) => { if (current) sock?.sendMatchState(current, OP.ANSWER, JSON.stringify({ chosen })).catch(() => {}); },
      react: (reaction) => { if (current) sock?.sendMatchState(current, OP.REACT, JSON.stringify({ reaction })).catch(() => {}); },
      report: async (targetId, reason) => { await client.rpc(await getSession(), 'report_player', { targetId, reason, matchId: current }); },
      leave: () => { closed = true; const m = current; current = null; if (m) sock?.leaveMatch(m).catch(() => {}); setTimeout(() => sock?.disconnect(false), 300); },
    };
  } catch (e: any) {
    closed = true; sock?.disconnect(false);
    const msg = String(e?.message ?? e?.statusText ?? '');
    let body = '';
    try { body = typeof e?.json === 'function' ? JSON.stringify(await e.json()) : ''; } catch { /* no body */ }
    if (/online_not_allowed|consent/i.test(msg + body)) opts.onError('not_allowed');
    else if (/network|fetch|timeout|failed/i.test(msg) || e?.status === undefined) opts.onError('offline');
    else opts.onError('server');
    return null;
  }
}
