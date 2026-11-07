// Two simulated kids play a real duel against a running Nakama. Needs: npm i @heroiclabs/nakama-js ws (in a scratch folder)
// Two simulated kids play a real duel against local Nakama; then one kid alone gets Robo.
import WebSocket from 'ws';
globalThis.WebSocket = WebSocket;
const { Client } = await import('@heroiclabs/nakama-js');
const client = new Client('konesans-server-key', '127.0.0.1', '7350', false);
const OP = { STATE: 1, ANSWER: 2, REACT: 3 };
let ok = 0, bad = 0; const check = (c, m) => { c ? ok++ : bad++; console.log(c ? '  ✓' : '  ✖', m); };
const dec = (d) => JSON.parse(typeof d === 'string' ? d : new TextDecoder().decode(d));

async function kid(name, age, online = true) {
  const s = await client.authenticateDevice('dev-' + name.replace(/[^a-z0-9]/gi, '') + '-' + Date.now(), true);
  await client.rpc(s, 'profile_set', { name, avatar: { skin: 2, hair: 'afro' } });
  await client.rpc(s, 'online_set', { on: online, age });
  const sock = client.createSocket(false, false);
  await sock.connect(s, true);
  const k = { s, sock, name, states: [], last: null, id: s.user_id };
  sock.onmatchdata = (md) => { if (md.op_code === OP.STATE) { k.last = dec(md.data); k.states.push(k.last); } };
  return k;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await wait(100); } return false; }

// --- refused without the parent switch
const off = await kid('Off', '9-11', false);
try { await client.rpc(off.s, 'find_duel', { age: '9-11', category: 'mix' }); check(false, 'refused without parent switch'); }
catch (e) { check(true, 'refused without parent switch'); }
off.sock.disconnect(false);

// --- two kids, same age → matched together
const a = await kid('Zandolit', '9-11'), b = await kid('Malfini', '9-11');
// Same logic as the app: join a game, and while alone keep looking; if another kid's game is waiting,
// the kid whose game id sorts higher moves to the lower one (so two waiting kids always meet).
async function findOpponent(k, age) {
  let cur = (await client.rpc(k.s, 'find_duel', { age, category: 'mix' })).payload.matchId;
  await k.sock.joinMatch(cur); k.matchId = cur;
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    await wait(800);
    if (k.last && k.last.players.length >= 2) return cur;
    const other = (await client.rpc(k.s, 'find_duel', { age, category: 'mix', waitingIn: cur })).payload.matchId;
    if (other && other !== cur && other < cur) { await k.sock.leaveMatch(cur); k.last = null; cur = other; await k.sock.joinMatch(cur); k.matchId = cur; }
  }
  return cur;
}
// both start searching at the very same moment (the hard case)
const [ma, mb] = await Promise.all([findOpponent(a, '9-11'), findOpponent(b, '9-11')]);
const ra = { matchId: a.matchId };
check(a.matchId === b.matchId, 'two kids searching at the same moment end up in the same game');
check(await until(() => a.last?.phase === 'question' && b.last?.phase === 'question'), 'both see the first question');
const v = a.last;
check(v.players.length === 2 && v.players.every((p) => !p.isBot), 'two real players, no Robo');
 check(v.players.every((p) => p.avatar && p.avatar.hair === 'afro'), 'avatars shown to the other kid');
check(v.players.map((p) => p.username).sort().join() === 'Malfini,Zandolit', 'display names shown: ' + v.players.map((p) => p.username).join(' vs '));
check(v.question && v.question.answer === undefined, 'answer key hidden during the question');
// play all questions: A always picks 0, B picks 1
let rounds = 0;
while (rounds < 12) {
  const idx = a.last.index;
  // the server ignores answers before the question shows (3 s VS intro before question 1)
  if (a.last.serverNow && a.last.phaseStartedAt > a.last.serverNow) await new Promise((r) => setTimeout(r, a.last.phaseStartedAt - a.last.serverNow + 150));
  await a.sock.sendMatchState(ra.matchId, OP.ANSWER, JSON.stringify({ chosen: 0 }));
  await b.sock.sendMatchState(ra.matchId, OP.ANSWER, JSON.stringify({ chosen: 1 }));
  if (rounds === 0) await a.sock.sendMatchState(ra.matchId, OP.REACT, JSON.stringify({ reaction: (await import(new URL('../../packages/core/dist/index.js', import.meta.url))).PRESET_REACTIONS[0].id ?? 'bravo' }));
  await until(() => a.last.phase === 'reveal' || a.last.phase === 'ended');
  if (rounds === 0) check(a.last.question.answer !== undefined && a.last.players.find((p) => p.id === b.id).chosen === 1, 'after both answer: answer and the other kid\'s choice revealed');
  rounds++;
  if (a.last.phase === 'ended') break;
  await until(() => (a.last.phase === 'question' && a.last.index > idx) || a.last.phase === 'ended', 6000);
  if (a.last.phase === 'ended') break;
}
check(a.last.phase === 'ended' && a.last.total === 10, `game ends after ${a.last.total} questions`);
const sa = a.last.players.find((p) => p.id === a.id).score, sb = a.last.players.find((p) => p.id === b.id).score;
check(a.last.winnerId === (sa > sb ? a.id : sb > sa ? b.id : null), `winner matches scores (${sa} – ${sb})`);
check(JSON.stringify(b.last.players.map((p) => p.score)) === JSON.stringify(a.last.players.map((p) => p.score)), 'both phones agree on the score');

// --- different age → not matched
const c = await kid('Ti Kabrit', '6-8'), d = await kid('Pwason', '12-14');
const rc = (await client.rpc(c.s, 'find_duel', { age: '6-8', category: 'mix' })).payload; await c.sock.joinMatch(rc.matchId);
const rd = (await client.rpc(d.s, 'find_duel', { age: '12-14', category: 'mix' })).payload;
check(rc.matchId !== rd.matchId, 'kids of different ages are not matched');
// --- alone → Robo joins after ~10 s
check(await until(() => c.last?.phase === 'question', 14000) && c.last.players.some((p) => p.isBot), 'alone for 10 s → Robo joins: ' + (c.last?.players.find((p) => p.isBot)?.username ?? '-'));

for (const k of [a, b, c, d]) k.sock.disconnect(false);
console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
