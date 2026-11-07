# Konesans server API (Nakama)

All calls are Nakama RPCs: `POST {BASE}/v2/rpc/{id}` with a JSON **string** body (Nakama wraps payloads: send `JSON.stringify(JSON.stringify(payload))`, or use `?unwrap` to send the raw JSON object).
We always use `?unwrap`, so the body is the plain JSON payload and the response body is the plain JSON result.

- `BASE` = `https://api.<server>` (Caddy proxies to Nakama :7350).
- Errors: HTTP 4xx/5xx with `{ "code": number, "message": string, "error": object }`. Show `message` (validation problems are joined with " · "). 401 = session expired → refresh; 403 = not an admin.

## Authentication

### Admin login
`POST {BASE}/v2/account/authenticate/email?create=false`
Header: `Authorization: Basic base64(SERVER_KEY + ":")`
Body: `{ "email": "...", "password": "..." }` → `{ "token": "...", "refresh_token": "..." }`.
Then every admin RPC uses `Authorization: Bearer <token>`.
Refresh: `POST {BASE}/v2/account/session/refresh` (Basic server key) body `{ "token": refresh_token }`.
Tokens expire after 2 h; refresh tokens after 30 days.

`SERVER_KEY` is public-ish (it only allows creating/logging in sessions). Admin power comes from the account's email being in the server's admin list (`KONESANS_ADMINS` env). Non-admins get `403 permission denied` on every `admin_*` RPC.

### App (kids' devices) public content
No login needed; the app sends the runtime HTTP key (read-only content):
`POST {BASE}/v2/rpc/content_manifest?http_key=HTTP_KEY&unwrap` body `{}`
`POST {BASE}/v2/rpc/content_pack?http_key=HTTP_KEY&unwrap` body `{ "category": "istwa" }`

## Data shapes

```ts
type Lang2 = { ht: string; fr: string };
interface AdminQuestion {          // compact shape, same as content/bank/*.json
  id: string; category: string; d: 1|2|3; ages: ('6-8'|'9-11'|'12-14')[];
  ht: string; fr: string; opts: string[]; optsFr: string[]; a: number;
  ex: string; exFr: string; topic?: string; note?: string;
  status: 'review'|'approved'|'draft';
  updatedAt?: string; updatedBy?: string;   // set by server
}
interface Category {
  id: string;            // 'istwa' (lowercase, a-z0-9-)
  name: Lang2;           // { ht: 'Istwa', fr: 'Histoire' }
  icon: string;          // icon name from the app's icon set, e.g. 'istwa'
  color: string;         // '#1F47B5'
  order: number;
  enabled: boolean;      // hidden in the app when false
  isNew: boolean;        // shows the "Nouvo" badge
  ages: ('6-8'|'9-11'|'12-14')[];
}
interface AppConfig {
  announcement: { on: boolean; ht: string; fr: string; color: 'blue'|'yellow'|'red'|'green' };
  maintenance: { on: boolean; ht: string; fr: string };
  features: { duels: boolean; courses: boolean; coding: boolean; math: boolean; peyi: boolean };
  serveReview: boolean;  // also serve questions still waiting for proofreading
  dailyCount: number;    // questions in the daily challenge (5..20)
  minAppVersion: string; // '1.0.0'
}
interface Manifest {
  version: number;               // increments on every publish
  publishedAt: string;
  config: AppConfig;
  categories: Category[];
  strings: Record<string, [string, string]>; // UI text overrides: key -> [ht, fr]
  packs: { category: string; count: number; hash: string }[];
}
```

## Public RPCs (http_key)
| id | body | result |
|---|---|---|
| `content_manifest` | – | `Manifest` (the last *published* one; `{version:0}` before the first publish) |
| `content_pack` | `{category}` | `{ category, version, questions: Question[] }` (app `Question` shape, already filtered to approved (+review if `serveReview`)) |

## Admin RPCs (Bearer token, admin only)
| id | body | result |
|---|---|---|
| `admin_me` | – | `{ email, userId, admins: string[] }` |
| `admin_stats` | – | `{ questions: {total, review, approved, draft, byCategory: Record<cat,{total,review,approved,draft}>}, players: {total, last7d}, reports: {open}, requests: {pending}, published: {version, publishedAt}, draftChanges: number }` |
| `admin_questions` | `{category}` | `{ questions: AdminQuestion[] }` (all statuses) |
| `admin_question_save` | `{question: AdminQuestion}` | `{ question }` (validated; new id allowed) |
| `admin_question_delete` | `{id}` | `{ ok: true }` |
| `admin_question_status` | `{ids: string[], status}` | `{ updated: number }` |
| `admin_next_id` | `{category}` | `{ id }` (e.g. `ist-321`) |
| `admin_import` | `{questions: AdminQuestion[], overwrite?: boolean}` | `{ added, updated, skipped }` (max 150 per call: Nakama caps request bodies) |
| `admin_categories` | – | `{ categories: Category[] }` |
| `admin_categories_save` | `{categories: Category[]}` | `{ categories }` |
| `admin_config` | – | `{ config: AppConfig }` |
| `admin_config_save` | `{config: AppConfig}` | `{ config }` |
| `admin_strings` | – | `{ defaults: Record<key,[ht,fr]>, overrides: Record<key,[ht,fr]> }` |
| `admin_strings_save` | `{overrides}` | `{ overrides }` |
| `admin_publish` | – | `{ version, publishedAt, packs }` |
| `admin_reports` | – | `{ reports: {reporterId, targetId, reason, matchId, at, resolved?}[] }` |
| `admin_report_resolve` | `{index}` | `{ ok: true }` |
| `admin_change_password` | `{current, next}` | `{ ok: true }` (next ≥ 8 chars; 403 if current is wrong) |
| `admin_audit` | – | `{ entries: {at, by, action, target}[] }` (last 200) |
| `admin_change_requests_list` | `{status?: 'pending'\|'approved'\|'refused'\|'all'}` | `{ requests: ChangeRequest[], pending: number }` (newest first, max 200; no/unknown status = all) |
| `admin_change_request_resolve` | `{id, approve: boolean, note?}` | `{ request: ChangeRequest }` (400 if already resolved; writes an audit entry `request:approve` / `request:refuse`) |

Edits are live in the admin immediately but reach kids' phones only after **Publish** (`admin_publish`). The app checks the manifest on start and when coming back online.

## Age / class change requests

The kid's age band decides which questions they get and who they meet in online duels, so it never changes freely:
a parent asks in the app (Paramèt → Espas Paran, behind the parent question), an admin approves or refuses ("Demann" in both admin panels), and the phone applies an approved change by itself (it checks on start, when coming back to the app and when Paramèt opens).

```ts
type Grade = 'af1'|'af2'|'af3'|'af4'|'af5'|'af6'|'af7'|'af8'|'af9'|'none'|'other'; // 1ye–9yèm ane fondamantal, pa lekòl, lòt
interface ChangeRequest {
  id: string;                 // uuid
  userId: string;             // the phone's anonymous device account (admin only)
  username: string;           // kid's game name (admin only)
  current: { age: Age | null; grade: Grade | null };
  requested: { age?: Age; grade?: Grade };   // only what changes
  reason: string;             // ≤ 140 chars, one line
  status: 'pending' | 'approved' | 'refused';
  createdAt: string; resolvedAt?: string;
  resolvedBy?: string;        // admin email (admin only)
  note?: string;              // admin's note for the parent, ≤ 140 chars
}
```

Kid RPCs use the phone's device session (`POST /v2/account/authenticate/device?create=true` with the server key, then `Bearer`):

| id | body | result |
|---|---|---|
| `change_request_submit` | `{age?, grade?, reason?, current: {age, grade}, name?}` | `{ request }` (kid view: no `userId`, `username`, `resolvedBy`) |
| `change_request_status` | – | `{ request \| null }` (this phone's latest request) |

Errors from `change_request_submit`: 400 `bad age band` / `bad grade` / `nothing_to_change`; 409 `pending_exists` (one pending request per phone); 429 `rate_limited` (3 requests per phone per 24 h).
On approval the server also updates the kid's `settings/kid` storage object (`age`, `grade`; the age `online_set` stores for duel matching). Requests are stored as `change_req/<id>` objects of the system user.

## Accounts: cloud save + recovery code

No sign-up. Each phone has an anonymous device account; its progress is saved on the server so a new phone can get it back
with a short **recovery code** (`MANGO-4821`: a kid-friendly Kreyòl word + 4 digits from 2–9, unique per account, made
on the first sync) or, once configured, a linked Google account (see `docs/GOOGLE-SIGNIN.md`).
Server: `server/nakama/src/account.ts`; app: `apps/mobile/src/lib/cloud.ts`; merge rules: `packages/core/src/sync/save.ts`
(tests: `packages/core/test/save.test.ts`); end-to-end: `server/test/account-smoke.mjs`.

A save is split in **parts** (`profile, progress, courses, stats, missions, settings, kidSettings, coding, extra, cards,
vwayaj, prefs`), each `{ at, data }` where `at` = when that part last changed on a phone (ms; the server clamps it to its own
clock). Downloaded content is never saved. Merge, per part: the newest part wins, but earned things never go down — XP,
stats counters, coding stars, course lessons (best stars/score), Vwayaj departments/best: max; trophies, hero cards,
unlocked avatar items, full mission days, legend weeks, events played: union. Coins, streak (later day), review list,
profile and settings: newest.

```ts
interface CloudSave { v: 1; profileId: string; updatedAt: number; parts: { [part: string]: { at: number; data: object } } }
```

Kid RPCs (device session, `Bearer`):

| id | body | result |
|---|---|---|
| `save_put` | `{ profileId, parts: {<part>: {at, data}}, have?: {<part>: at}, force? }` — only changed parts | `{ ok, updatedAt, code, pull: {<part>: {at, data}} }` — `pull`: parts where the server knows more (merged data that differs from what was sent, or a stored part newer than `have[part]`) |
| | same, but the account holds another `profileId` and no `force` | `{ conflict: true, profileId, updatedAt, code }` — nothing written; the phone should take the save (`save_get`) |
| `save_get` | – | `{ save: CloudSave \| null, code }` |
| `account_info` | – | `{ code, google: boolean, hasSave, updatedAt }` (makes the code on first call) |
| `account_recover` | `{ code, preview: true }` | `{ preview: { username, avatar, xp, cards, badges, lessons, updatedAt } \| null, hasSave }` — nothing changes |
| `account_recover` | `{ code, deviceId }` (a fresh `kns-` + 32 hex id made by the new phone) | `{ ok, save, code }` — the device id is linked to the code's account; the phone logs in with it from now on |

`force: true` replaces the whole save (the phone was reset, or the kid chose this phone's progress over the code's).
Limits: an upload is at most 240 KB (`too_big`, 400; real saves are ~10–60 KB), a stored save 900 KB. The `profile` part
keeps only known fields and a generated username (core `isValidUsername`), so no personal data is stored.
Codes are typed forgivingly (any case, accents, spaces, `0`/`1` inside the word = O/I).
Errors from `account_recover`: 404 `bad_code` (counts as a wrong try), 429 `rate_limited` (5 wrong codes per hour per
phone, 30 per network address, 600 for the whole server), 409 `same_account` (it is this phone's own code),
400 `bad deviceId`. Storage: `cloud/save`, `account/code`, `account/tries` (user); `recovery/<CODE>` (system: the
code index, written with version `*` so codes stay unique), `recovery_ip/<ip>` (system).

Google (optional, `docs/GOOGLE-SIGNIN.md`): plain Nakama endpoints, no RPC. Connect = `POST /v2/account/link/google
{ token: <Google ID token> }` with the kid's device session; new phone = `POST /v2/account/authenticate/google?create=false`
(server key) → session of the kid's account → `POST /v2/account/link/device { id: <new kns- id> }` with that session →
`save_get`. Before hooks refuse tokens whose `aud` is not in the runtime env `GOOGLE_CLIENT_IDS` (`google token not for this
app`, 401; `google_not_configured`, 400 when it is empty); after hooks set the display name back to the kid's generated name
and clear the avatar URL. `account_info.google` says whether a Google account is linked.

## Daily challenge (Defi Jodi a)

Kid device session (`Authorization: Bearer <device session>`), see `server/nakama/src/daily.ts`, shared logic in core `modules/daily.ts`, test `server/test/daily-smoke.mjs`.

- **Day** = calendar day in Haiti (America/Port-au-Prince, with summer time), `YYYY-MM-DD`.
- **Same questions for everyone of an age band that day.** The first `daily_get` of a (day, age) builds the set with core `pickDaily` from the published packs (approved, plus review when the admin serves review; the bundled bank before the first publish), spread over categories, options shuffled, and freezes it in storage (`daily_set/<day>_<age>`), so a publish during the day does not change it. Count = the published `config.dailyCount` (5–20, default 10); the app's title uses the returned `count`.
- **Getting the questions needs no parent permission** (it is content, like packs). **Appearing in the ranking does**: consent record confirmed **and** `settings/kid.randomDuelsAllowed` (both written by `online_set`). Without it the kid gets their own score only and an empty top; a kid whose parent switches online play off is removed from the board.
- **One scored attempt per account per day.** The server scores the answers itself against its own key (core `scoreDaily`: 10 pts per right answer + speed + combo); any score the phone sends is ignored. Replays on the phone are practice and are not sent.
- **Anti-cheat basics:** `daily_get` must come first (records `startedAt`); a run shorter than 0.8 s per answered question since then is refused (`too_fast`); per-answer times are clamped to 0.8–15 s for the speed bonus, answers later than the timer count as wrong; only today (or yesterday within 1 h of opening it, for a kid who started just before midnight); the result is written with a storage version check so two simultaneous submits score once. The answer key is sent with the questions (the phone shows right/wrong after each tap), so a modified app could read it — the ranking is a kid's game, not a prize.
- **Ranking:** Nakama leaderboard `daily_<day>_<age>` (authoritative, ranks on), score = `correct × 1000 + points`, subscore favours the faster total time. Boards older than 8 days are deleted. Rows carry the kid-safe display name (`profile_set`) and avatar only.

### `daily_get`
Body `{ "age": "9-11" }` →
```json
{ "day": "2026-11-06", "age": "9-11", "count": 10, "questions": [Question…],
  "result": null | { "correct": 7, "total": 10, "score": 92, "ms": 41000, "perQuestion": [true…], "at": "…", "ranked": true },
  "playedAge": null | "9-11", "allowed": true }
```
`questions` use the app `Question` shape (with `answer`).

### `daily_submit`
Body `{ "day": "2026-11-06", "age": "9-11", "answers": [{ "i": 2, "ms": 3400 }, { "i": null, "ms": 15000 }, …] }` (`i` = chosen option index, `null` = time ran out) →
```json
{ "day": "…", "age": "9-11", "correct": 7, "total": 10, "score": 92, "ms": 41000, "perQuestion": […], "at": "…", "ranked": true,
  "allowed": true, "already": false, "top": [TopRow…], "me": TopRow | null }
```
A second submit returns the first result with `already: true`. Errors: `400 daily_not_started` (no `daily_get` that day), `400 daily_closed`, `400 too_fast`.

### `daily_top`
Body `{ "age": "9-11", "day"?: "2026-11-06" }` → `{ "day", "age", "allowed", "top": TopRow[] (≤ 10), "me": TopRow | null }`, empty when online play is not allowed.
`TopRow = { "rank": 1, "name": "Malfini Ble", "avatar": {…} | null, "correct": 9, "total": 10, "score": 131, "me": false }` — no user ids.
