/**
 * Cloud save: the kid's progress snapshot kept on the server under their (anonymous) account, so a new phone can
 * get it back with a recovery code (or a linked Google account). Used by the app (apps/mobile/src/lib/cloud.ts)
 * and by the server (server/nakama/src/account.ts), so both merge the same way.
 *
 * A save is split in parts (one per persisted store slice). Each part carries `at` = when it last changed on a
 * phone. Merge rule, per part:
 *   - the newest part wins (higher `at`), so an older phone never overwrites newer data;
 *   - but things a kid earned never go away: XP, trophies, hero cards, finished lessons/stars, departments,
 *     counters, unlocked and bought avatar items… take the max / union of both sides.
 * Pure functions, no I/O. Written in plain ES5-friendly style (the Nakama runtime bundles this file).
 */

export const SAVE_PARTS = ['profile', 'progress', 'courses', 'stats', 'missions', 'settings', 'kidSettings', 'coding', 'extra', 'cards', 'vwayaj', 'prefs'] as const;
export type SavePart = (typeof SAVE_PARTS)[number];
export interface SavePartRec { at: number; data: Record<string, any> }
export type SaveParts = Partial<Record<SavePart, SavePartRec>>;
export interface CloudSave { v: 1; profileId: string; updatedAt: number; parts: SaveParts }

/**
 * Hard cap for one upload; the server refuses more. Kept under Nakama's default request cap (256 KB; production
 * allows 1 MB). A real save is ~10–60 KB.
 */
export const SAVE_MAX_BYTES = 240 * 1024;
/** Cap for the spaced-repetition list kept in the cloud (most recently due first). */
export const SAVE_MAX_REVIEW = 400;

// ---------- small safe readers (data may come from an old app version or a bad client) ----------
const isObj = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
const obj = (x: unknown): Record<string, any> => (isObj(x) ? x : {});
const num = (x: unknown): number => (typeof x === 'number' && isFinite(x) ? x : 0);
const strs = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v) => typeof v === 'string') : []);
const max = (a: unknown, b: unknown) => Math.max(num(a), num(b));
/** Union keeping `a`'s order first. */
function union(a: unknown, b: unknown): string[] {
  const out = strs(a).slice();
  const seen: Record<string, true> = {};
  for (let i = 0; i < out.length; i++) seen[out[i]] = true;
  const bb = strs(b);
  for (let i = 0; i < bb.length; i++) if (!seen[bb[i]]) { seen[bb[i]] = true; out.push(bb[i]); }
  return out;
}
/** Per-key max of two number maps. */
function maxMap(a: unknown, b: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const A = obj(a), B = obj(b);
  for (const k in A) out[k] = num(A[k]);
  for (const k in B) out[k] = Math.max(out[k] === undefined ? -Infinity : out[k], num(B[k]));
  return out;
}
const earlierDay = (a: unknown, b: unknown): string | null => {
  const x = typeof a === 'string' && a ? a : null, y = typeof b === 'string' && b ? b : null;
  return !x ? y : !y ? x : x <= y ? x : y;
};
const laterDay = (a: unknown, b: unknown): string | null => {
  const x = typeof a === 'string' ? a : null, y = typeof b === 'string' ? b : null;
  return !x ? y : !y ? x : x >= y ? x : y;
};

// ---------- per-part merges: `n` = newest data, `o` = older data ----------
function mergeProgress(n: Record<string, any>, o: Record<string, any>) {
  const badges: Record<string, string> = {};
  const nb = obj(n.badges), ob = obj(o.badges);
  for (const k in ob) if (typeof ob[k] === 'string') badges[k] = ob[k];
  for (const k in nb) if (typeof nb[k] === 'string') badges[k] = badges[k] && badges[k] < nb[k] ? badges[k] : nb[k]; // keep the first time it was won
  const ns = obj(n.streak), os = obj(o.streak);
  const streak = (String(os.lastDay || '') > String(ns.lastDay || '')) || (os.lastDay === ns.lastDay && num(os.count) > num(ns.count)) ? os : ns;
  let quests = Array.isArray(n.quests) ? n.quests : [];
  let questsDay = n.questsDay ?? null;
  if (o.questsDay && (!n.questsDay || o.questsDay > n.questsDay)) { quests = Array.isArray(o.quests) ? o.quests : []; questsDay = o.questsDay; }
  else if (o.questsDay && o.questsDay === n.questsDay && Array.isArray(o.quests)) {
    // same day on two phones: a quest is as far as the furthest phone got
    quests = quests.map((q: any) => {
      const other = (o.quests as any[]).filter((x) => x && q && x.id === q.id)[0];
      return other && isObj(q) ? { ...q, progress: max(q.progress, other.progress), done: !!(q.done || other.done) } : q;
    });
  }
  return {
    ...o, ...n,
    xp: max(n.xp, o.xp),
    coins: n.coins !== undefined ? num(n.coins) : num(o.coins), // coins may be spent one day: newest wins
    streak, quests, questsDay, badges,
    heroCards: union(n.heroCards, o.heroCards),
    categoryLevel: maxMap(n.categoryLevel, o.categoryLevel),
    review: isObj(n.review) ? n.review : obj(o.review),
  };
}

function mergeCourse(n: unknown, o: unknown) {
  const nl = obj(obj(n).lessons), ol = obj(obj(o).lessons);
  const lessons: Record<string, any> = {};
  for (const k in ol) if (isObj(ol[k])) lessons[k] = ol[k];
  for (const k in nl) {
    const a = nl[k], b = lessons[k];
    if (!isObj(a)) continue;
    lessons[k] = !b ? a : {
      stars: Math.max(num(a.stars), num(b.stars)) || 1, best: max(a.best, b.best), times: max(a.times, b.times),
      doneAt: String(a.doneAt || '') >= String(b.doneAt || '') ? a.doneAt : b.doneAt,
    };
  }
  return { ...obj(o), ...obj(n), lessons };
}

function mergeCourses(n: Record<string, any>, o: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const k in o) out[k] = mergeCourse(undefined, o[k]);
  for (const k in n) out[k] = mergeCourse(n[k], o[k]);
  return out;
}

const STAT_COUNTERS = ['duels', 'duelWins', 'lessons', 'questionsAnswered', 'correct', 'mathBest'];
function mergeStats(n: Record<string, any>, o: Record<string, any>) {
  const out: Record<string, any> = { ...o, ...n, perCategoryCorrect: maxMap(n.perCategoryCorrect, o.perCategoryCorrect) };
  for (let i = 0; i < STAT_COUNTERS.length; i++) {
    const k = STAT_COUNTERS[i];
    if (n[k] !== undefined || o[k] !== undefined) out[k] = max(n[k], o[k]);
  }
  return out;
}

function mergeMissions(n: Record<string, any>, o: Record<string, any>) {
  return {
    ...o, ...n,
    chestDay: laterDay(n.chestDay, o.chestDay),
    fullDays: union(n.fullDays, o.fullDays).sort().slice(-21),
    legendWeeks: union(n.legendWeeks, o.legendWeeks).sort(),
    firstDay: earlierDay(n.firstDay, o.firstDay), // the kid's mission weeks count from their first play day
  };
}

function mergeExtra(n: Record<string, any>, o: Record<string, any>) {
  return {
    ...o, ...n,
    rankSeen: Math.max(typeof n.rankSeen === 'number' ? n.rankSeen : -1, typeof o.rankSeen === 'number' ? o.rankSeen : -1),
    unlocked: union(n.unlocked, o.unlocked),
    seenUnlocks: union(n.seenUnlocks, o.seenUnlocks),
    bought: union(n.bought, o.bought), // avatar shop items: once bought, kept on every phone
    onboarded: !!(n.onboarded || o.onboarded),
  };
}

function mergeCards(n: Record<string, any>, o: Record<string, any>) {
  const read = union(n.read, o.read);
  return { ...o, ...n, owned: union(n.owned, o.owned), read, fresh: union(n.fresh, o.fresh).filter((id) => read.indexOf(id) < 0) };
}

function mergeVwayaj(n: Record<string, any>, o: Record<string, any>) {
  const done: Record<string, any> = {};
  const nd = obj(n.done), od = obj(o.done);
  for (const k in od) if (isObj(od[k])) done[k] = od[k];
  for (const k in nd) {
    const a = nd[k], b = done[k];
    if (!isObj(a)) continue;
    done[k] = !b ? a : { best: max(a.best, b.best), day: earlierDay(a.day, b.day) };
  }
  return { ...o, ...n, done, best: maxMap(n.best, o.best), eventsPlayed: union(n.eventsPlayed, o.eventsPlayed) };
}

const MERGERS: Partial<Record<SavePart, (n: Record<string, any>, o: Record<string, any>) => Record<string, any>>> = {
  progress: mergeProgress, courses: mergeCourses, stats: mergeStats, missions: mergeMissions, coding: maxMap,
  extra: mergeExtra, cards: mergeCards, vwayaj: mergeVwayaj,
  // profile, settings, kidSettings, prefs: newest wins as a whole
};

/** Merge one part from two sides. Either side may be missing. */
export function mergePart(key: SavePart, a: SavePartRec | undefined, b: SavePartRec | undefined): SavePartRec | undefined {
  const okA = !!a && isObj(a.data), okB = !!b && isObj(b.data);
  if (!okA) return okB ? { at: num(b!.at), data: b!.data } : undefined;
  if (!okB) return { at: num(a!.at), data: a!.data };
  const newer = num(b!.at) >= num(a!.at) ? b! : a!;
  const older = newer === b ? a! : b!;
  const f = MERGERS[key];
  return { at: Math.max(num(a!.at), num(b!.at)), data: f ? f(newer.data, older.data) : newer.data };
}

/** Merge two whole saves of the same kid (same profileId). */
export function mergeSaves(a: CloudSave, b: CloudSave): CloudSave {
  const parts: SaveParts = {};
  for (let i = 0; i < SAVE_PARTS.length; i++) {
    const k = SAVE_PARTS[i];
    const m = mergePart(k, a.parts[k], b.parts[k]);
    if (m) parts[k] = m;
  }
  return { v: 1, profileId: b.profileId || a.profileId, updatedAt: Math.max(num(a.updatedAt), num(b.updatedAt)), parts };
}

// ---------- helpers for both sides ----------

/** Small stable hash of a JSON string (djb2, hex) — "did this part change since the last upload?". */
export function hashText(s: string): string {
  let h = 5381, h2 = 52711;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h = (h * 33) ^ c; h2 = (h2 * 33) ^ c; }
  return (h >>> 0).toString(16) + (h2 >>> 0).toString(16) + s.length.toString(16);
}

/** JSON with object keys sorted, so two equal values always give the same text (key order may differ after a merge). */
export function stableJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) { const parts: string[] = []; for (let i = 0; i < v.length; i++) parts.push(stableJson(v[i])); return '[' + parts.join(',') + ']'; }
  const keys = Object.keys(v as object).sort();
  const parts: string[] = [];
  for (let i = 0; i < keys.length; i++) { const x = (v as any)[keys[i]]; if (x !== undefined) parts.push(JSON.stringify(keys[i]) + ':' + stableJson(x)); }
  return '{' + parts.join(',') + '}';
}

/** Drop data that is only a convenience (it can be rebuilt) so the save stays small. */
export function trimProgress(p: Record<string, any>): Record<string, any> {
  const review = obj(p.review);
  const keys = Object.keys(review);
  if (keys.length <= SAVE_MAX_REVIEW) return p;
  keys.sort((x, y) => (String(obj(review[y]).due) > String(obj(review[x]).due) ? 1 : -1));
  const kept: Record<string, any> = {};
  for (let i = 0; i < SAVE_MAX_REVIEW; i++) kept[keys[i]] = review[keys[i]];
  return { ...p, review: kept };
}

/** What a save "is worth", shown before restoring ("Se ou? Mango 12 · 340 XP · 5 kat"). */
export interface SavePreview { username: string; avatar?: unknown; xp: number; cards: number; badges: number; lessons: number; updatedAt: number }
export function savePreview(s: CloudSave | null | undefined): SavePreview | null {
  if (!s || !isObj(s.parts)) return null;
  const pr = obj(s.parts.profile && s.parts.profile.data), pg = obj(s.parts.progress && s.parts.progress.data);
  const st = obj(s.parts.stats && s.parts.stats.data), cd = obj(s.parts.cards && s.parts.cards.data);
  return {
    username: typeof pr.username === 'string' ? pr.username : '', avatar: isObj(pr.avatar) ? pr.avatar : undefined,
    xp: num(pg.xp), cards: strs(cd.owned).length, badges: Object.keys(obj(pg.badges)).length, lessons: num(st.lessons), updatedAt: num(s.updatedAt),
  };
}

// ---------- recovery codes: "MANGO-4821" ----------

/**
 * Kid-friendly words (Kreyòl, plain A–Z so they are easy to type). Curated: no word that is used as an insult
 * (no animals like makak, bourik, kochon, chen, krapo…), no names of people.
 */
export const CODE_WORDS = [
  'MANGO', 'ZABOKA', 'KOKOYE', 'PAPAY', 'BANNANN', 'ANANA', 'KOROSOL', 'SITWON', 'ZORANJ', 'KENEP', 'MELON', 'FREZ', 'REZEN', 'SIRIZ', 'CHADEK', 'GRENADYA',
  'ZWAZO', 'PAPIYON', 'KANNA', 'LAPEN', 'TOTI', 'ZANDOLI', 'DOFEN', 'PWASON', 'LAMBI', 'KRAB', 'FOUMI', 'LYON', 'JIRAF', 'PANDA', 'KOALA', 'KOLIBRI', 'PELIKAN', 'FLAMAN',
  'SOLEY', 'LALIN', 'ZETWAL', 'LAPLI', 'NWAJ', 'LANME', 'RIVYE', 'FLE', 'PYEBWA', 'FEY', 'KASKAD', 'NEJ', 'ROCH', 'ZILE', 'PLAJ', 'KOKIY',
  'TANBOU', 'GITA', 'FLIT', 'BALON', 'KAP', 'BISIKLET', 'LIV', 'KREYON', 'TABLO', 'BATO', 'AVYON', 'KONPA', 'RARA', 'KANAVAL',
  'BLE', 'JON', 'VET', 'ROZ', 'MOV', 'WOUJ', 'ORANJ',
  'DIRI', 'MAYI', 'BONBON', 'AKASAN', 'JOUMOU', 'PATE', 'KASAV', 'DOUS', 'TABLET', 'FRESKO', 'SITADEL', 'AYITI', 'LAKOU',
];
/** Digits used in codes: no 0 or 1 (they look like O and I). */
export const CODE_DIGITS = '23456789';

/** A new random code. `rand` returns [0, 1). */
export function makeRecoveryCode(rand: () => number): string {
  let d = '';
  for (let i = 0; i < 4; i++) d += CODE_DIGITS.charAt(Math.floor(rand() * CODE_DIGITS.length));
  return CODE_WORDS[Math.floor(rand() * CODE_WORDS.length)] + '-' + d;
}

const ACCENTS: Record<string, string> = { À: 'A', Â: 'A', Ä: 'A', Á: 'A', È: 'E', É: 'E', Ê: 'E', Ë: 'E', Ì: 'I', Î: 'I', Ï: 'I', Í: 'I', Ò: 'O', Ô: 'O', Ö: 'O', Ó: 'O', Ù: 'U', Û: 'U', Ü: 'U', Ú: 'U', Ç: 'C', Ñ: 'N' };
/**
 * What the kid typed → canonical "WORD-1234", or null if it can't be a code. Forgiving: any case, accents,
 * spaces or no dash, and 0/1 typed inside the word read as O/I.
 */
export function normalizeRecoveryCode(input: string): string | null {
  let s = String(input || '').toUpperCase();
  let out = '';
  for (let i = 0; i < s.length; i++) { const c = s.charAt(i); out += ACCENTS[c] || c; }
  s = out.replace(/[^A-Z0-9]/g, '');
  const m = /^([A-Z01]{2,12})([0-9]{4})$/.exec(s);
  if (!m) return null;
  const word = m[1].replace(/0/g, 'O').replace(/1/g, 'I');
  if (!/[A-Z]/.test(word)) return null;
  return word + '-' + m[2];
}
