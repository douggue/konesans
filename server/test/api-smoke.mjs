#!/usr/bin/env node
/**
 * End-to-end check of docs/API.md against a running Nakama.
 *   BASE=http://127.0.0.1:7350 SERVER_KEY=... HTTP_KEY=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node server/test/api-smoke.mjs
 */
import { readFileSync } from 'node:fs';
const { BASE = 'http://127.0.0.1:7350', SERVER_KEY = 'konesans-server-key', HTTP_KEY = 'testhttpkey', ADMIN_EMAIL = 'admin@konesans.test', ADMIN_PASSWORD = 'testpass123' } = process.env;
let ok = 0, bad = 0;
const check = (cond, msg) => { if (cond) { ok++; console.log('  ✓', msg); } else { bad++; console.log('  ✖', msg); } };
const basic = 'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64');
async function call(path, body, auth) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: auth }, body: JSON.stringify(body ?? {}) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
}
const login = async (email, password, create = false) => (await call(`/v2/account/authenticate/email?create=${create}`, { email, password }, basic)).body;

const s = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
check(!!s.token, 'admin login');
const A = (id, body) => call(`/v2/rpc/${id}?unwrap`, body, 'Bearer ' + s.token).then((r) => { if (r.status !== 200) console.log('    ', id, r.status, JSON.stringify(r.body).slice(0, 200)); return r; });

const me = await A('admin_me'); check(me.body.email === ADMIN_EMAIL.toLowerCase(), 'admin_me');

// import the repo bank in chunks of 500
const bank = JSON.parse(readFileSync(new URL('../../apps/admin/bank.json', import.meta.url))).questions.map((q) => ({
  id: q.id, category: q.category, d: q.difficulty, ages: q.ages, ht: q.prompt.ht, fr: q.prompt.fr, opts: q.options.map((o) => o.ht), optsFr: q.options.map((o) => o.fr),
  a: q.answer, ex: q.explain?.ht ?? '', exFr: q.explain?.fr ?? '', topic: q.topic, status: q.status,
}));
let added = 0;
for (let i = 0; i < bank.length; i += 150) { const r = await A("admin_import", { questions: bank.slice(i, i + 150) }); added += (r.body.added ?? 0) + (r.body.skipped ?? 0); }
check(added === bank.length, `admin_import ${bank.length} questions`);

const st = await A('admin_stats'); check(st.body.questions.total === bank.length, `admin_stats total=${st.body.questions?.total}`);
const qs = await A('admin_questions', { category: 'istwa' }); check(qs.body.questions.length > 50 && qs.body.questions.every((q) => q.category === 'istwa'), `admin_questions istwa (${qs.body.questions?.length})`);

const q0 = { ...qs.body.questions[0], ht: qs.body.questions[0].ht + ' ', status: 'approved' };
const sv = await A('admin_question_save', { question: q0 }); check(sv.body.question?.status === 'approved' && sv.body.question.updatedBy, 'admin_question_save approve');
const badSave = await A('admin_question_save', { question: { ...q0, opts: ['a', 'a', 'b'], optsFr: ['a', 'a', 'b'] } }); check(badSave.status >= 400, 'save rejects duplicate options');
const stt = await A('admin_question_status', { ids: qs.body.questions.slice(1, 4).map((q) => q.id), status: 'approved' }); check(stt.body.updated === 3, 'admin_question_status ×3');
const nid = await A('admin_next_id', { category: 'istwa' }); check(/^ist-\d{3}$/.test(nid.body.id), `admin_next_id → ${nid.body.id}`);
const nq = { id: nid.body.id, category: 'istwa', d: 1, ages: ['6-8'], ht: 'Kesyon tès?', fr: 'Question test ?', opts: ['A', 'B', 'C'], optsFr: ['A', 'B', 'C'], a: 1, ex: '', exFr: '', status: 'review' };
check((await A('admin_question_save', { question: nq })).status === 200, 'create new question');
check((await A('admin_question_delete', { id: nq.id })).status === 200, 'delete question');

const cats = await A('admin_categories'); check(cats.body.categories.length === 9, 'admin_categories defaults');
const cs = await A('admin_categories_save', { categories: cats.body.categories.map((c) => c.id === 'espo' ? { ...c, isNew: true } : c) }); check(cs.body.categories.find((c) => c.id === 'espo').isNew === true, 'admin_categories_save');
const cfg = await A('admin_config'); check(cfg.body.config.features.duels === true, 'admin_config defaults');
const cfs = await A('admin_config_save', { config: { ...cfg.body.config, announcement: { on: true, ht: 'Bonjou!', fr: 'Bonjour !', color: 'yellow' } } }); check(cfs.body.config.announcement.on, 'admin_config_save');
const strs = await A('admin_strings'); check(Object.keys(strs.body.defaults).length > 50, `admin_strings defaults (${Object.keys(strs.body.defaults ?? {}).length})`);
const sts = await A('admin_strings_save', { overrides: { home: ['Lakay mwen', ''] } }); check(sts.body.overrides.home?.[0] === 'Lakay mwen' && sts.body.overrides.home[1] === 'Accueil', 'admin_strings_save');
const st2 = await A('admin_stats'); check(st2.body.draftChanges > 0, `draftChanges before publish = ${st2.body.draftChanges}`);
const pub = await A('admin_publish'); check(pub.body.version >= 1 && pub.body.packs.length === 9, `admin_publish v${pub.body.version}`);
const st3 = await A('admin_stats'); check(st3.body.draftChanges === 0, `draftChanges after publish = ${st3.body.draftChanges}`);
check((await A('admin_audit')).body.entries.length > 5, 'admin_audit');
check(Array.isArray((await A('admin_reports')).body.reports), 'admin_reports');

// public content
const P = (id, body) => call(`/v2/rpc/${id}?http_key=${HTTP_KEY}&unwrap`, body, '');
const man = await P('content_manifest'); check(man.body.version === pub.body.version && man.body.config.announcement.on && man.body.strings.home, 'content_manifest');
const pk = await P('content_pack', { category: 'istwa' }); check(pk.body.questions?.length > 50 && pk.body.questions[0].prompt?.ht, `content_pack istwa (${pk.body.questions?.length})`);
check((await P('content_manifest', {})).status === 200 && (await call('/v2/rpc/content_manifest?http_key=wrong&unwrap', {}, '')).status === 401, 'wrong http_key refused');

// non-admin is refused
const kid = await login('kid' + Date.now() + '@test.local', 'kidpass1234', true);
const denied = await call('/v2/rpc/admin_stats?unwrap', {}, 'Bearer ' + kid.token); check(denied.status === 403 || denied.status === 401 || denied.status === 400, `non-admin refused (${denied.status})`);
console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
