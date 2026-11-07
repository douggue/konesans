#!/usr/bin/env node
/**
 * Daily challenge end to end against a running Nakama (docs/API.md "Daily challenge").
 *   BASE=http://127.0.0.1:7350 SERVER_KEY=... node server/test/daily-smoke.mjs
 * Plain fetch: no npm packages needed.
 */
const { BASE = 'http://127.0.0.1:7350', SERVER_KEY = 'konesans-server-key' } = process.env;
let ok = 0, bad = 0;
const check = (cond, msg) => { if (cond) { ok++; console.log('  ✓', msg); } else { bad++; console.log('  ✖', msg); } };
const basic = 'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(path, body, auth) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: auth }, body: JSON.stringify(body ?? {}) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
}
async function kid(name, age, online) {
  const dev = 'kns-daily-' + name.replace(/\W/g, '') + '-' + Date.now().toString(16) + Math.random().toString(16).slice(2, 6);
  const s = (await call('/v2/account/authenticate/device?create=true', { id: dev }, basic)).body;
  const rpc = (id, body) => call(`/v2/rpc/${id}?unwrap`, body, 'Bearer ' + s.token);
  await rpc('profile_set', { name, avatar: { skin: 2, hair: 1 } });
  if (online !== undefined) await rpc('online_set', { on: online, age });
  return { rpc, uid: JSON.parse(Buffer.from(s.token.split('.')[1], 'base64url').toString()).uid, name };
}

const AGE = '12-14';
const RUN = String(Date.now() % 1000); // names unique per run (the board keeps earlier runs of the day)
const a = await kid('Malfini ' + RUN, AGE, true);
const b = await kid('Kolibri ' + RUN, AGE, true);
const c = await kid('Lanbi ' + RUN, AGE, false);      // parent said no
const d = await kid('Zandolit Tès', '6-8', true);  // other age band

// validation
check((await a.rpc('daily_get', { age: '15-18' })).status === 400, 'daily_get: bad age refused');
const anon = await call('/v2/rpc/daily_get?unwrap', { age: AGE }, basic);
check(anon.status >= 400, `daily_get needs a session (${anon.status})`);

// same set for everyone of the band
const ga = (await a.rpc('daily_get', { age: AGE })).body;
const gb = (await b.rpc('daily_get', { age: AGE })).body;
const gc = (await c.rpc('daily_get', { age: AGE })).body;
const gd = (await d.rpc('daily_get', { age: '6-8' })).body;
check(/^\d{4}-\d{2}-\d{2}$/.test(ga.day) && ga.count >= 5 && ga.questions?.length === ga.count, `daily_get → day ${ga.day}, ${ga.count} questions`);
const sig = (g) => g.questions.map((q) => `${q.id}:${q.answer}:${q.options.map((o) => o.ht).join('|')}:${q.prompt.fr}`).join('\n'); // jsonb may reorder keys
check(sig(ga) === sig(gb) && sig(ga) === sig(gc), 'same questions (and option order) for every kid of the band');
check(gd.questions.map((q) => q.id).join() !== ga.questions.map((q) => q.id).join(), 'another age band gets another set');
check(ga.questions.every((q) => q.ages.includes(AGE)), 'questions fit the age band');
check(ga.result === null && ga.allowed === true && gc.allowed === false, 'no result yet; allowed flag follows the parent setting');
check((await a.rpc('daily_get', { age: AGE })).body.questions.map((q) => q.id).join() === ga.questions.map((q) => q.id).join(), 'set is frozen for the day');

// anti-cheat: must open first, sane times, server scores itself
const fresh = await kid('Ti Toti', AGE, true);
check((await fresh.rpc('daily_submit', { day: ga.day, age: AGE, answers: [] })).status === 400, 'submit without daily_get refused');
check((await b.rpc('daily_submit', { day: '2020-01-01', age: AGE, answers: [] })).status === 400, 'submit for another day refused');
const instantAll = ga.questions.map((q) => ({ i: q.answer, ms: 900 }));
const tooFast = await b.rpc('daily_submit', { day: ga.day, age: AGE, answers: instantAll, score: 99999 });
check(tooFast.status === 400 && /too_fast/.test(JSON.stringify(tooFast.body)), `whole run in less than the reading time refused (${tooFast.status})`);

await sleep(ga.count * 800 + 200);
// a: all right; b: half right; c: all right but not allowed online
const allRight = ga.questions.map((q) => ({ i: q.answer, ms: 2500 }));
const half = ga.questions.map((q, k) => ({ i: k % 2 ? (q.answer + 1) % q.options.length : q.answer, ms: 4000 }));
const sa = (await a.rpc('daily_submit', { day: ga.day, age: AGE, answers: allRight, ms: 1, score: 1 })).body;
check(sa.correct === ga.count && sa.total === ga.count && sa.score > ga.count * 10 && sa.already === false, `a: scored by the server ${sa.correct}/${sa.total}, ${sa.score} pts (client score ignored)`);
check(sa.allowed === true && sa.me?.rank >= 1 && sa.top?.some((r) => r.me && r.name === a.name), `a: in the top (place ${sa.me?.rank})`);
const sb = (await b.rpc('daily_submit', { day: ga.day, age: AGE, answers: half, score: 100000 })).body;
check(sb.correct === Math.ceil(ga.count / 2) && sb.me?.rank > sa.me?.rank, `b: ${sb.correct} right → place ${sb.me?.rank} (after a)`);
const sb2 = (await b.rpc('daily_submit', { day: ga.day, age: AGE, answers: allRight })).body;
check(sb2.already === true && sb2.correct === sb.correct, 'second submit is not scored (already: true, first result kept)');
const sc = (await c.rpc('daily_submit', { day: ga.day, age: AGE, answers: allRight })).body;
check(sc.correct === ga.count && sc.allowed === false && sc.top.length === 0 && sc.me === null, 'c (no parent permission): own score only, no ranking');

// the top
const ta = (await a.rpc('daily_top', { age: AGE })).body;
const names = ta.top.map((r) => r.name);
check(ta.allowed && names.includes(a.name) && !names.includes(c.name) && (!names.includes(b.name) || names.indexOf(a.name) < names.indexOf(b.name)), `daily_top: ${names.slice(0, 5).join(', ')} (no kid without permission)`);
check(ta.top.length <= 10 && ta.top.every((r) => Object.keys(r).sort().join() === 'avatar,correct,me,name,rank,score,total'), 'top rows: name, avatar, place, score only (no ids)');
const mine = ta.top.find((r) => r.me);
check(mine?.name === a.name && mine.avatar?.skin === 2 && ta.me?.rank === mine.rank, 'avatar + "me" + my place');
const tc = (await c.rpc('daily_top', { age: AGE })).body;
check(tc.allowed === false && tc.top.length === 0, 'daily_top without permission → empty');
const g2 = (await b.rpc('daily_get', { age: AGE })).body;
check(g2.result?.correct === sb.correct && g2.playedAge === AGE, 'daily_get after playing → own result');

// parent turns online play off → the kid leaves the board
await b.rpc('online_set', { on: false, age: AGE });
const ta2 = (await a.rpc('daily_top', { age: AGE })).body;
check(!ta2.top.some((r) => r.name === b.name) && !(await b.rpc('daily_top', { age: AGE })).body.allowed, 'kid hidden from the top after the parent switched online play off');

console.log(`\n${ok} ok, ${bad} failed`);
process.exit(bad ? 1 : 0);
