// "Batay ak yon zanmi": private duels by 4-digit code against a running local Nakama (see duel-smoke.mjs for setup).
// node server/test/friend-smoke.mjs
import WebSocket from 'ws';
globalThis.WebSocket = WebSocket;
const { Client } = await import('@heroiclabs/nakama-js');
const client = new Client('konesans-server-key', '127.0.0.1', '7350', false);
const OP = { STATE: 1, ANSWER: 2 };
let ok = 0, bad = 0; const check = (c, m) => { c ? ok++ : bad++; console.log(c ? '  ✓' : '  ✖', m); };
const dec = (d) => JSON.parse(typeof d === 'string' ? d : new TextDecoder().decode(d));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await wait(100); } return false; }
const errOf = async (p) => { try { await p; return null; } catch (e) { try { const j = await e.json(); return j.message || JSON.stringify(j); } catch { return String(e?.message ?? e); } } };

async function kid(name, age, online = true) {
  const s = await client.authenticateDevice('fr-' + name.replace(/[^a-z0-9]/gi, '') + '-' + Date.now() + Math.random().toString(36).slice(2, 6), true);
  await client.rpc(s, 'profile_set', { name, avatar: { skin: 1, hair: 'braids' } });
  await client.rpc(s, 'online_set', { on: online, age });
  const sock = client.createSocket(false, false);
  await sock.connect(s, true);
  const k = { s, sock, name, last: null, id: s.user_id };
  sock.onmatchdata = (md) => { if (md.op_code === OP.STATE) k.last = dec(md.data); };
  return k;
}
const rpc = async (k, id, body) => (await client.rpc(k.s, id, body)).payload;

// --- consent: both kids need the parent's online permission
const off = await kid('Off', '9-11', false);
check(/online_not_allowed/.test(await errOf(client.rpc(off.s, 'friend_duel_create', { age: '9-11' })) ?? ''), 'no code without the parent switch');
check(/online_not_allowed/.test(await errOf(client.rpc(off.s, 'friend_duel_join', { code: '1234' })) ?? ''), 'cannot join without the parent switch');

// --- host makes a code (host's age band), guest joins with it
const host = await kid('Toti', '6-8'), guest = await kid('Choukoun', '12-14');
const c = await rpc(host, 'friend_duel_create', { age: '6-8' });
check(/^[0-9]{4}$/.test(c.code) && c.matchId && c.age === '6-8', `code ${c.code} for a private match (age ${c.age})`);
check(c.expiresAt - Date.now() > 9 * 60_000 && c.expiresAt - Date.now() <= 10 * 60_000 + 2000, 'code lives 10 minutes');
check((await rpc(host, 'friend_duel_status', { code: c.code })).state === 'waiting', 'host sees "waiting"');

// not findable by random matchmaking (same age band)
const rnd = await kid('Random', '6-8');
const found = await rpc(rnd, 'find_duel', { age: '6-8', category: 'mix' });
check(found.matchId !== c.matchId, 'find_duel never hands out the private match');
await client.rpc(rnd.s, 'find_duel', { age: '6-8', category: 'mix', waitingIn: found.matchId }).then((r) => check(r.payload.matchId !== c.matchId, 'nor while waiting'));
// nobody can walk in with the match id alone
check(!!(await errOf(rnd.sock.joinMatch(c.matchId))), 'joining the private match without the code is refused');

check(/own_code/.test(await errOf(client.rpc(host.s, 'friend_duel_join', { code: c.code })) ?? ''), 'host cannot use their own code');
const wrongCode = String(((Number(c.code) - 1000 + 4500) % 9000) + 1000);
check(/bad_code|code_expired/.test(await errOf(client.rpc(guest.s, 'friend_duel_join', { code: wrongCode })) ?? ''), 'unknown code → bad_code');
check(/bad_code/.test(await errOf(client.rpc(guest.s, 'friend_duel_join', { code: '12a4' })) ?? ''), 'malformed code → bad_code');

const j = await rpc(guest, 'friend_duel_join', { code: c.code });
check(j.matchId === c.matchId && j.age === '6-8' && j.hostName === 'Toti', 'guest gets the match, the host\'s age band and name');
check(/code_expired/.test(await errOf(client.rpc(rnd.s, 'friend_duel_join', { code: c.code })) ?? ''), 'a used code cannot be used again');
const st = await rpc(host, 'friend_duel_status', { code: c.code });
check(st.state === 'joined' && st.matchId === c.matchId, 'host sees "joined"');

// --- both join (guest first, host after its poll) → the game runs, no Robo
await guest.sock.joinMatch(j.matchId);
await wait(11500); // longer than the 10 s after which a random duel gets Robo
check(guest.last?.phase === 'lobby' && guest.last.players.length === 1, 'guest waits alone for the host: no Robo after 10 s');
await host.sock.joinMatch(c.matchId);
check(await until(() => host.last?.phase === 'question' && guest.last?.phase === 'question'), 'both see the first question');
check(host.last.players.length === 2 && host.last.players.every((p) => !p.isBot), 'two real players, no Robo');
check(host.last.questionMs === 30000, '6–8 clock (host age band) for both');
let rounds = 0;
while (rounds < 12 && host.last.phase !== 'ended') {
  const idx = host.last.index;
  if (host.last.phase === 'question') {
    await host.sock.sendMatchState(c.matchId, OP.ANSWER, JSON.stringify({ chosen: 0 }));
    await guest.sock.sendMatchState(c.matchId, OP.ANSWER, JSON.stringify({ chosen: 1 }));
  }
  await until(() => host.last.phase === 'ended' || (host.last.index !== idx && host.last.phase === 'question'), 20000);
  rounds++;
}
check(host.last.phase === 'ended' && host.last.endReason === 'completed', 'friend duel plays to the end');

// --- host cancels a waiting code; the code is freed and the match refuses joins
const c2 = await rpc(host, 'friend_duel_create', { age: '9-11' });
await rpc(host, 'friend_duel_cancel', { code: c2.code });
check(/bad_code/.test(await errOf(client.rpc(guest.s, 'friend_duel_join', { code: c2.code })) ?? ''), 'cancelled code no longer works');
check((await rpc(host, 'friend_duel_status', { code: c2.code })).state === 'expired', 'cancelled code shows as expired');

// --- a new code replaces the host's previous waiting code
const c3 = await rpc(host, 'friend_duel_create', { age: '9-11' });
const c4 = await rpc(host, 'friend_duel_create', { age: '9-11' });
check(/bad_code/.test(await errOf(client.rpc(guest.s, 'friend_duel_join', { code: c3.code })) ?? '') || c3.code === c4.code, 'a new code replaces the old one');

// --- rate limits: creating codes, and guessing codes
let limited = false;
for (let i = 0; i < 8 && !limited; i++) limited = /rate_limited/.test(await errOf(client.rpc(host.s, 'friend_duel_create', { age: '9-11' })) ?? '');
check(limited, 'too many codes → rate_limited');
const guesser = await kid('Guesser', '9-11');
let gl = false;
for (let i = 0; i < 12 && !gl; i++) gl = /rate_limited/.test(await errOf(client.rpc(guesser.s, 'friend_duel_join', { code: String(1000 + i) })) ?? '');
check(gl, 'too many wrong codes → rate_limited');

// --- guest's parent switch must still be on for the host too
const h2 = await kid('Host2', '9-11'), g2 = await kid('Guest2', '9-11');
const c5 = await rpc(h2, 'friend_duel_create', { age: '9-11' });
await client.rpc(h2.s, 'online_set', { on: false, age: '9-11' });
check(/host_not_allowed/.test(await errOf(client.rpc(g2.s, 'friend_duel_join', { code: c5.code })) ?? ''), 'host lost the permission → host_not_allowed');

for (const k of [off, host, guest, rnd, guesser, h2, g2]) k.sock.disconnect(false);
console.log(`${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
