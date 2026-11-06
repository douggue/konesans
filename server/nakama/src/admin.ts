/// <reference types="nakama-runtime" />
/**
 * Admin + content API. Contract: docs/API.md.
 * Draft content lives in storage owned by the system user:
 *   bank/<questionId>      one object per question (compact AdminQuestion shape)
 *   admin/categories       Category[]
 *   admin/config           AppConfig
 *   admin/strings          { overrides }
 *   admin/audit            { entries } (last 200)
 * Published content (what kids' phones download):
 *   published/manifest     Manifest
 *   published/pack_<cat>   { category, version, questions }
 */
import { STRING_DEFAULTS } from './strings.gen';

export const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';
const C = { BANK: 'bank', ADMIN: 'admin', PUB: 'published' } as const;
const CODES = { INVALID: 3, NOT_FOUND: 5, PERMISSION: 7, UNAUTH: 16 } as const;

type Status = 'review' | 'approved' | 'draft';
type Age = '6-8' | '9-11' | '12-14';
const AGES: Age[] = ['6-8', '9-11', '12-14'];
const STATUSES: Status[] = ['review', 'approved', 'draft'];

export interface AdminQuestion {
  id: string; category: string; d: 1 | 2 | 3; ages: Age[];
  ht: string; fr: string; opts: string[]; optsFr: string[]; a: number;
  ex: string; exFr: string; topic?: string; note?: string; status: Status;
  updatedAt?: string; updatedBy?: string;
}
export interface Category { id: string; name: { ht: string; fr: string }; icon: string; color: string; order: number; enabled: boolean; isNew: boolean; ages: Age[] }
export interface AppConfig {
  announcement: { on: boolean; ht: string; fr: string; color: 'blue' | 'yellow' | 'red' | 'green' };
  maintenance: { on: boolean; ht: string; fr: string };
  features: { duels: boolean; courses: boolean; coding: boolean; math: boolean; peyi: boolean };
  serveReview: boolean; dailyCount: number; minAppVersion: string;
}

export const PREFIX: Record<string, string> = { istwa: 'ist', jewografi: 'jeo', kilti: 'kil', syans: 'sya', matematik: 'mat', jeneral: 'jen', espo: 'esp', teknoloji: 'tek', peyi: 'pey' };

export const DEFAULT_CATEGORIES: Category[] = [
  ['istwa', 'Istwa', 'Histoire', 'istwa', '#FF9F43'],
  ['jewografi', 'Jewografi', 'Géographie', 'jewo', '#4D7CFE'],
  ['peyi', 'Peyi', 'Pays', 'drapo', '#F5B700'],
  ['kilti', 'Kilti & Tradisyon', 'Culture & traditions', 'kilti', '#FF5A6E'],
  ['syans', 'Syans', 'Sciences', 'syans', '#B197FC'],
  ['matematik', 'Matematik', 'Mathématiques', 'kalkil', '#51CF66'],
  ['jeneral', 'Konesans Jeneral', 'Culture générale', 'kesyon', '#FFD43B'],
  ['espo', 'Espò', 'Sport', 'espo', '#2F9E44'],
  ['teknoloji', 'Teknoloji', 'Technologie', 'robo', '#1F47B5'],
].map(([id, ht, fr, icon, color], i) => ({ id, name: { ht, fr }, icon, color, order: i, enabled: true, isNew: false, ages: AGES.slice() }));

export const DEFAULT_CONFIG: AppConfig = {
  announcement: { on: false, ht: '', fr: '', color: 'blue' },
  maintenance: { on: false, ht: 'N ap fè kèk ti travay. Tounen talè!', fr: 'Petite maintenance en cours. Reviens bientôt !' },
  features: { duels: true, courses: true, coding: true, math: true, peyi: true },
  serveReview: true, dailyCount: 10, minAppVersion: '1.0.0',
};

// ---------- helpers ----------

function fail(message: string, code: number): never { throw { message, code } as nkruntime.Error; }
function parse(payload: string): any {
  if (!payload) return {};
  try { return JSON.parse(payload); } catch { fail('Body is not valid JSON', CODES.INVALID); }
}
const out = (v: unknown) => JSON.stringify(v);
const now = () => new Date().toISOString();

function readSys<T>(nk: nkruntime.Nakama, collection: string, key: string): { value: T; updated?: string } | null {
  const r = nk.storageRead([{ collection, key, userId: SYSTEM_USER }])[0];
  return r ? { value: r.value as T, updated: r.updateTime ? new Date(r.updateTime * 1000).toISOString() : undefined } : null;
}
function writeSys(nk: nkruntime.Nakama, objs: { collection: string; key: string; value: object }[]) {
  for (let i = 0; i < objs.length; i += 100) {
    nk.storageWrite(objs.slice(i, i + 100).map((o) => ({ ...o, userId: SYSTEM_USER, permissionRead: 0 as nkruntime.ReadPermissionValues, permissionWrite: 0 as nkruntime.WritePermissionValues })));
  }
}

function adminEmails(ctx: nkruntime.Context): string[] {
  return String(ctx.env?.KONESANS_ADMINS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}
function requireAdmin(ctx: nkruntime.Context, nk: nkruntime.Nakama): string {
  if (!ctx.userId) fail('Login required', CODES.UNAUTH);
  const email = (nk.accountGetId(ctx.userId).email ?? '').toLowerCase();
  if (!email || !adminEmails(ctx).includes(email)) fail('Kont sa a pa gen dwa administratè.', CODES.PERMISSION);
  return email;
}

function audit(nk: nkruntime.Nakama, by: string, action: string, target: string) {
  const cur = readSys<{ entries: any[] }>(nk, C.ADMIN, 'audit')?.value?.entries ?? [];
  cur.unshift({ at: now(), by, action, target });
  writeSys(nk, [{ collection: C.ADMIN, key: 'audit', value: { entries: cur.slice(0, 200) } }]);
}

/** All draft questions, optionally for one category (SQL so we don't page through 2,000 objects). */
function listQuestions(nk: nkruntime.Nakama, category?: string): AdminQuestion[] {
  const rows = category
    ? nk.sqlQuery(`SELECT value::text AS v FROM storage WHERE collection = $1 AND user_id = $2 AND value->>'category' = $3 ORDER BY key`, [C.BANK, SYSTEM_USER, category])
    : nk.sqlQuery(`SELECT value::text AS v FROM storage WHERE collection = $1 AND user_id = $2 ORDER BY key`, [C.BANK, SYSTEM_USER]);
  return rows.map((r) => JSON.parse(r.v as string));
}

const LETTERS = /\b[a-zàèòù]*(?:c(?!h)|q|x)[a-zàèòù]*\b/gi;
export function validateQuestion(q: any): string[] {
  const p: string[] = [];
  if (!q || typeof q !== 'object') return ['question missing'];
  if (!/^[a-z]{3}-\d{3,4}$/.test(q.id ?? '')) p.push('id must look like ist-123');
  if (!PREFIX[q.category] && !/^[a-z0-9-]{2,24}$/.test(q.category ?? '')) p.push('unknown category');
  if (![1, 2, 3].includes(q.d)) p.push('difficulty must be 1, 2 or 3');
  if (!Array.isArray(q.ages) || !q.ages.length || q.ages.some((a: string) => !AGES.includes(a as Age))) p.push('choose at least one age band');
  if (!String(q.ht ?? '').trim()) p.push('Kreyòl question is empty');
  if (!Array.isArray(q.opts) || q.opts.length < 2 || q.opts.length > 4) p.push('needs 2–4 options');
  else {
    if (q.opts.some((o: string) => !String(o ?? '').trim())) p.push('an option is empty');
    if (new Set(q.opts.map((o: string) => String(o).trim().toLowerCase())).size !== q.opts.length) p.push('two options are the same');
    if (!Array.isArray(q.optsFr) || q.optsFr.length !== q.opts.length) p.push('French options must match');
    if (typeof q.a !== 'number' || q.a < 0 || q.a >= q.opts.length) p.push('choose the correct answer');
  }
  if (!STATUSES.includes(q.status)) p.push('bad status');
  return p;
}
/** Approving needs a complete, bilingual question. */
function approvalProblems(q: AdminQuestion): string[] {
  const p = validateQuestion(q);
  if (!String(q.fr ?? '').trim()) p.push('French question is empty');
  if (q.optsFr?.some((o) => !String(o ?? '').trim())) p.push('a French option is empty');
  return p;
}

function clean(q: AdminQuestion, by: string): AdminQuestion {
  const c: AdminQuestion = {
    id: q.id, category: q.category, d: q.d, ages: AGES.filter((a) => q.ages.includes(a)),
    ht: String(q.ht).trim(), fr: String(q.fr ?? '').trim(),
    opts: q.opts.map((s) => String(s).trim()), optsFr: q.optsFr.map((s) => String(s ?? '').trim()), a: q.a,
    ex: String(q.ex ?? '').trim(), exFr: String(q.exFr ?? '').trim(), status: q.status,
    updatedAt: now(), updatedBy: by,
  };
  if (q.topic) c.topic = String(q.topic).trim();
  if (q.note) c.note = String(q.note).trim();
  return c;
}

/** App-facing Question shape (packages/core types). */
function toAppQuestion(q: AdminQuestion) {
  return {
    id: q.id, category: q.category, difficulty: q.d, ages: q.ages,
    prompt: { ht: q.ht, fr: q.fr || q.ht },
    options: q.opts.map((ht, i) => ({ ht, fr: q.optsFr[i] || ht })),
    answer: q.a,
    explain: q.ex ? { ht: q.ex, fr: q.exFr || q.ex } : undefined,
    status: q.status, topic: q.topic,
  };
}

function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ('0000000' + h.toString(16)).slice(-8);
}

const getCategories = (nk: nkruntime.Nakama): Category[] => readSys<{ list: Category[] }>(nk, C.ADMIN, 'categories')?.value?.list ?? DEFAULT_CATEGORIES;
const getConfig = (nk: nkruntime.Nakama): AppConfig => {
  const v = readSys<AppConfig>(nk, C.ADMIN, 'config')?.value;
  return v ? { ...DEFAULT_CONFIG, ...v, features: { ...DEFAULT_CONFIG.features, ...(v.features ?? {}) } } : DEFAULT_CONFIG;
};
const getOverrides = (nk: nkruntime.Nakama) => readSys<{ overrides: Record<string, [string, string]> }>(nk, C.ADMIN, 'strings')?.value?.overrides ?? {};
export const getManifest = (nk: nkruntime.Nakama) => readSys<any>(nk, C.PUB, 'manifest')?.value ?? null;

// ---------- admin RPCs ----------

const rpc = (fn: (ctx: nkruntime.Context, nk: nkruntime.Nakama, body: any, email: string, logger: nkruntime.Logger) => unknown): nkruntime.RpcFunction =>
  (ctx, logger, nk, payload) => { const email = requireAdmin(ctx, nk); return out(fn(ctx, nk, parse(payload), email, logger)); };

export const adminMe = rpc((ctx, nk, _b, email) => ({ email, userId: ctx.userId, admins: adminEmails(ctx) }));

export const adminStats = rpc((ctx, nk) => {
  const by: Record<string, { total: number; review: number; approved: number; draft: number }> = {};
  const tot = { total: 0, review: 0, approved: 0, draft: 0 };
  const rows = nk.sqlQuery(`SELECT value->>'category' AS c, value->>'status' AS s, count(*) AS n FROM storage WHERE collection = $1 AND user_id = $2 GROUP BY 1, 2`, [C.BANK, SYSTEM_USER]);
  for (const r of rows) {
    const c = String(r.c), s = String(r.s) as Status, n = Number(r.n);
    by[c] ??= { total: 0, review: 0, approved: 0, draft: 0 };
    by[c].total += n; tot.total += n;
    if (STATUSES.includes(s)) { by[c][s] += n; tot[s] += n; }
  }
  const players = nk.sqlQuery(`SELECT count(*) AS total, count(*) FILTER (WHERE update_time > now() - interval '7 days') AS recent FROM users WHERE id <> $1 AND (email IS NULL OR email = '')`, [SYSTEM_USER])[0] ?? {};
  const man = getManifest(nk);
  const since = man?.publishedAt ?? '1970-01-01T00:00:00Z';
  const changed = nk.sqlQuery(`SELECT count(*) AS n FROM storage WHERE user_id = $1 AND (collection = $2 OR (collection = $3 AND key IN ('categories','config','strings'))) AND update_time > $4::timestamptz`, [SYSTEM_USER, C.BANK, C.ADMIN, since])[0];
  const deleted = (readSys<{ ids: string[] }>(nk, C.ADMIN, 'deleted')?.value?.ids ?? []).length;
  const mod = readSys<{ reports: any[] }>(nk, 'moderation', 'state')?.value?.reports ?? [];
  return {
    questions: { ...tot, byCategory: by },
    players: { total: Number(players.total ?? 0), last7d: Number(players.recent ?? 0) },
    reports: { open: mod.filter((r) => !r.resolved).length },
    published: { version: man?.version ?? 0, publishedAt: man?.publishedAt ?? null },
    draftChanges: Number(changed?.n ?? 0) + deleted,
  };
});

export const adminQuestions = rpc((ctx, nk, b) => {
  if (!b.category) fail('category required', CODES.INVALID);
  return { questions: listQuestions(nk, b.category) };
});

export const adminQuestionSave = rpc((ctx, nk, b, email) => {
  const q = b.question as AdminQuestion;
  const probs = validateQuestion(q);
  if (probs.length) fail(probs.join(' · '), CODES.INVALID);
  if (q.status === 'approved') { const ap = approvalProblems(q); if (ap.length) fail('Pa ka apwouve: ' + ap.join(' · '), CODES.INVALID); }
  const c = clean(q, email);
  writeSys(nk, [{ collection: C.BANK, key: c.id, value: c }]);
  audit(nk, email, 'save', c.id);
  return { question: c };
});

export const adminQuestionDelete = rpc((ctx, nk, b, email) => {
  if (!b.id) fail('id required', CODES.INVALID);
  nk.storageDelete([{ collection: C.BANK, key: b.id, userId: SYSTEM_USER }]);
  const del = readSys<{ ids: string[] }>(nk, C.ADMIN, 'deleted')?.value?.ids ?? [];
  writeSys(nk, [{ collection: C.ADMIN, key: 'deleted', value: { ids: [...del, b.id].slice(-500) } }]);
  audit(nk, email, 'delete', b.id);
  return { ok: true };
});

export const adminQuestionStatus = rpc((ctx, nk, b, email) => {
  const ids: string[] = Array.isArray(b.ids) ? b.ids.slice(0, 500) : [];
  if (!STATUSES.includes(b.status)) fail('bad status', CODES.INVALID);
  const objs = ids.length ? nk.storageRead(ids.map((key) => ({ collection: C.BANK, key, userId: SYSTEM_USER }))) : [];
  const writes: { collection: string; key: string; value: object }[] = [];
  const refused: string[] = [];
  for (const o of objs) {
    const q = o.value as AdminQuestion;
    if (b.status === 'approved' && approvalProblems(q).length) { refused.push(q.id); continue; }
    writes.push({ collection: C.BANK, key: q.id, value: { ...q, status: b.status, updatedAt: now(), updatedBy: email } });
  }
  writeSys(nk, writes);
  if (writes.length) audit(nk, email, 'status:' + b.status, writes.length === 1 ? writes[0].key : `${writes.length} questions`);
  return { updated: writes.length, refused };
});

export const adminNextId = rpc((ctx, nk, b) => {
  const p = PREFIX[b.category] ?? String(b.category ?? 'new').slice(0, 3);
  const rows = nk.sqlQuery(`SELECT key FROM storage WHERE collection = $1 AND user_id = $2 AND key LIKE $3`, [C.BANK, SYSTEM_USER, p + '-%']);
  let max = 0;
  for (const r of rows) { const n = Number(String(r.key).slice(p.length + 1)); if (n > max) max = n; }
  const n = max + 1;
  return { id: `${p}-${n < 1000 ? ('00' + n).slice(-3) : n}` };
});

export const adminImport = rpc((ctx, nk, b, email) => {
  const qs: AdminQuestion[] = Array.isArray(b.questions) ? b.questions.slice(0, 500) : [];
  if (!qs.length) fail('no questions', CODES.INVALID);
  const existing = new Set(nk.storageRead(qs.map((q) => ({ collection: C.BANK, key: String(q.id), userId: SYSTEM_USER }))).map((o) => o.key));
  let added = 0, updated = 0, skipped = 0;
  const writes: { collection: string; key: string; value: object }[] = [];
  for (const q of qs) {
    const full = { status: 'review' as Status, ex: '', exFr: '', ...q };
    if (validateQuestion(full).length) { skipped++; continue; }
    if (existing.has(full.id)) { if (!b.overwrite) { skipped++; continue; } updated++; } else added++;
    writes.push({ collection: C.BANK, key: full.id, value: clean(full, email) });
  }
  writeSys(nk, writes);
  audit(nk, email, 'import', `${added} new, ${updated} updated`);
  return { added, updated, skipped };
});

export const adminCategories = rpc((ctx, nk) => ({ categories: getCategories(nk) }));
export const adminCategoriesSave = rpc((ctx, nk, b, email) => {
  const cats: Category[] = Array.isArray(b.categories) ? b.categories : [];
  const ids = new Set<string>();
  for (const c of cats) {
    if (!/^[a-z0-9-]{2,24}$/.test(c.id ?? '')) fail(`bad category id "${c.id}"`, CODES.INVALID);
    if (ids.has(c.id)) fail(`duplicate category "${c.id}"`, CODES.INVALID);
    ids.add(c.id);
    if (!c.name?.ht?.trim()) fail(`category ${c.id} needs a Kreyòl name`, CODES.INVALID);
  }
  const value = cats.map((c, i) => ({
    id: c.id, name: { ht: c.name.ht.trim(), fr: (c.name.fr ?? '').trim() || c.name.ht.trim() }, icon: c.icon || 'kesyon',
    color: /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : '#1F47B5', order: i, enabled: c.enabled !== false, isNew: !!c.isNew,
    ages: Array.isArray(c.ages) && c.ages.length ? AGES.filter((a) => c.ages.includes(a)) : AGES.slice(),
  }));
  writeSys(nk, [{ collection: C.ADMIN, key: 'categories', value: { list: value } }]);
  audit(nk, email, 'categories', `${value.length} categories`);
  return { categories: value };
});

export const adminConfig = rpc((ctx, nk) => ({ config: getConfig(nk) }));
export const adminConfigSave = rpc((ctx, nk, b, email) => {
  const c = b.config as AppConfig;
  if (!c || typeof c !== 'object') fail('config required', CODES.INVALID);
  const v: AppConfig = {
    announcement: { on: !!c.announcement?.on, ht: String(c.announcement?.ht ?? ''), fr: String(c.announcement?.fr ?? ''), color: (['blue', 'yellow', 'red', 'green'] as const).includes(c.announcement?.color as any) ? c.announcement.color : 'blue' },
    maintenance: { on: !!c.maintenance?.on, ht: String(c.maintenance?.ht ?? ''), fr: String(c.maintenance?.fr ?? '') },
    features: { duels: c.features?.duels !== false, courses: c.features?.courses !== false, coding: c.features?.coding !== false, math: c.features?.math !== false, peyi: c.features?.peyi !== false },
    serveReview: !!c.serveReview,
    dailyCount: Math.min(20, Math.max(5, Math.round(Number(c.dailyCount) || 10))),
    minAppVersion: /^\d+\.\d+\.\d+$/.test(c.minAppVersion ?? '') ? c.minAppVersion : '1.0.0',
  };
  writeSys(nk, [{ collection: C.ADMIN, key: 'config', value: v }]);
  audit(nk, email, 'config', 'app settings');
  return { config: v };
});

export const adminStrings = rpc((ctx, nk) => ({ defaults: STRING_DEFAULTS, overrides: getOverrides(nk) }));
export const adminStringsSave = rpc((ctx, nk, b, email) => {
  const o: Record<string, [string, string]> = {};
  for (const [k, v] of Object.entries(b.overrides ?? {})) {
    if (!(k in STRING_DEFAULTS) || !Array.isArray(v)) continue;
    const ht = String(v[0] ?? '').trim(), fr = String(v[1] ?? '').trim();
    if (!ht && !fr) continue;
    o[k] = [ht || STRING_DEFAULTS[k][0], fr || STRING_DEFAULTS[k][1]];
  }
  writeSys(nk, [{ collection: C.ADMIN, key: 'strings', value: { overrides: o } }]);
  audit(nk, email, 'strings', `${Object.keys(o).length} overrides`);
  return { overrides: o };
});

export const adminPublish = rpc((ctx, nk, _b, email, logger) => {
  const config = getConfig(nk);
  const categories = getCategories(nk);
  const all = listQuestions(nk);
  const serve = (q: AdminQuestion) => q.status === 'approved' || (config.serveReview && q.status === 'review');
  const prev = getManifest(nk);
  const version = (prev?.version ?? 0) + 1;
  const publishedAt = now();
  const packs: { category: string; count: number; hash: string }[] = [];
  const writes: { collection: string; key: string; value: object }[] = [];
  for (const cat of categories) {
    const questions = all.filter((q) => q.category === cat.id && serve(q)).map(toAppQuestion);
    const body = JSON.stringify(questions);
    packs.push({ category: cat.id, count: questions.length, hash: hash(body) });
    writes.push({ collection: C.PUB, key: 'pack_' + cat.id, value: { category: cat.id, version, questions } });
  }
  const manifest = { version, publishedAt, config, categories, strings: getOverrides(nk), packs };
  writes.push({ collection: C.PUB, key: 'manifest', value: manifest });
  writeSys(nk, writes);
  writeSys(nk, [{ collection: C.ADMIN, key: 'deleted', value: { ids: [] } }]);
  audit(nk, email, 'publish', 'v' + version);
  logger.info('Published content v%d (%d questions)', version, packs.reduce((a, p) => a + p.count, 0));
  return { version, publishedAt, packs };
});

export const adminReports = rpc((ctx, nk) => ({ reports: readSys<{ reports: any[] }>(nk, 'moderation', 'state')?.value?.reports ?? [] }));
export const adminReportResolve = rpc((ctx, nk, b, email) => {
  const st = readSys<{ blocked: any; reports: any[] }>(nk, 'moderation', 'state')?.value ?? { blocked: {}, reports: [] };
  const r = st.reports[Number(b.index)];
  if (!r) fail('report not found', CODES.NOT_FOUND);
  r.resolved = { at: now(), by: email };
  writeSys(nk, [{ collection: 'moderation', key: 'state', value: st }]);
  audit(nk, email, 'resolve-report', String(b.index));
  return { ok: true };
});
export const adminAudit = rpc((ctx, nk) => ({ entries: readSys<{ entries: any[] }>(nk, C.ADMIN, 'audit')?.value?.entries ?? [] }));

// ---------- public RPCs (http_key) ----------

export const contentManifest: nkruntime.RpcFunction = (ctx, logger, nk) => out(getManifest(nk) ?? { version: 0 });
export const contentPack: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
  const b = parse(payload);
  if (!b.category) fail('category required', CODES.INVALID);
  const p = readSys<any>(nk, C.PUB, 'pack_' + String(b.category))?.value;
  if (!p) fail('pack not found', CODES.NOT_FOUND);
  return out(p);
};

/** Questions duels are built from: the published packs (falls back to nothing → caller uses the bundled bank). */
export function publishedQuestions(nk: nkruntime.Nakama): any[] {
  const man = getManifest(nk);
  if (!man?.packs?.length) return [];
  const objs = nk.storageRead(man.packs.map((p: any) => ({ collection: C.PUB, key: 'pack_' + p.category, userId: SYSTEM_USER })));
  const qs: any[] = [];
  for (const o of objs) for (const q of (o.value as any).questions ?? []) qs.push({ ...q, status: 'approved' });
  return qs;
}

/** Create the admin accounts from env on boot (KONESANS_ADMINS + KONESANS_ADMIN_PASSWORD). */
export function bootstrapAdmins(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama) {
  const pw = String(ctx.env?.KONESANS_ADMIN_PASSWORD ?? '');
  if (pw.length < 8) { logger.warn('KONESANS_ADMIN_PASSWORD not set (min 8 chars): no admin account created'); return; }
  for (const email of adminEmails(ctx)) {
    try {
      const r = nk.authenticateEmail(email, pw, 'admin-' + email.split('@')[0].replace(/[^a-z0-9]/g, '').slice(0, 20), true);
      logger.info('Admin account %s %s', email, r.created ? 'created' : 'ready');
    } catch (e: any) {
      logger.info('Admin account %s exists (password managed in the console): %s', email, e?.message ?? e);
    }
  }
}
