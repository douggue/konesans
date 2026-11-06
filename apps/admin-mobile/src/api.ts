/**
 * Typed client for the Konesans server API (see docs/API.md).
 * Every RPC uses `?unwrap`, so request and response bodies are plain JSON.
 */
import { useSession } from './session';

export type Age = '6-8' | '9-11' | '12-14';
export type QStatus = 'review' | 'approved' | 'draft';
export interface Lang2 { ht: string; fr: string }

export interface AdminQuestion {
  id: string; category: string; d: 1 | 2 | 3; ages: Age[];
  ht: string; fr: string; opts: string[]; optsFr: string[]; a: number;
  ex: string; exFr: string; topic?: string; note?: string;
  status: QStatus; updatedAt?: string; updatedBy?: string;
}
export interface Category {
  id: string; name: Lang2; icon: string; color: string; order: number;
  enabled: boolean; isNew: boolean; ages: Age[];
}
export interface AppConfig {
  announcement: { on: boolean; ht: string; fr: string; color: 'blue' | 'yellow' | 'red' | 'green' };
  maintenance: { on: boolean; ht: string; fr: string };
  features: { duels: boolean; courses: boolean; coding: boolean; math: boolean; peyi: boolean };
  serveReview: boolean;
  dailyCount: number;
  minAppVersion: string;
}
export interface StatusCounts { total: number; review: number; approved: number; draft: number }
export interface Stats {
  questions: StatusCounts & { byCategory: Record<string, StatusCounts> };
  players: { total: number; last7d: number };
  reports: { open: number };
  published: { version: number; publishedAt: string | null };
  draftChanges: number;
}
export interface Report { reporterId: string; targetId: string; reason: string; matchId?: string; at: string; resolved?: boolean }
export interface PublishResult { version: number; publishedAt: string; packs: { category: string; count: number; hash: string }[] }

export class ApiError extends Error {
  constructor(message: string, public status: number, public kind: 'offline' | 'auth' | 'forbidden' | 'notfound' | 'invalid' | 'server') { super(message); }
}

// ---- base64 (Hermes has btoa, but keep a fallback)
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64(s: string): string {
  if (typeof globalThis.btoa === 'function') { try { return globalThis.btoa(unescape(encodeURIComponent(s))); } catch { /* fall through */ } }
  const bytes = Array.from(unescape(encodeURIComponent(s))).map((c) => c.charCodeAt(0));
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b = 0, c = 0] = bytes.slice(i, i + 3);
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}

const trimBase = (u: string) => u.trim().replace(/\/+$/, '');

function friendly(status: number, body: any): ApiError {
  const msg: string = typeof body?.message === 'string' ? body.message : typeof body?.error === 'string' ? body.error : '';
  if (status === 401) return new ApiError('Sesyon an fini oswa imèl/modpas la pa bon. Konekte ankò.', status, 'auth');
  if (status === 403) return new ApiError('Kont sa a pa gen dwa administratè.', status, 'forbidden');
  if (status === 404) return new ApiError(msg ? `Pa jwenn: ${msg}` : 'Sèvè a pa konnen demann sa a. Verifye adrès sèvè a.', status, 'notfound');
  if (status === 400) return new ApiError(msg ? `Done yo pa bon: ${msg}` : 'Done yo pa bon.', status, 'invalid');
  return new ApiError(msg ? `Erè sèvè a (${status}): ${msg}` : `Sèvè a gen yon pwoblèm (${status}). Eseye ankò.`, status, 'server');
}

async function raw(url: string, init: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    useSession.getState().setOffline(true);
    throw new ApiError('Pa gen koneksyon ak sèvè a. Tcheke entènèt ou.', 0, 'offline');
  }
  useSession.getState().setOffline(false);
  const text = await res.text();
  let body: any = undefined;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }
  if (!res.ok) throw friendly(res.status, body);
  return body;
}

/** Email login. `create=false`: admins are created on the server, never from the app. */
export async function login(base: string, serverKey: string, email: string, password: string) {
  const r = await raw(`${trimBase(base)}/v2/account/authenticate/email?create=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${b64(serverKey + ':')}` },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (!r?.token) throw new ApiError('Sèvè a pa bay okenn sesyon.', 500, 'server');
  return { token: r.token as string, refresh: (r.refresh_token as string) ?? '' };
}

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  const s = useSession.getState();
  if (!s.refresh) return false;
  refreshing ??= (async () => {
    try {
      const r = await raw(`${trimBase(s.apiUrl)}/v2/account/session/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${b64(s.serverKey + ':')}` },
        body: JSON.stringify({ token: s.refresh }),
      });
      if (!r?.token) return false;
      await useSession.getState().setTokens(r.token, r.refresh_token ?? s.refresh);
      return true;
    } catch (e) {
      return false;
    } finally {
      setTimeout(() => { refreshing = null; }, 0);
    }
  })();
  return refreshing;
}

/** Call an RPC as the logged-in admin. Refreshes the session once on 401. */
export async function rpc<T>(id: string, payload: unknown = {}): Promise<T> {
  if (!useSession.getState().token) throw new ApiError('Konekte anvan.', 401, 'auth');
  const go = () => {
    const s = useSession.getState();
    return raw(`${trimBase(s.apiUrl)}/v2/rpc/${id}?unwrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.token}` },
      body: JSON.stringify(payload ?? {}),
    });
  };
  try {
    return (await go()) as T;
  } catch (e) {
    if (e instanceof ApiError && e.kind === 'auth') {
      if (await refresh()) return (await go()) as T;
      await useSession.getState().logout();
    }
    throw e;
  }
}

export const api = {
  me: () => rpc<{ email: string; userId: string; admins: string[] }>('admin_me'),
  stats: () => rpc<Stats>('admin_stats'),
  questions: (category: string) => rpc<{ questions: AdminQuestion[] }>('admin_questions', { category }),
  saveQuestion: (question: AdminQuestion) => rpc<{ question: AdminQuestion }>('admin_question_save', { question }),
  deleteQuestion: (id: string) => rpc<{ ok: true }>('admin_question_delete', { id }),
  setStatus: (ids: string[], status: QStatus) => rpc<{ updated: number; refused?: string[] }>('admin_question_status', { ids, status }),
  nextId: (category: string) => rpc<{ id: string }>('admin_next_id', { category }),
  categories: () => rpc<{ categories: Category[] }>('admin_categories'),
  saveCategories: (categories: Category[]) => rpc<{ categories: Category[] }>('admin_categories_save', { categories }),
  config: () => rpc<{ config: AppConfig }>('admin_config'),
  saveConfig: (config: AppConfig) => rpc<{ config: AppConfig }>('admin_config_save', { config }),
  publish: () => rpc<PublishResult>('admin_publish'),
  reports: () => rpc<{ reports: Report[] }>('admin_reports'),
  resolveReport: (index: number) => rpc<{ ok: true }>('admin_report_resolve', { index }),
};

export const errText = (e: unknown) => (e instanceof Error ? e.message : 'Yon bagay pa mache. Eseye ankò.');
