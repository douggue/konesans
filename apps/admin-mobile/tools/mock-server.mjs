#!/usr/bin/env node
/**
 * In-memory mock of the Konesans server API (docs/API.md), for testing the admin app without Nakama.
 *   node tools/mock-server.mjs [port] [--static dist]
 * Login: admin@konesans.test / testpass123, server key "konesans-server-key".
 * Seeded from content/bank/*.json. With --static, also serves the web export on the same origin.
 */
import http from 'node:http';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const ROOT = new URL('../../../', import.meta.url).pathname;
const args = process.argv.slice(2);
const PORT = Number(args.find((a) => /^\d+$/.test(a)) ?? 8787);
const STATIC = args.includes('--static') ? join(process.cwd(), args[args.indexOf('--static') + 1]) : null;
const SERVER_KEY = 'konesans-server-key';
const ADMINS = { 'admin@konesans.test': 'testpass123' };
const USER = { 'kid@konesans.test': 'kidpass123' }; // a non-admin, to test 403

// ---------- data
const PREFIX = { istwa: 'ist', jewografi: 'jeo', kilti: 'kil', syans: 'sya', matematik: 'mat', jeneral: 'jen', espo: 'esp', teknoloji: 'tek', peyi: 'pey' };
const questions = new Map();
const dir = join(ROOT, 'content/bank');
for (const f of existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : []) {
  const cat = basename(f, '.json').split('.')[0];
  try { for (const q of JSON.parse(readFileSync(join(dir, f), 'utf8'))) questions.set(q.id, { status: 'review', topic: '', note: '', ...q, category: cat }); } catch { /* writer mid-file */ }
}
let categories = [
  ['istwa', 'Istwa', 'Histoire', 'istwa', '#FF9F43'], ['jewografi', 'Jewografi', 'Géographie', 'jewo', '#4D7CFE'], ['peyi', 'Peyi', 'Pays', 'drapo', '#F5B700'],
  ['kilti', 'Kilti & Tradisyon', 'Culture & traditions', 'kilti', '#FF5A6E'], ['syans', 'Syans', 'Sciences', 'syans', '#B197FC'], ['matematik', 'Matematik', 'Mathématiques', 'kalkil', '#51CF66'],
  ['jeneral', 'Konesans Jeneral', 'Culture générale', 'kesyon', '#FFD43B'], ['espo', 'Espò', 'Sport', 'espo', '#2F9E44'], ['teknoloji', 'Teknoloji', 'Technologie', 'robo', '#1F47B5'],
].map(([id, ht, fr, icon, color], order) => ({ id, name: { ht, fr }, icon, color, order, enabled: true, isNew: id === 'peyi', ages: ['6-8', '9-11', '12-14'] }));
let config = {
  announcement: { on: false, ht: '', fr: '', color: 'blue' }, maintenance: { on: false, ht: '', fr: '' },
  features: { duels: true, courses: true, coding: true, math: true, peyi: true }, serveReview: true, dailyCount: 10, minAppVersion: '0.1.0',
};
let overrides = {};
let manifest = { version: 0 };
let changes = 0;
const reports = [
  { reporterId: randomUUID(), targetId: randomUUID(), reason: 'rude', matchId: 'match.' + randomUUID(), at: new Date(Date.now() - 3600e3).toISOString() },
  { reporterId: randomUUID(), targetId: randomUUID(), reason: 'name', at: new Date(Date.now() - 86400e3).toISOString() },
];
const audit = [];
const sessions = new Map(); // token -> {email, admin, exp}
const refreshes = new Map();

// ---------- helpers
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); res.end(JSON.stringify(body)); };
const fail = (res, status, message) => send(res, status, { code: { 400: 3, 401: 16, 403: 7, 404: 5 }[status] ?? 13, message, error: {} });
const counts = (list) => list.reduce((c, q) => { c.total++; c[q.status]++; return c; }, { total: 0, review: 0, approved: 0, draft: 0 });
const log = (by, action, target) => { audit.push({ at: new Date().toISOString(), by, action, target }); if (audit.length > 200) audit.shift(); };
function validate(q) {
  const p = [];
  if (!q.id || !/^[a-z]{3}-\d{3,4}$/.test(q.id)) p.push('id pa bon');
  if (!categories.some((c) => c.id === q.category)) p.push('kategori pa egziste');
  if (![1, 2, 3].includes(q.d)) p.push('nivo dwe 1, 2 oswa 3');
  if (!Array.isArray(q.ages) || !q.ages.length) p.push('chwazi omwen yon laj');
  if (!Array.isArray(q.opts) || q.opts.length < 2 || q.opts.length > 4) p.push('2 a 4 opsyon');
  if (!Array.isArray(q.optsFr) || q.optsFr.length !== q.opts?.length) p.push('opsyon fransè yo pa menm kantite');
  if (typeof q.a !== 'number' || q.a < 0 || q.a >= (q.opts?.length ?? 0)) p.push('bon repons lan pa bon');
  if (!['review', 'approved', 'draft'].includes(q.status)) p.push('estati pa bon');
  return p;
}
const complete = (q) => q.ht?.trim() && q.fr?.trim() && q.opts.every((o) => o?.trim()) && q.optsFr.every((o) => o?.trim()) && q.ex?.trim() && q.opts.length >= 3;
const toApp = (q) => ({ id: q.id, category: q.category, difficulty: q.d, ages: q.ages, prompt: { ht: q.ht, fr: q.fr }, options: q.opts.map((ht, i) => ({ ht, fr: q.optsFr[i] })), answer: q.a, explain: { ht: q.ex, fr: q.exFr }, status: q.status, topic: q.topic });

const RPC = {
  admin_me: (s) => ({ email: s.email, userId: s.userId, admins: Object.keys(ADMINS) }),
  admin_stats: () => {
    const all = [...questions.values()];
    const byCategory = {};
    for (const c of categories) byCategory[c.id] = counts(all.filter((q) => q.category === c.id));
    return { questions: { ...counts(all), byCategory }, players: { total: 1284, last7d: 312 }, reports: { open: reports.filter((r) => !r.resolved).length }, published: { version: manifest.version, publishedAt: manifest.publishedAt ?? null }, draftChanges: changes };
  },
  admin_questions: (s, { category }) => ({ questions: [...questions.values()].filter((q) => q.category === category).sort((a, b) => a.id.localeCompare(b.id)) }),
  admin_question_save: (s, { question }) => {
    const q = { ...question, updatedAt: new Date().toISOString(), updatedBy: s.email };
    const p = validate(q);
    if (p.length) throw [400, p.join(' · ')];
    if (q.status === 'approved' && !complete(q)) throw [400, 'kesyon an pa konplè, li pa ka apwouve'];
    questions.set(q.id, q); changes++; log(s.email, 'save', q.id);
    return { question: q };
  },
  admin_question_delete: (s, { id }) => { if (!questions.delete(id)) throw [404, 'kesyon an pa egziste']; changes++; log(s.email, 'delete', id); return { ok: true }; },
  admin_question_status: (s, { ids = [], status }) => {
    let updated = 0; const refused = [];
    for (const id of ids) {
      const q = questions.get(id); if (!q) continue;
      if (status === 'approved' && !complete(q)) { refused.push(id); continue; }
      questions.set(id, { ...q, status, updatedAt: new Date().toISOString(), updatedBy: s.email }); updated++;
    }
    changes += updated; log(s.email, 'status:' + status, ids.join(','));
    return { updated, refused };
  },
  admin_next_id: (s, { category }) => {
    const p = PREFIX[category] ?? category.slice(0, 3);
    const n = [...questions.keys()].filter((id) => id.startsWith(p + '-')).map((id) => Number(id.split('-')[1])).reduce((a, b) => Math.max(a, b), 0);
    return { id: `${p}-${String(n + 1).padStart(3, '0')}` };
  },
  admin_import: (s, { questions: qs = [], overwrite }) => {
    let added = 0, updated = 0, skipped = 0;
    for (const q of qs.slice(0, 500)) { if (questions.has(q.id) && !overwrite) { skipped++; continue; } questions.has(q.id) ? updated++ : added++; questions.set(q.id, q); }
    changes += added + updated; return { added, updated, skipped };
  },
  admin_categories: () => ({ categories }),
  admin_categories_save: (s, { categories: c }) => { if (!Array.isArray(c) || c.some((x) => !/^[a-z0-9-]+$/.test(x.id))) throw [400, 'id kategori pa bon']; categories = c; changes++; log(s.email, 'categories', ''); return { categories }; },
  admin_config: () => ({ config }),
  admin_config_save: (s, { config: c }) => { if (c.dailyCount < 5 || c.dailyCount > 20) throw [400, 'dailyCount dwe ant 5 ak 20']; config = c; changes++; log(s.email, 'config', ''); return { config }; },
  admin_strings: () => ({ defaults: {}, overrides }),
  admin_strings_save: (s, { overrides: o }) => { overrides = o ?? {}; changes++; return { overrides }; },
  admin_publish: (s) => {
    const serve = (q) => q.status === 'approved' || (config.serveReview && q.status === 'review');
    const packs = categories.map((c) => { const qs = [...questions.values()].filter((q) => q.category === c.id && serve(q)); return { category: c.id, count: qs.length, hash: createHash('sha256').update(JSON.stringify(qs)).digest('hex').slice(0, 16) }; });
    manifest = { version: (manifest.version ?? 0) + 1, publishedAt: new Date().toISOString(), config, categories, strings: overrides, packs };
    changes = 0; log(s.email, 'publish', 'v' + manifest.version);
    return { version: manifest.version, publishedAt: manifest.publishedAt, packs };
  },
  admin_reports: () => ({ reports }),
  admin_report_resolve: (s, { index }) => { if (!reports[index]) throw [404, 'rapò a pa egziste']; reports[index].resolved = true; return { ok: true }; },
  admin_audit: () => ({ entries: audit.slice(-200) }),
};
const PUBLIC = {
  content_manifest: () => manifest,
  content_pack: (_, { category }) => ({ category, version: manifest.version, questions: [...questions.values()].filter((q) => q.category === category && (q.status === 'approved' || (config.serveReview && q.status === 'review'))).map(toApp) }),
};

function body(req) { return new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { r(b ? JSON.parse(b) : {}); } catch { r(null); } }); }); }
const basicOk = (req) => (req.headers.authorization ?? '') === 'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64');
function newSession(email) {
  const token = 'tok_' + randomUUID(), refresh = 'ref_' + randomUUID();
  const s = { email, userId: createHash('md5').update(email).digest('hex'), admin: email in ADMINS, exp: Date.now() + 2 * 3600e3 };
  sessions.set(token, s); refreshes.set(refresh, email);
  return { token, refresh_token: refresh };
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (url.pathname === '/v2/account/authenticate/email') {
    if (!basicOk(req)) return fail(res, 401, 'Server key invalid');
    const { email, password } = (await body(req)) ?? {};
    const pw = ADMINS[email] ?? USER[email];
    if (!pw || pw !== password) return fail(res, 401, 'Invalid credentials.');
    return send(res, 200, newSession(email));
  }
  if (url.pathname === '/v2/account/session/refresh') {
    if (!basicOk(req)) return fail(res, 401, 'Server key invalid');
    const { token } = (await body(req)) ?? {};
    const email = refreshes.get(token);
    if (!email) return fail(res, 401, 'Refresh token invalid or expired.');
    refreshes.delete(token);
    return send(res, 200, newSession(email));
  }
  const m = url.pathname.match(/^\/v2\/rpc\/([a-z_]+)$/);
  if (m) {
    const id = m[1];
    const payload = (await body(req)) ?? {};
    try {
      if (PUBLIC[id]) {
        if (url.searchParams.get('http_key') !== 'konesans-http-key') return fail(res, 401, 'http_key invalid');
        return send(res, 200, PUBLIC[id](null, payload));
      }
      const tok = (req.headers.authorization ?? '').replace(/^Bearer /, '');
      const s = sessions.get(tok);
      if (!s || s.exp < Date.now()) return fail(res, 401, 'Auth token invalid');
      if (!RPC[id]) return fail(res, 404, 'RPC function not found');
      if (!s.admin) return fail(res, 403, 'permission denied');
      await new Promise((r) => setTimeout(r, 120)); // feel a little like a network
      return send(res, 200, RPC[id](s, payload));
    } catch (e) {
      if (Array.isArray(e)) return fail(res, e[0], e[1]);
      console.error(e); return fail(res, 500, String(e?.message ?? e));
    }
  }
  if (STATIC) {
    let p = join(STATIC, decodeURIComponent(url.pathname));
    if (!existsSync(p) || statSync(p).isDirectory()) p = join(STATIC, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] ?? 'application/octet-stream' });
    return res.end(readFileSync(p));
  }
  fail(res, 404, 'not found');
});
server.listen(PORT, () => console.log(`mock API on http://localhost:${PORT} · ${questions.size} questions${STATIC ? ' · serving ' + STATIC : ''}`));
