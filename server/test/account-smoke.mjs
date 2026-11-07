#!/usr/bin/env node
/**
 * Kid accounts end to end against a running Nakama (docs/API.md "Accounts: cloud save + recovery code").
 *   BASE=http://127.0.0.1:7350 SERVER_KEY=... node server/test/account-smoke.mjs
 * Plain fetch: no npm packages needed. Each run pretends to come from its own network address (X-Forwarded-For),
 * so the per-address limit on wrong codes doesn't trip when the test is run many times.
 */
const { BASE = 'http://127.0.0.1:7350', SERVER_KEY = 'konesans-server-key' } = process.env;
let ok = 0, bad = 0;
const check = (cond, msg) => { if (cond) { ok++; console.log('  ✓', msg); } else { bad++; console.log('  ✖', msg); } };
const basic = 'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64');
const RUN = Date.now().toString(16);
const IP = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
async function call(path, body, auth, ip = IP) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: auth, 'x-forwarded-for': ip }, body: typeof body === 'string' ? body : JSON.stringify(body ?? {}) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
}
const hex = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
async function phone(devId = 'kns-' + hex()) {
  const s = (await call('/v2/account/authenticate/device?create=true', { id: devId }, basic)).body;
  const uid = JSON.parse(Buffer.from(s.token.split('.')[1], 'base64url').toString()).uid;
  const rpc = (id, body, ip) => call(`/v2/rpc/${id}?unwrap`, body, 'Bearer ' + s.token, ip);
  return { devId, uid, rpc, token: s.token };
}
const part = (at, data) => ({ at, data });
const now = Date.now();

// ── phone A: a kid plays, the first sync issues a code ──
const A = await phone();
const info = await A.rpc('account_info', {});
const code = info.body.code;
check(info.status === 200 && /^[A-Z]{2,12}-[2-9]{4}$/.test(code ?? ''), `account_info → code ${code}`);
check(info.body.hasSave === false && info.body.google === false, 'no save yet, no Google link');
check((await A.rpc('account_info', {})).body.code === code, 'same code on the next call');

const profile = { id: 'pA' + RUN, username: 'Mango 12', age: '9-11', lang: 'ht', avatarColor: 0, avatar: { skin: 2, hair: 'afro' }, createdAt: new Date(now - 86400e3).toISOString(), realName: 'should be dropped' };
const progress = { xp: 340, coins: 120, streak: { count: 3, lastDay: '2026-11-06', freezeAvailable: true }, categoryLevel: {}, heroCards: [], badges: { first_quiz: '2026-11-04T10:00:00Z' }, review: {}, questsDay: null, quests: [] };
const put1 = await A.rpc('save_put', { profileId: profile.id, parts: { profile: part(now - 5000, profile), progress: part(now - 5000, progress), cards: part(now - 5000, { owned: ['tousen', 'desalin'], fresh: [], read: [] }), prefs: part(now - 5000, { difficulty: 2 }) } });
check(put1.status === 200 && put1.body.ok && put1.body.code === code, `save_put first upload (${put1.status})`);
check(put1.body.pull && Object.keys(put1.body.pull).length === 1 && put1.body.pull.profile, 'only the cleaned profile comes back (its extra field was dropped)');
let got = (await A.rpc('save_get', {})).body;
check(got.save?.profileId === profile.id && got.save.parts.progress.data.xp === 340 && got.code === code, 'save_get returns the save + code');
check(!('realName' in got.save.parts.profile.data) && got.save.parts.profile.data.username === 'Mango 12', 'profile: unknown fields dropped, generated username kept');

// an older phone (older `at`, less XP) never wins: XP stays max, settings newest
const put2 = await A.rpc('save_put', { profileId: profile.id, parts: { progress: part(now - 60_000, { ...progress, xp: 100, coins: 5, badges: { other: '2026-11-05T00:00:00Z' } }) }, have: { profile: now, cards: now, prefs: now } });
check(put2.status === 200 && put2.body.pull?.progress?.data.xp === 340, 'older upload: XP kept at max, merged progress pulled back');
check(Object.keys(put2.body.pull.progress.data.badges).sort().join() === 'first_quiz,other', 'trophies: union');
check(put2.body.pull.progress.data.coins === 120, 'coins: newest wins');
// same data again → nothing to pull
const put3 = await A.rpc('save_put', { profileId: profile.id, parts: { prefs: part(now - 1000, { difficulty: 3 }) }, have: { profile: now, cards: now, progress: now } });
check(put3.status === 200 && Object.keys(put3.body.pull).length === 0, 'newer plain part accepted, nothing to pull');
// a phone that knows nothing gets every part
const put4 = await A.rpc('save_put', { profileId: profile.id, parts: {} });
check(Object.keys(put4.body.pull).sort().join() === 'cards,prefs,profile,progress' && put4.body.pull.prefs.data.difficulty === 3, '`have` missing → all parts pulled');
// a clock in the future is clamped to the server's time
await A.rpc('save_put', { profileId: profile.id, parts: { settings: part(now + 365 * 86400e3, { sfx: false }) } });
got = (await A.rpc('save_get', {})).body;
check(got.save.parts.settings.at <= Date.now() + 1000, 'future `at` clamped to server time');

// validation
check((await A.rpc('save_put', { parts: {} })).status === 400, 'profileId required');
check((await A.rpc('save_put', { profileId: profile.id, parts: { secrets: part(1, {}) } })).status === 400, 'unknown part refused');
check((await A.rpc('save_put', { profileId: profile.id, parts: { stats: { at: 'x', data: {} } } })).status === 400, 'bad part refused');
check((await A.rpc('save_put', { profileId: profile.id, parts: { stats: part(1, [1, 2]) } })).status === 400, 'part data must be an object');
const big = await A.rpc('save_put', { profileId: profile.id, parts: { stats: part(1, { junk: 'x'.repeat(250 * 1024) }) } });
check(big.status === 400 && /too_big/.test(JSON.stringify(big.body)), `over 240 KB refused: too_big (${big.status})`);
const huge = await A.rpc('save_put', { profileId: profile.id, parts: { stats: part(1, { junk: 'x'.repeat(1100 * 1024) }) } });
check(huge.status === 400, `over 1 MB refused (${huge.status})`);
const badName = await A.rpc('save_put', { profileId: profile.id, parts: { profile: part(Date.now(), { ...profile, username: 'Jean Pierre' }) } });
check(badName.status === 200 && badName.body.pull.profile && badName.body.pull.profile.data.username !== 'Jean Pierre', `typed name replaced by a generated one (${badName.body.pull?.profile?.data.username})`);
await A.rpc('save_put', { profileId: profile.id, parts: { profile: part(Date.now(), profile) } });

// another kid's save on this account (another phone chose its own progress): conflict unless force
const conf = await A.rpc('save_put', { profileId: 'other' + RUN, parts: { progress: part(Date.now(), { ...progress, xp: 1 }) } });
check(conf.status === 200 && conf.body.conflict === true && conf.body.profileId === profile.id, 'different profileId → conflict, nothing written');
check((await A.rpc('save_get', {})).body.save.parts.progress.data.xp === 340, 'save unchanged after conflict');

// ── phone B: wrong codes are rate limited ──
const B = await phone();
const wrong = code.replace(/-(\d{4})$/, (m, d) => '-' + (d === '2222' ? '3333' : '2222'));
let statuses = [];
for (let i = 0; i < 5; i++) statuses.push((await B.rpc('account_recover', { code: i === 0 ? 'nonsense' : wrong, preview: true })).status);
check(statuses.every((s) => s === 404), `5 wrong codes → 404 (${statuses.join(',')})`);
const limited = await B.rpc('account_recover', { code, preview: true });
check(limited.status === 429 && /rate_limited/.test(JSON.stringify(limited.body)), `6th try within the hour → 429 even with the right code (${limited.status})`);

// ── phone C (new phone): preview then recover with the code ──
const C = await phone();
const own = (await C.rpc('account_info', {})).body.code;
check(own && own !== code, `codes are unique per account (${own})`);
const same = await C.rpc('account_recover', { code: own, preview: true });
check(same.status === 409 && /same_account/.test(JSON.stringify(same.body)), 'own code → 409 same_account');
const pv = await C.rpc('account_recover', { code: code.toLowerCase().replace('-', ' '), preview: true });
check(pv.status === 200 && pv.body.hasSave && pv.body.preview?.username === 'Mango 12' && pv.body.preview.xp === 340 && pv.body.preview.cards === 2, `preview (typed in lower case, no dash): ${JSON.stringify(pv.body.preview)}`);
check((await C.rpc('account_recover', { code, deviceId: 'not-a-device' })).status === 400, 'bad deviceId refused');
const newDev = 'kns-' + hex();
const rec = await C.rpc('account_recover', { code, deviceId: newDev });
check(rec.status === 200 && rec.body.ok && rec.body.save?.parts.progress.data.xp === 340 && rec.body.code === code, 'account_recover links the new device + returns the save');
const C2 = await phone(newDev);
check(C2.uid === A.uid, 'the new device id now logs into the kid\'s account');
check((await C2.rpc('save_get', {})).body.save?.profileId === profile.id, 'save_get from the new phone');
check((await C2.rpc('account_info', {})).body.code === code, 'same recovery code on the new phone');
check((await A.rpc('account_info', {})).body.code === code, 'old phone still works');

// the new phone chose "keep this phone's progress" → force replaces the save
const forced = await C2.rpc('save_put', { profileId: 'pC' + RUN, force: true, parts: { profile: part(Date.now(), { ...profile, id: 'pC' + RUN, username: 'Toti 7' }), progress: part(Date.now(), { ...progress, xp: 50 }) } });
check(forced.status === 200 && forced.body.ok, 'force upload');
const after = (await A.rpc('save_put', { profileId: profile.id, parts: {} })).body;
check(after.conflict === true && after.profileId === 'pC' + RUN, 'the old phone now sees a conflict → it takes the account\'s save');

// many accounts → unique codes
const codes = new Set([code, own]);
for (let i = 0; i < 20; i++) codes.add((await (await phone()).rpc('account_info', {})).body.code);
check(codes.size === 22, `22 accounts → 22 different codes`);

// per-address brake: a new phone on the same network has its own 5 tries, but the address has 30
const D = await phone();
check((await D.rpc('account_recover', { code: wrong, preview: true })).status === 404, 'another phone on the same network can still try');

console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
