#!/usr/bin/env node
/**
 * Age / class change requests end to end against a running Nakama (docs/API.md "Change requests").
 *   BASE=http://127.0.0.1:7350 SERVER_KEY=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node server/test/requests-smoke.mjs
 * Plain fetch: no npm packages needed.
 */
const { BASE = 'http://127.0.0.1:7350', SERVER_KEY = 'konesans-server-key', ADMIN_EMAIL = 'admin@konesans.test', ADMIN_PASSWORD = 'testpass123' } = process.env;
let ok = 0, bad = 0;
const check = (cond, msg) => { if (cond) { ok++; console.log('  ✓', msg); } else { bad++; console.log('  ✖', msg); } };
const basic = 'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64');
async function call(path, body, auth) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: auth }, body: JSON.stringify(body ?? {}) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
}
const rpcAs = (token) => (id, body) => call(`/v2/rpc/${id}?unwrap`, body, 'Bearer ' + token);

// admin
const adm = (await call('/v2/account/authenticate/email?create=false', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, basic)).body;
check(!!adm.token, 'admin login');
const A = rpcAs(adm.token);

// a kid's phone: anonymous device account, duels switched on by a parent at 6-8
const dev = 'kns-req-' + Date.now().toString(16);
const kid = (await call('/v2/account/authenticate/device?create=true', { id: dev }, basic)).body;
check(!!kid.token, 'kid device session');
const uid = JSON.parse(Buffer.from(kid.token.split('.')[1], 'base64url').toString()).uid;
const K = rpcAs(kid.token);
await K('profile_set', { name: 'Zanmi Tès', avatar: { skin: 1 } });
await K('online_set', { on: true, age: '6-8' });

check((await K('change_request_status', {})).body.request === null, 'no request yet → null');

// validation
check((await K('change_request_submit', { age: '15-18' })).status === 400, 'bad age band refused');
check((await K('change_request_submit', { grade: 'univ' })).status === 400, 'bad grade refused');
check((await K('change_request_submit', { age: '6-8', current: { age: '6-8' } })).status === 400, 'same value → nothing to change');
check((await K('change_request_submit', {})).status === 400, 'empty request refused');

// submit
const long = 'Li fèk gen 9 an\u0000 epi li nan 4yèm ane. '.repeat(10);
const sub = await K('change_request_submit', { age: '9-11', grade: 'af4', reason: long, current: { age: '6-8', grade: null }, name: 'ignored-if-display-name' });
const r1 = sub.body.request;
check(sub.status === 200 && r1?.status === 'pending' && r1.requested.age === '9-11' && r1.requested.grade === 'af4', 'change_request_submit → pending');
check(r1 && r1.reason.length <= 140 && !/\u0000/.test(r1.reason), `reason cleaned + capped (${r1?.reason.length} chars)`);
check(r1 && !('resolvedBy' in r1) && !('userId' in r1), 'kid view has no admin email / ids');
const dup = await K('change_request_submit', { age: '12-14', current: { age: '6-8' } });
check(dup.status === 409 && /pending_exists/.test(JSON.stringify(dup.body)), `one pending at a time (${dup.status})`);
check((await K('change_request_status', {})).body.request?.id === r1.id, 'change_request_status → the pending one');

// admin side
const denied = await K('admin_change_requests_list', {});
check(denied.status >= 400, `kid can't list requests (${denied.status})`);
const st = await A('admin_stats'); check(st.body.requests?.pending >= 1, `admin_stats requests.pending = ${st.body.requests?.pending}`);
const pend = await A('admin_change_requests_list', { status: 'pending' });
const mine = pend.body.requests?.find((r) => r.id === r1.id);
check(!!mine && mine.username === 'Zanmi Tès' && mine.userId === uid && mine.current.age === '6-8', 'admin_change_requests_list pending has it (username, current values)');
check(pend.body.requests.every((r) => r.status === 'pending') && pend.body.pending >= 1, 'pending filter');
check((await A('admin_change_request_resolve', { id: 'nope', approve: true })).status === 400, 'resolve: bad id refused');
check((await A('admin_change_request_resolve', { id: r1.id })).status === 400, 'resolve: approve flag required');
const res = await A('admin_change_request_resolve', { id: r1.id, approve: true, note: 'Bon, mèsi!' });
check(res.status === 200 && res.body.request.status === 'approved' && res.body.request.resolvedBy === ADMIN_EMAIL, 'admin_change_request_resolve approve');
check((await A('admin_change_request_resolve', { id: r1.id, approve: false })).status === 400, 'already resolved → refused');

// kid sees it, server-side age for duel matching updated
const after = (await K('change_request_status', {})).body.request;
check(after?.status === 'approved' && after.note === 'Bon, mèsi!' && !!after.resolvedAt, 'kid status → approved with note');
const settings = await call('/v2/storage', { object_ids: [{ collection: 'settings', key: 'kid', user_id: uid }] }, 'Bearer ' + kid.token);
const sv = settings.body.objects?.[0] ? JSON.parse(settings.body.objects[0].value) : null;
check(sv?.age === '9-11' && sv.grade === 'af4' && sv.randomDuelsAllowed === true, `server settings.kid age=${sv?.age} grade=${sv?.grade} (duels still on)`);
const audit = (await A('admin_audit')).body.entries;
check(audit[0]?.action === 'request:approve' && /Zanmi Tès/.test(audit[0].target), 'audit entry written');

// refuse path + rate limit (3 per day per device; the approved one counts)
const r2 = (await K('change_request_submit', { age: '12-14', current: { age: '9-11', grade: 'af4' } })).body.request;
check(r2?.status === 'pending', 'second request after approval');
const ref = await A('admin_change_request_resolve', { id: r2.id, approve: false });
check(ref.body.request?.status === 'refused', 'refuse');
const s2 = await call('/v2/storage', { object_ids: [{ collection: 'settings', key: 'kid', user_id: uid }] }, 'Bearer ' + kid.token);
check(JSON.parse(s2.body.objects[0].value).age === '9-11', 'refused request leaves the age alone');
check((await K('change_request_status', {})).body.request?.status === 'refused', 'kid status → refused');
const r3 = (await K('change_request_submit', { grade: 'af5', current: { age: '9-11', grade: 'af4' } })).body.request;
await A('admin_change_request_resolve', { id: r3.id, approve: false });
const lim = await K('change_request_submit', { grade: 'af6', current: { age: '9-11', grade: 'af4' } });
check(lim.status === 429 && /rate_limited/.test(JSON.stringify(lim.body)), `4th request in a day refused (${lim.status})`);

const all = await A('admin_change_requests_list', { status: 'all' });
check(all.body.requests.filter((r) => r.userId === uid).length === 3, 'list all → 3 for this kid, newest first: ' + all.body.requests.filter((r) => r.userId === uid).map((r) => r.status).join(','));

console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
